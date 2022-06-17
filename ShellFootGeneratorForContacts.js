/* JavaScript: "Foot" Generator for Contact with edges of shell elements
Author: Chad Fusco
Version: 3.0

DESCRIPTION
This script creates a "foot" on the side of a 2-D component (wall, slab, plate, etc) composed of shell elements. It is intended to use in situations where the user wants to define a contact between the 2-D component and something else, without the need for thick shells or a compromising approximation. For example, this script can be used for the contact connection between slabs and walls where the slab sits on top of the wall (without any bond). This script can be used on a 2-D component with any orientation. Can work on sloped and "horizontally curved" 2-D components. "Horizontally curved" means the normal vector of the 2-D component changes, but the normal vector of the "foot" is constant.

LIMITATIONS AND ASSUMPTIONS
Does not work with 8-noded shells.
Script assumes that all nodes on 2-D component (wall) are already merged.
Script assumes that a part for the "foot" is already created - the user will be prompted for it.
*/

Message("Starting 'Foot' Javascript...");


// Select a model. Model selected automatically if only one present.
var m = Model.Select("Select a model:"); 
if(m == null) Exit();

// User selects shells and those shells are flagged.
bShellSet = AllocateFlag();
Shell.Select(bShellSet, 'Select all edge shells', m, false);

// User picks two nodes on edge shells where wall foot is to be created
bNodeSet = AllocateFlag();
Node.Select(bNodeSet, 'Pick two nodes on edge', m, false);

// Get coordinates of two selected nodes. Create edge vector.
EdgeNodes = Node.GetFlagged(m, bNodeSet);
if(EdgeNodes.length < 2)
{
	Window.Error("ERROR!","Must Pick at least two edge nodes");
        Exit();
}
var edgeVec = [];
EdgeNode1 = EdgeNodes[0];
EdgeNode2 = EdgeNodes[1];
edgeVec[0] = EdgeNode2.x - EdgeNode1.x;
edgeVec[1] = EdgeNode2.y - EdgeNode1.y;
edgeVec[2] = EdgeNode2.z - EdgeNode1.z;
Message("edgeVec: " + edgeVec);

// Cycle through all shells to pick out one shell. Get shell thickness.
var allShells = Shell.GetAll(m);
var n = 0;
var i = 0;
var node;
var thick = 0;
while (n<1)
{
	if(allShells[i].Flagged(bShellSet))
	{
		var aShell = allShells[i];
		var aShellID = aShell.pid;
		var aPart = Part.GetFromID(m, aShellID);
		if(aPart.composite)
		{
			for (var k=0; k<aPart.nip ; k++)
			{
				thick += aPart.GetCompositeData(k)[1];
			}
		}
		else
		{
			var aSectionID = aPart.secid;
			var aSection = Section.GetFromID(m, aSectionID);
			thick = aSection.t1;
		}
		var halfThk = thick/2;
		n++;
	}
	i++;
}

// User enters desired foot width (optional). The number of foots perpendicular to the wall is calculated.
var footWidth = Window.GetNumber("'Foot' Width", "Enter width of each individual foot shell. Leaving as zero will create one foot each side.", 0);
if (footWidth == 0)
{
	var footNum = 2;
	footWidth = halfThk;
}
else
{
	var footNum = Math.round(halfThk/footWidth) * 2; // Ensures there isn't an odd number of foots.
	footWidth = thick / footNum;
}
Message(footNum);

// User selects part for the "foot".
bPartSet = AllocateFlag();
Part.Select(bPartSet, 'Select part for the "foot"', m, false);
var footPart = Part.GetFlagged(m, bPartSet);

