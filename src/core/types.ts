import { mat4, vec3 } from "gl-matrix";

export type ShapeKind = "cube" | "sphere" | "cylinder" | "torus";
export type AppMode = "navigate" | "cut";

export interface Plane {
  normal: vec3;
  constant: number;
}

export interface Ray {
  origin: vec3;
  direction: vec3;
}

export interface Bounds {
  center: vec3;
  radius: number;
}

export interface MeshGeometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

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
