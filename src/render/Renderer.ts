import { mat3, mat4, vec3 } from "gl-matrix";
import type { CameraState, MeshPart } from "../core/types";
import { GpuMesh } from "./GpuMesh";
import { ShaderProgram } from "./ShaderProgram";
import { lineFragment, lineVertex, meshFragment, meshVertex } from "./shaders";

export class Renderer {
  private gl: WebGL2RenderingContext;
  private meshProgram: ShaderProgram;
  private lineProgram: ShaderProgram;
  private meshes = new Map<number, GpuMesh>();
  private lineVao: WebGLVertexArrayObject;
  private lineBuffer: WebGLBuffer;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true });
    if (!gl) throw new Error("WebGL2 is not available in this browser");
    this.gl = gl;
    this.meshProgram = new ShaderProgram(gl, meshVertex, meshFragment);
    this.lineProgram = new ShaderProgram(gl, lineVertex, lineFragment);
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error("Could not create line buffers");
    this.lineVao = vao;
    this.lineBuffer = buffer;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  render(parts: MeshPart[], camera: CameraState, preview: { start: vec3; end: vec3 } | null): void {
    this.resize();
    const gl = this.gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.045, 0.061, 0.085, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.drawGrid(camera);
    for (const part of parts) this.drawPart(part, camera);
    if (preview) this.drawPreview(camera, preview.start, preview.end);
  }

  private drawPart(part: MeshPart, camera: CameraState): void {
    const gl = this.gl;
    gl.disable(gl.CULL_FACE);
    let gpu = this.meshes.get(part.id);
    if (!gpu) {
      gpu = new GpuMesh(gl, part.geometry);
      this.meshes.set(part.id, gpu);
    }

    const normalMatrix = mat3.normalFromMat4(mat3.create(), part.modelMatrix) ?? mat3.create();
    this.meshProgram.use();
    gl.uniformMatrix4fv(this.meshProgram.uniform("uModel"), false, part.modelMatrix);
    gl.uniformMatrix4fv(this.meshProgram.uniform("uViewProjection"), false, camera.viewProjection);
    gl.uniformMatrix3fv(this.meshProgram.uniform("uNormalMatrix"), false, normalMatrix);
    gl.uniform3fv(this.meshProgram.uniform("uColor"), part.color);
    gl.uniform3fv(this.meshProgram.uniform("uCameraPosition"), camera.position);
    gl.uniform3fv(this.meshProgram.uniform("uLightDirection"), vec3.fromValues(-0.45, -0.8, -0.35));
    gl.uniform1i(this.meshProgram.uniform("uSelected"), part.selected ? 1 : 0);
    gl.bindVertexArray(gpu.vao);
    gl.drawElements(gl.TRIANGLES, gpu.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }

  private drawGrid(camera: CameraState): void {
    const lines: number[] = [];
    const size = 12;
    for (let i = -size; i <= size; i++) {
      lines.push(-size, -1.02, i, size, -1.02, i, i, -1.02, -size, i, -1.02, size);
    }
    this.drawLines(camera, new Float32Array(lines), vec3.fromValues(0.34, 0.43, 0.55), 0.42);
  }

  private drawPreview(camera: CameraState, start: vec3, end: vec3): void {
    const dir = vec3.subtract(vec3.create(), end, start);
    const up = vec3.fromValues(0, 1, 0);
    const side = vec3.cross(vec3.create(), dir, up);
    if (vec3.length(side) < 1e-4) vec3.set(side, 1, 0, 0);
    vec3.normalize(side, side);
    const a = vec3.scaleAndAdd(vec3.create(), start, side, 2.2);
    const b = vec3.scaleAndAdd(vec3.create(), start, side, -2.2);
    const c = vec3.scaleAndAdd(vec3.create(), end, side, -2.2);
    const d = vec3.scaleAndAdd(vec3.create(), end, side, 2.2);
    const plane = new Float32Array([...a, ...b, ...b, ...c, ...c, ...d, ...d, ...a, ...start, ...end]);
    this.drawLines(camera, plane, vec3.fromValues(0.1, 0.85, 0.78), 0.92);
  }

  private drawLines(camera: CameraState, vertices: Float32Array, color: vec3, alpha: number): void {
    const gl = this.gl;
    this.lineProgram.use();
    gl.uniformMatrix4fv(this.lineProgram.uniform("uViewProjection"), false, camera.viewProjection);
    gl.uniform3fv(this.lineProgram.uniform("uColor"), color);
    gl.uniform1f(this.lineProgram.uniform("uAlpha"), alpha);
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, vertices.length / 3);
    gl.bindVertexArray(null);
  }

  private resize(): void {
    const width = Math.floor(this.canvas.clientWidth * window.devicePixelRatio);
    const height = Math.floor(this.canvas.clientHeight * window.devicePixelRatio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  clearMeshCache(): void {
    for (const mesh of this.meshes.values()) mesh.dispose();
    this.meshes.clear();
  }
}