// CYCLE THROUGH ALL THE FLAGGED SHELLS. Create wall foots and NRBs.
len = allShells.length;
var LclNodes = new Object; // To contain nodes
var aArm = new Object; // To contain nodes
var bArm = new Object; // To contain nodes
var nid = 0;
var minEdgeLen = 1;
var nax, nay, naz, nbx, nby, nbz, nx, ny, nz, s1, nsid, nrbpid, normalVec, footNormalVec, c;
NRBNodeFlag = AllocateFlag(); // Flags nodes that are part of NRBs as the NRBs are created (see code further on).
WallFootFlag = AllocateFlag();  // Flags all nodes on original shells and created "foot" shells to allow for node merging later on.
i = 0;
while(i<len)
{
	if (allShells[i].Flagged(bShellSet))
	{
		normalVec = allShells[i].NormalVector();  // Creates shell normal vector
		if (footNormalVec == null)
		{
			footNormalVec = CrossProduct(edgeVec, normalVec);  // Create vector normal to the future "foot" plane.
			footNormalVec = vec_norm(footNormalVec);  // Normalizes "foot" normal vector.
		}
		n = 0;
		// On the particular wall shell, check to see which of the shell nodes are on the foot plane. Call these nodes "LclNodes"
		if(edgeCheck(allShells[i].n1))
		{
			LclNodes[n] = Node.GetFromID(m, allShells[i].n1);
			n++;
		}
		if(edgeCheck(allShells[i].n2))
		{
			LclNodes[n] = Node.GetFromID(m, allShells[i].n2);
			n++;
		}
		if(edgeCheck(allShells[i].n3))
		{
			LclNodes[n] = Node.GetFromID(m, allShells[i].n3);
			n++;
		}
		if(edgeCheck(allShells[i].n4))
		{
			LclNodes[n] = Node.GetFromID(m, allShells[i].n4);
			n++;
		}

		// Build Nodes
		nax = LclNodes[0].x;
		nay = LclNodes[0].y;
		naz = LclNodes[0].z;
		nbx = LclNodes[1].x;
		nby = LclNodes[1].y;
		nbz = LclNodes[1].z;
		nid = Node.Last(m).nid + 1;

		for (var x=0; x <= footNum; x++) // In this for loop, creating nodes in arm "a" (includes node a on wall shell) and arm "b" (includes node b on wall shell). Arms are simply a way of organizing the new nodes to be created.
		{
			if (Math.abs(x * footWidth - halfThk) < 0.000001)
			{
				aArm[x] = LclNodes[0];
				bArm[x] = LclNodes[1];
			}
			else
			{
				c = x * footWidth - halfThk;
				nxaArm = nax + normalVec[0] * c;
				nyaArm = nay + normalVec[1] * c;
				nzaArm = naz + normalVec[2] * c;
				aArm[x] = new Node(m, nid, nxaArm, nyaArm, nzaArm);
				aArm[x].SetFlag(WallFootFlag);
				nid++;
				nxbArm = nbx + normalVec[0] * c;
				nybArm = nby + normalVec[1] * c;
				nzbArm = nbz + normalVec[2] * c;
				bArm[x] = new Node(m, nid, nxbArm, nybArm, nzbArm);
				bArm[x].SetFlag(WallFootFlag);
				nid++;
			}
			if (x == 0 || x == footNum)
			{
				// Save free edge length as minimum if it is the current minimum. Checks only the innermost and outermost foot edges
				minEdgeLen = Math.min(minEdgeLen, Math.sqrt(Math.pow(aArm[x].x-bArm[x].x,2)+Math.pow(aArm[x].y-bArm[x].y,2)+Math.pow(aArm[x].z-bArm[x].z,2)));
			}
		}

		// Build Shells
		eid = Shell.Last(m).eid + 1;
		for (var x=0; x < footNum; x++)
		{
			s1 = new Shell(m, eid, footPart[0].pid, aArm[x].nid, aArm[x+1].nid, bArm[x+1].nid, bArm[x].nid);
			eid++;
		}

		// Build NRBs and required SET_NODEs for the particular wall shell.
		n = 0;
		while (n<2) // while statement cycles through both LclNodes on the particular wall shell.
		{
			if (!(LclNodes[n].Flagged(NRBNodeFlag))) // IF statement checks to see if an NRB has already been created which references this wall node.
			{
				if (Set.Last(m, Set.NODE) == null) nsid = 1; // Checks to see if there's any SET_NODES in the model.
				else nsid = Set.Last(m, Set.NODE).sid + 1;
				nSet1 = new Set(m, nsid, Set.NODE);
				for (var x=0; x <= footNum; x++)
				{
					if (n == 0)
					{
						nSet1.Add(aArm[x].nid); // Adding all the Arm "a" nodes into SET_NODE.
					}
					else
					{
						nSet1.Add(bArm[x].nid); // Adding all the Arm "b" nodes into SET_NODE.
					}
				}
				if (NodalRigidBody.Last(m) == null) nrbpid = 1; // Checks to see if there's any NRBs in the model.
				else nrbpid = NodalRigidBody.Last(m).pid + 1;
				new NodalRigidBody(m, nSet1.sid, nrbpid);
				LclNodes[n].SetFlag(NRBNodeFlag); // This flags the central NRB node so that another NRB isn't created on it.
				LclNodes[n].SetFlag(WallFootFlag);
			}
			n++;
		}
	}
	i++;
}

// Merge all "foot" nodes at computed tolerance
tol = 0.4 * Math.min(minEdgeLen,footWidth);
Message(minEdgeLen);
Message(tol);
Node.Merge(m, WallFootFlag, tol,0,0);






// CrossProduct function
function CrossProduct(a, b, c)
{
    if (c === undefined) c = new Array(3);

    if (a.length < 3 || b.length< 3)
    {
        Window.Error("ERROR!","Arrays too short");
        Exit();
    }    
    c[0] = a[1]*b[2] - b[1]*a[2];
    c[1] = b[0]*a[2] - a[0]*b[2];
    c[2] = a[0]*b[1] - b[0]*a[1];

    return c;
}

// DotProduct function
function DotProduct(a, b)
{
    if (a.length != b.length)
    {
        Window.Error("ERROR!","Arrays different lengths");
        Exit();
    }

    var dp = 0;

    for (var i=0; i<a.length; i++)
    {
        dp += a[i]*b[i];
    }

    return dp;
}

// Vector normalization function
function vec_norm(v)
{
	var mag = Math.sqrt(Math.pow(v[0],2) + Math.pow(v[1],2) + Math.pow(v[2],2));
	var vnorm = [];
	vnorm[0] = v[0]/mag;
	vnorm[1] = v[1]/mag;
	vnorm[2] = v[2]/mag;
	return vnorm ;
}

// Function to check whether or not node is on the "foot" plane. Returns TRUE or FALSE.
function edgeCheck(nodeID)
{
	node = Node.GetFromID(m, nodeID);
	NodeCoor = [node.x,node.y,node.z];
	w = [NodeCoor[0]-EdgeNode1.x,NodeCoor[1]-EdgeNode1.y,NodeCoor[2]-EdgeNode1.z];
	Dist = Math.abs(DotProduct(w,footNormalVec));
	return Boolean(Dist < 0.000001)
}
