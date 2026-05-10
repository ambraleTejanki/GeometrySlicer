import type { MeshGeometry } from "../core/types";

export class GpuMesh {
  readonly vao: WebGLVertexArrayObject;
  readonly indexCount: number;
  private positionBuffer: WebGLBuffer;
  private normalBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;

  constructor(private gl: WebGL2RenderingContext, geometry: MeshGeometry) {
    const vao = gl.createVertexArray();
    const pos = gl.createBuffer();
    const normal = gl.createBuffer();
    const index = gl.createBuffer();
    if (!vao || !pos || !normal || !index) throw new Error("Could not allocate GPU mesh");

    this.vao = vao;
    this.positionBuffer = pos;
    this.normalBuffer = normal;
    this.indexBuffer = index;
    this.indexCount = geometry.indices.length;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normal);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.positionBuffer);
    this.gl.deleteBuffer(this.normalBuffer);
    this.gl.deleteBuffer(this.indexBuffer);
  }
}
