# Geometry Slicer

Geometry Slicer is a small desktop-style 3D editing tool made with **raw WebGL2**, **TypeScript**, **Vite**, and **glMatrix**. The user can open the tool, choose a primitive shape, draw a cut across the mesh, and then move the separated pieces.

This project does not use Three.js, Babylon.js, physics engines, or any external slicing library. The slicing logic is implemented manually in TypeScript.

## Framework / Approach Used

I used **raw WebGL2** as the rendering approach.

Because this version uses raw WebGL2, the demo uses primitive shapes instead of GLTF models. The available shapes are:

- Cube
- Sphere
- Cylinder
- Torus

The project uses **Vite** as the modern build tool and dev server.

## Shading Model

The renderer uses a custom **Phong-style lighting model**.

The shader includes:

- Ambient light
- Directional diffuse light
- Specular highlight
- A small rim light to make the mesh edges easier to see
- Double-sided rendering so the inside faces after a cut are visible

This keeps the visual style clear and useful for a 3D editing tool while staying fully inside raw WebGL2.

## Third-Party Libraries

The only runtime math library used is:

- **glMatrix**

glMatrix is used for:

- Vector math
- Matrix math
- Camera view and projection matrices
- Inverse view-projection matrix for raycasting
- Plane calculations
- Mesh transform calculations

It is installed through npm, so no separate `.js` file is needed.

```ts
import { mat4, vec3 } from "gl-matrix";
```

## How To Run

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Controls

- Click **Start** to enter the tool.
- In **Navigate** mode:
  - Left mouse drag rotates the camera.
  - Right mouse drag pans the camera.
  - Mouse wheel zooms in and out.
- In **Cut** mode:
  - Drag across the mesh to create a cut preview.
  - Release the mouse to cut the mesh.
- After cutting:
  - Click and drag a piece to move it.
- Use the shape dropdown to switch between cube, sphere, cylinder, and torus.
- Press `C` to switch between Navigate and Cut mode.
- Press `Escape` to cancel cut mode.

## Geometry Slicing Approach

The slicing system is built around a generic mesh cutter. It does not contain special logic for cube, sphere, cylinder, or torus. Any mesh that provides positions, normals, and indices can be passed into the cutter.

### 1. How The Cutting Plane Is Derived

When the user drags the mouse in Cut mode, the start and end mouse positions are converted into 3D rays.

This is done by:

1. Reading the mouse position in screen space.
2. Converting it to normalized device coordinates.
3. Using the camera inverse view-projection matrix to create a world-space ray.
4. Creating a plane from the camera position and the two drag rays.

This makes the cut feel like it follows the user's 2D drag gesture across the 3D object.

### 2. How Vertices Are Classified

Each triangle is tested against the cutting plane.

For every vertex, the cutter calculates signed distance:

```text
distance = dot(planeNormal, vertexPosition) + planeConstant
```

- If the distance is positive, the vertex is on one side of the plane.
- If the distance is negative, the vertex is on the other side.
- If the distance is close to zero, the vertex is treated as being on the plane.

Triangles that are fully on one side are copied to that side. Triangles that cross the plane are clipped.

### 3. How The Mesh Is Split

For triangles that cross the plane, the cutter finds the intersection points along triangle edges.

The triangle is then clipped into new polygons for both sides of the cut. Those polygons are triangulated and stored as new geometry.

After this step, the original mesh becomes two separate mesh parts.

### 4. How Caps Are Generated

Cutting a mesh creates an open hole along the cut surface. To close that hole, the cutter collects all edge-plane intersection points.

The cap generation process is:

1. Collect intersection points from clipped triangles.
2. Remove duplicate points.
3. Find the center of the points.
4. Sort points around the center.
5. Create triangles from the center to the sorted edge points.
6. Recalculate normals so the new cap is lit correctly.

This creates visible cut faces instead of leaving the mesh hollow.

## System Architecture

The project is separated into small systems so the code is easier to understand and extend.

### `App`

