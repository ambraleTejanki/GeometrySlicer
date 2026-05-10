import { vec3 } from "gl-matrix";
import type { AppMode, CameraState, MeshPart, Plane, Ray } from "../core/types";
import { rayFromScreen } from "../core/raycast";
import { MeshCutter } from "./MeshCutter";

export class CutManager {
  mode: AppMode = "navigate";
  parts: MeshPart[] = [];
  preview: { start: vec3; end: vec3; plane: Plane } | null = null;
  private dragStart: Ray | null = null;
  private nextPartId = 1;
  private cutter = new MeshCutter();

  setParts(parts: MeshPart[]): void {
    this.parts = parts;
    this.nextPartId = Math.max(1, ...parts.map((p) => p.id + 1));
    this.preview = null;
  }

  toggleMode(): AppMode {
    this.mode = this.mode === "navigate" ? "cut" : "navigate";
    this.preview = null;
    return this.mode;
  }

  beginCut(x: number, y: number, rect: DOMRect, camera: CameraState): void {
    this.dragStart = rayFromScreen(x, y, rect, camera);
    this.preview = null;
  }

  updateCut(x: number, y: number, rect: DOMRect, camera: CameraState): void {
    if (!this.dragStart) return;
    const current = rayFromScreen(x, y, rect, camera);
    const plane = this.planeFromGesture(this.dragStart, current, camera);
    if (!plane) return;
    this.preview = {
      start: vec3.scaleAndAdd(vec3.create(), this.dragStart.origin, this.dragStart.direction, 5),
      end: vec3.scaleAndAdd(vec3.create(), current.origin, current.direction, 5),
      plane,
    };
  }

  endCut(): void {
    const plane = this.preview?.plane;
    this.dragStart = null;
    this.preview = null;
    if (!plane) return;

    const next: MeshPart[] = [];
    for (const part of this.parts) {
      const pieces = this.cutter.cut(part, plane, () => this.nextPartId++);
      next.push(...pieces);
    }
    this.parts = next;
  }

  cancelCut(): void {
    this.dragStart = null;
    this.preview = null;
  }

  private planeFromGesture(a: Ray, b: Ray, camera: CameraState): Plane | null {
    // The user draws in 2D, but the cut needs a 3D plane. Using the two drag
    // rays plus the camera position makes the plane feel attached to the stroke.
    const normal = vec3.cross(vec3.create(), a.direction, b.direction);
    if (vec3.length(normal) < 1e-4) return null;
    vec3.normalize(normal, normal);
    if (vec3.dot(normal, camera.position) < 0) vec3.negate(normal, normal);
    return { normal, constant: -vec3.dot(normal, camera.position) };
  }
}
