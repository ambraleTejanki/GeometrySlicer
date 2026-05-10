# Geometry Slicer

Geometry Slicer is my WebGL2-based 3D mesh cutting assignment. I built it as a small desktop-style editor where I can choose a primitive shape, draw a cut across it with the mouse, and then move the separated pieces.

I used **raw WebGL2**, **TypeScript**, **Vite**, and **glMatrix**. I did not use Three.js, Babylon.js, physics engines, or any external slicing library.

## Approach

I chose the raw WebGL2 path for this assignment. Since the brief allows primitive shapes for raw WebGL/OpenGL submissions, I used generated shapes instead of loading GLTF models.

The current shapes are:

- Cube
- Sphere
- Cylinder
- Torus

The project is bundled with Vite and written in TypeScript.

## Shading

I used a custom Phong-style shader.

The lighting includes:

- Ambient light
- Directional diffuse light
- Specular highlight
- A small rim light so the mesh edges are easier to read
- Double-sided rendering so the inside faces of a cut are visible

I kept the shading simple because the main goal of the assignment is the cutting system, not a full material system.

## Libraries Used

I used **glMatrix** for math.

It handles:

- Vector operations
- Matrix operations
- Camera view and projection matrices
- Raycasting math
- Plane calculations
- Mesh transform calculations

glMatrix is installed through npm, so there is no separate `.js` file for it.

```ts
import { mat4, vec3 } from "gl-matrix";
```

## Running The Project

Install dependencies:

```bash
npm install
```

Start the local server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Controls

- Click **Start** to open the editor.
- In **Navigate** mode:
  - Left mouse drag rotates the camera.
  - Right mouse drag pans the camera.
  - Mouse wheel zooms in and out.
- In **Cut** mode:
  - Drag across the mesh to preview the cut.
  - Release the mouse to apply the cut.
- After cutting:
  - Click and drag a piece to move it.
- Use the shape dropdown to switch between shapes.
- Press `C` to switch between Navigate and Cut mode.
- Press `Escape` to cancel the current cut state.

## How The Cutting Works

The cutting system is written as a generic mesh operation. It does not have special code for cube, sphere, cylinder, or torus. As long as a mesh has positions, normals, and indices, the cutter can work with it.

### Creating The Cutting Plane

When I drag the mouse in Cut mode, I convert the start and end mouse positions into world-space rays.

The steps are:

1. Read the mouse position on the screen.
2. Convert it to normalized device coordinates.
3. Use the camera inverse view-projection matrix to create a 3D ray.
4. Build a cutting plane from the camera position and the two drag rays.

This makes the cut follow the direction of the mouse stroke in the viewport.

### Classifying Vertices

For each triangle, I test its vertices against the cutting plane.

I calculate signed distance like this:

```text
distance = dot(planeNormal, vertexPosition) + planeConstant
```

- Positive distance means the vertex is on one side of the plane.
- Negative distance means the vertex is on the other side.
- A very small distance is treated as being on the plane.

Triangles fully on one side are copied to that side. Triangles that cross the plane are clipped.

### Splitting The Mesh

When a triangle crosses the cutting plane, I find where its edges intersect the plane. Then I rebuild the triangle pieces on both sides of the cut.

At the end of this step, one mesh part becomes two mesh parts.

### Creating The Caps

A cut leaves an open surface, so I close it with a cap.

For the cap, I:

1. Collect all edge-plane intersection points.
2. Remove duplicate points.
3. Find the center of those points.
4. Sort the points around the center.
5. Create a triangle fan from the center.
6. Recalculate normals so the cap is lit correctly.

This makes the cut face visible instead of leaving the mesh hollow.

## Code Structure

I split the project into small systems so each file has a clear job.

### `App`

This connects the UI with the engine code. It creates the renderer, camera, cut manager, shape switcher, and render loop.

### `Renderer`

This owns the WebGL2 work:

- Shaders
- Buffers
- Grid drawing
- Mesh drawing
- Cut preview drawing

The renderer only draws mesh parts. It does not know how the mesh was cut.

### `OrbitCamera`

This handles orbit, pan, zoom, and camera matrices.

It also creates the inverse view-projection matrix, which is needed for raycasting from the mouse.

### `PointerController`

This turns pointer input into actions.

It handles:

- Orbiting and panning
- Starting a cut gesture
- Updating the cut preview
- Dragging sliced parts

### `CutManager`

This is the main class for cut state.

It handles:

- Navigate and Cut mode
- Cut preview data
- Cutting plane creation
- Calling `MeshCutter`
- Replacing the original part with the sliced parts

I kept this separate so the UI does not contain geometry-cutting logic.

### `MeshCutter`

This performs the actual slicing.

It handles:

- Transforming the plane into local mesh space
- Classifying vertices
- Clipping triangles
- Collecting cap points
- Building cap faces
- Recalculating normals
- Returning new mesh parts

## Tradeoffs

I focused on making a working raw WebGL2 version that is easy to understand and review.

The biggest simplification is the cap generation. It works well for the included primitive shapes and normal cuts, but it is not a full CAD-style boolean system.

With more time, I would add:

- More accurate triangle picking
- Stronger cap triangulation for complex cuts
- Support for multiple cut loops
- Undo and redo
- Better part highlighting
- A more flexible drag plane for moving parts

## Scaling

The cutter is generic, so adding more shapes does not require changing the slicing code.

To add more shapes, each shape only needs to output:

```ts
positions: Float32Array
normals: Float32Array
indices: Uint32Array
```

After that, the same renderer, raycasting, cut manager, and mesh cutter can be reused.

If I had to support many more shapes or heavier meshes, I would add:

- A shape registry
- Lazy loading
- Geometry validation before slicing
- Faster picking
- Web Worker slicing for large meshes

## Performance

The most expensive work happens on the CPU when a mesh is sliced.

The main costs are:

- Checking every triangle against the plane
- Clipping triangles that cross the plane
- Building the cap
- Uploading new geometry to the GPU

For this assignment, the mesh sizes are small enough that the cuts feel responsive.

For larger meshes, I would improve this with:

- Bounding checks before slicing
- Spatial partitioning
- Worker-thread slicing
- Better GPU buffer reuse

## Known Issues

- Cap generation is made for simple cut loops. Very complex concave cuts may need a stronger triangulation method.
- Picking uses bounding spheres, so it is fast but not perfectly precise.
- Dragging moves parts across the floor plane only.
- There is no undo or redo yet.
- This raw WebGL2 version uses primitive shapes instead of GLTF models, as allowed by the assignment.
