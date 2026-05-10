export class ShaderProgram {
  readonly program: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation>();

  constructor(private gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
    const vertex = this.compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error("Could not create shader program");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Shader link failed");
    }
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    this.program = program;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  uniform(name: string): WebGLUniformLocation {
    const cached = this.uniforms.get(name);
    if (cached) return cached;
    const location = this.gl.getUniformLocation(this.program, name);
    if (!location) throw new Error(`Missing uniform ${name}`);
    this.uniforms.set(name, location);
    return location;
  }

  private compile(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("Could not create shader");
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader) ?? "Shader compile failed");
    }
    return shader;
  }
}
