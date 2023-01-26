# LSDYNA-wall-edge-contact
JavaScript program for Oasys Primer, a finite element analysis preprocessor for LS-DYNA. This program creates a "foot" on the side of a 2-D component (wall, slab, plate, etc) composed of shell elements. It is intended to use in situations where the user wants to define a contact between the 2-D component and something else, without the need for thick shells or a compromising approximation. For example, this program could be used for the contact connection between slabs and walls where a slab sits on top of a wall (without any bond). This program can be used on a 2-D component with any orientation. Can work on sloped and "horizontally curved" 2-D components. "Horizontally curved" means the normal vector of the 2-D component changes, but the normal vector of the "foot" is constant.
