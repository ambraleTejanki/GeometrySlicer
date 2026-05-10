import { mat4, vec3 } from "gl-matrix";
import type { CameraState } from "../core/types";

export class OrbitCamera {
  target = vec3.fromValues(0, 0, 0);
  distance = 6.2;
  yaw = -0.72;
  pitch = 0.55;
  private view = mat4.create();
  private projection = mat4.create();
  private viewProjection = mat4.create();
  private inverseViewProjection = mat4.create();
  private position = vec3.create();

  state(aspect: number): CameraState {
    this.pitch = Math.max(-1.32, Math.min(1.32, this.pitch));
    this.distance = Math.max(2.25, Math.min(18, this.distance));
    const cp = Math.cos(this.pitch);
    vec3.set(
      this.position,
      this.target[0] + this.distance * cp * Math.sin(this.yaw),
      this.target[1] + this.distance * Math.sin(this.pitch),
      this.target[2] + this.distance * cp * Math.cos(this.yaw),
    );
    mat4.lookAt(this.view, this.position, this.target, vec3.fromValues(0, 1, 0));
    mat4.perspective(this.projection, Math.PI / 4, aspect, 0.05, 100);
    mat4.multiply(this.viewProjection, this.projection, this.view);
    mat4.invert(this.inverseViewProjection, this.viewProjection);
    return {
      view: this.view,
      projection: this.projection,
      viewProjection: this.viewProjection,
      inverseViewProjection: this.inverseViewProjection,
      position: this.position,
      target: this.target,
    };
  }

  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.006;
    this.pitch -= dy * 0.006;
  }

  pan(dx: number, dy: number): void {
    const forward = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), this.target, this.position));
    const right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), forward, vec3.fromValues(0, 1, 0)));
    const up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), right, forward));
    const scale = this.distance * 0.0016;
    vec3.scaleAndAdd(this.target, this.target, right, -dx * scale);
    vec3.scaleAndAdd(this.target, this.target, up, dy * scale);
  }

  zoom(delta: number): void {
    this.distance *= 1 + Math.sign(delta) * 0.1;
  }
}
