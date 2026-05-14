// defines data structures/types/interfaces used across the application

import { mat4, vec3 } from "gl-matrix";

export type ShapeKind = "cube" | "sphere" | "cylinder" | "torus"; //4 shape names are allowed
export type AppMode = "navigate" | "cut";

/*
normal = direction perpendicular to plane
constant = distance offset

Used for:
  cutting meshes
  collision detection
  clipping

*/
export interface Plane {
  normal: vec3;
  constant: number;
}

/*
directional vector  and a point of origin
used for :
raycasting (selecting object with mouse)

Formula:
  P(t)=O+tD
  p(t) = point along ray at distance t
  t= distance from origin
  o= origin point
  d= direction vector (normalized)
*/

export interface Ray {
  origin: vec3;
  direction: vec3;
}

// Used for quick part picking
export interface Bounds {
  center: vec3;
  radius: number;
}

export interface MeshGeometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

// Represents a full object in the scene
export interface MeshPart {
  id: number;
  geometry: MeshGeometry;
  color: vec3;
  modelMatrix: mat4;
  bounds: Bounds;
  selected: boolean;
}

export interface CameraState {
  view: mat4;
  projection: mat4;
  viewProjection: mat4;
  inverseViewProjection: mat4;
  position: vec3;
  target: vec3;
}
