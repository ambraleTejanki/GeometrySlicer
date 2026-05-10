import { mat4, vec3, vec4 } from "gl-matrix";
import type { CameraState, MeshPart, Ray } from "./types";
import { transformedCenter } from "./geometryUtils";

export function rayFromScreen(x: number, y: number, rect: DOMRect, camera: CameraState): Ray {
  const nx = ((x - rect.left) / rect.width) * 2 - 1;
  const ny = 1 - ((y - rect.top) / rect.height) * 2;
  const near = vec4.fromValues(nx, ny, -1, 1);
  const far = vec4.fromValues(nx, ny, 1, 1);
  vec4.transformMat4(near, near, camera.inverseViewProjection);
  vec4.transformMat4(far, far, camera.inverseViewProjection);
  vec4.scale(near, near, 1 / near[3]);
  vec4.scale(far, far, 1 / far[3]);

  const origin = vec3.fromValues(near[0], near[1], near[2]);
  const direction = vec3.fromValues(far[0] - near[0], far[1] - near[1], far[2] - near[2]);
  vec3.normalize(direction, direction);
  return { origin, direction };
}

export function intersectGround(ray: Ray, y = 0): vec3 | null {
  if (Math.abs(ray.direction[1]) < 1e-5) return null;
  const t = (y - ray.origin[1]) / ray.direction[1];
  if (t < 0) return null;
  return vec3.scaleAndAdd(vec3.create(), ray.origin, ray.direction, t);
}

export function pickPart(parts: MeshPart[], ray: Ray): MeshPart | null {
  let best: MeshPart | null = null;
  let bestT = Infinity;
  for (const part of parts) {
    const center = transformedCenter(part);
    const t = intersectSphere(ray, center, part.bounds.radius * maxScale(part.modelMatrix));
    if (t !== null && t < bestT) {
      bestT = t;
      best = part;
    }
  }
  return best;
}

function intersectSphere(ray: Ray, center: vec3, radius: number): number | null {
  const oc = vec3.subtract(vec3.create(), ray.origin, center);
  const b = vec3.dot(oc, ray.direction);
  const c = vec3.dot(oc, oc) - radius * radius;
  const h = b * b - c;
  if (h < 0) return null;
  const t = -b - Math.sqrt(h);
  return t >= 0 ? t : null;
}

function maxScale(m: mat4): number {
  const sx = Math.hypot(m[0], m[1], m[2]);
  const sy = Math.hypot(m[4], m[5], m[6]);
  const sz = Math.hypot(m[8], m[9], m[10]);
  return Math.max(sx, sy, sz);
}
