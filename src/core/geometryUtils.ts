import { mat4, vec3 } from "gl-matrix";
import type { Bounds, MeshGeometry, MeshPart } from "./types";

// helper functions

/*
Calculates bounding sphere , used for culling 
It finds the exact middle of a 3D shape by averaging the coordinates of all its 
vertices. Then, it finds the point furthest away from that center to determine a "radius".
*/
export function computeBounds(geometry: MeshGeometry): Bounds {
  const center = vec3.create();
  const p = geometry.positions;
  const count = p.length / 3;
  for (let i = 0; i < p.length; i += 3) {
    center[0] += p[i];
    center[1] += p[i + 1];
    center[2] += p[i + 2];
  }
  vec3.scale(center, center, 1 / Math.max(1, count));

  let radius = 0;
  const tmp = vec3.create();
  for (let i = 0; i < p.length; i += 3) {
    vec3.set(tmp, p[i], p[i + 1], p[i + 2]);
    radius = Math.max(radius, vec3.distance(center, tmp));
  }
  return { center, radius };
}

// rebuilds normals after slicing or cap generation
export function recalculateNormals(positions: number[], indices: number[]): Float32Array {
  const normals = new Float32Array(positions.length);
  const a = vec3.create();
  const b = vec3.create();
  const c = vec3.create();
  const ab = vec3.create();
  const ac = vec3.create();
  const n = vec3.create();

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    vec3.set(a, positions[ia], positions[ia + 1], positions[ia + 2]);
    vec3.set(b, positions[ib], positions[ib + 1], positions[ib + 2]);
    vec3.set(c, positions[ic], positions[ic + 1], positions[ic + 2]);
    vec3.subtract(ab, b, a);
    vec3.subtract(ac, c, a);
    vec3.cross(n, ab, ac);
    if (vec3.length(n) > 1e-7) vec3.normalize(n, n);
    for (const idx of [ia, ib, ic]) {
      normals[idx] += n[0];
      normals[idx + 1] += n[1];
      normals[idx + 2] += n[2];
    }
  }

  for (let i = 0; i < normals.length; i += 3) {
    vec3.set(n, normals[i], normals[i + 1], normals[i + 2]);
    if (vec3.length(n) > 1e-7) vec3.normalize(n, n);
    normals[i] = n[0];
    normals[i + 1] = n[1];
    normals[i + 2] = n[2];
  }
  return normals;
}

export function createPart(id: number, geometry: MeshGeometry, color: vec3): MeshPart {
  return {
    id,
    geometry,
    color: vec3.clone(color),
    modelMatrix: mat4.create(),
    bounds: computeBounds(geometry),
    selected: false,
  };
}

export function compactGeometry(positions: number[], indices: number[]): MeshGeometry {
  const normals = recalculateNormals(positions, indices);
  return {
    positions: new Float32Array(positions),
    normals,
    indices: new Uint32Array(indices),
  };
}

/*
This function calculates where the center of the object actually is in the world 
right now after it has been moved, rotated, or scaled
local space -> world space
*/
export function transformedCenter(part: MeshPart): vec3 {
  return vec3.transformMat4(vec3.create(), part.bounds.center, part.modelMatrix);
}
