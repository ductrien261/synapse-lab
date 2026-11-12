# SO-101 robot arm model

3D model (STL meshes) and URDF of the **SO-101** follower arm, used by the
Synapse Lab virtual lab (`/lab/arm`).

- Source: <https://github.com/TheRobotStudio/SO-ARM100> (`Simulation/SO101/`)
- Authors: The Robot Studio and contributors
- Licence: Apache License 2.0 (copy in `LICENSE-Apache-2.0.txt`)

## Changes made

- The STL meshes were decimated (simplified) to about 9,000 triangles each to
  reduce download size. Shapes and positions are otherwise unchanged.
- `so101.urdf` is the upstream `so101_new_calib.urdf`, unmodified.

The files in this directory keep the Apache-2.0 licence. The repository-level
LICENSE does not apply to them.
