export const meshVertex = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormalMatrix;

out vec3 vWorldPosition;
out vec3 vNormal;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPosition = world.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uViewProjection * world;
}`;

export const meshFragment = `#version 300 es
precision highp float;

in vec3 vWorldPosition;
in vec3 vNormal;

uniform vec3 uColor;
uniform vec3 uCameraPosition;
uniform vec3 uLightDirection;
uniform bool uSelected;

out vec4 outColor;

void main() {
  vec3 n = normalize(gl_FrontFacing ? vNormal : -vNormal);
  vec3 l = normalize(-uLightDirection);
  vec3 v = normalize(uCameraPosition - vWorldPosition);
  vec3 h = normalize(l + v);
  float ndotl = max(dot(n, l), 0.0);
  float spec = pow(max(dot(n, h), 0.0), 42.0) * 0.34;
  vec3 ambient = uColor * 0.28;
  vec3 diffuse = uColor * ndotl * 0.78;
  vec3 rim = vec3(0.45, 0.68, 0.95) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.18;
  vec3 selected = uSelected ? vec3(0.18, 0.28, 0.42) : vec3(0.0);
  outColor = vec4(ambient + diffuse + spec + rim + selected, 1.0);
}`;

export const lineVertex = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
uniform mat4 uViewProjection;

void main() {
  gl_Position = uViewProjection * vec4(aPosition, 1.0);
}`;

export const lineFragment = `#version 300 es
precision highp float;

uniform vec3 uColor;
uniform float uAlpha;
out vec4 outColor;

void main() {
  outColor = vec4(uColor, uAlpha);
}`;