`App` connects the UI with the engine systems. It creates the renderer, camera, cut manager, shape switcher, and animation loop.

It does not perform slicing directly.

### `Renderer`

`Renderer` owns all WebGL2 work:

- Shader creation
- Mesh buffers
- Grid drawing
- Mesh drawing
- Cut preview drawing

The renderer only receives mesh parts and draws them. It does not know how the mesh was cut.

### `OrbitCamera`

`OrbitCamera` handles:

- Orbit
- Pan
- Zoom
- View matrix
- Projection matrix
- Inverse view-projection matrix

The inverse view-projection matrix is important because it is used to turn mouse positions into 3D rays.

### `PointerController`

`PointerController` converts mouse and pointer events into actions.

It decides whether the user is:

- Navigating the scene
- Drawing a cut
- Dragging a sliced mesh part

It forwards cut gestures to `CutManager`.

### `CutManager`

`CutManager` is the central class for slicing behavior.

It handles:

- Current mode: Navigate or Cut
- Cut preview state
- Creating the cutting plane
- Calling `MeshCutter`
- Replacing one mesh part with the new sliced parts

This keeps cutting logic out of the UI and rendering code.

### `MeshCutter`

`MeshCutter` performs the actual geometry operation.

It handles:

- Plane transform into local mesh space
- Vertex classification
- Triangle clipping
- Cap point collection
- Cap triangulation
- Normal recalculation
- Returning new independent mesh parts

This is the main geometry system in the project.

## Tradeoffs

This project focuses on a working and understandable raw WebGL2 implementation.

The main simplification is cap generation. It works well for the included primitive shapes and simple cuts, but it is not a full CAD-grade mesh boolean system.

If I had more time, I would improve:

- Exact triangle-based picking instead of bounding-sphere picking
- More robust cap generation for complex concave cuts
- Support for multiple cap loops
- Better drag planes for moving parts in any camera direction
- Undo and redo
- Visual highlighting of the piece under the mouse

## Scaling

The cutting system is generic, so adding more shapes does not require changing `MeshCutter`.

To support 20 different shapes, each shape only needs to produce the same geometry format:

```ts
positions: Float32Array
normals: Float32Array
indices: Uint32Array
```

After that, the same renderer, raycasting, cut manager, and mesh cutter can work with it.

For a larger version of this tool, I would add:

- A shape/model registry
- Lazy loading for heavier meshes
- Geometry validation before slicing
- A better picking acceleration structure
- Optional worker-thread slicing for large meshes

## Performance Notes

The most expensive part is slicing the mesh on the CPU.

The main performance concerns are:

- Classifying many triangles
- Clipping triangles that cross the plane
- Rebuilding cap geometry
- Re-uploading changed geometry to the GPU

For this assignment, the primitive meshes are kept at a reasonable size, so slicing is responsive.

To improve performance for bigger meshes, I would add:

- Bounding checks before slicing
- Spatial partitioning
- Web Workers for slicing
- More efficient GPU buffer reuse
- Mesh simplification or level-of-detail for very dense models

## Known Issues / Incomplete Areas

- Cap generation is designed for simple cut loops. Very complex concave cuts may need a stronger triangulation method.
- Picking uses bounding spheres, so it is fast but not perfectly precise.
- Dragging moves parts across the floor plane only.
- There is no undo or redo system yet.
- This raw WebGL2 version uses primitive shapes, which matches the assignment rule for raw WebGL/OpenGL submissions.

## Submission Notes

For the GitHub submission:

- Include the full TypeScript source.
- Include `package.json` and `package-lock.json`.
- Do not include `node_modules`.
- Do not include build artifacts like `dist` unless the reviewer specifically asks for them.

For the final assignment submission:

- Push the project to GitHub.
- Deploy it on Vercel or Netlify.
- Record a 2-3 minute screen recording showing:
  - Opening the tool
  - Selecting or spawning a primitive shape
  - Drawing a cut gesture
  - Mesh splitting into independent parts
  - Dragging a sliced part
  - Switching to another shape
  - Repeating the cut
