import type { MeshGeometry, ShapeKind } from "../core/types";
import { compactGeometry, recalculateNormals } from "../core/geometryUtils";

export function createPrimitive(kind: ShapeKind): MeshGeometry {
  if (kind === "cube") return createCube();
  if (kind === "sphere") return createSphere(28, 18);
  if (kind === "cylinder") return createCylinder(36);
  return createTorus(40, 14);
}

function createCube(): MeshGeometry {
  const p = [
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
    1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
    -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
    1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,
    -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
  ];
  const i = [
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
  ];
  return compactGeometry(p, i);
}

function createSphere(segments: number, rings: number): MeshGeometry {
  const p: number[] = [];
  const idx: number[] = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings;
    const phi = v * Math.PI;
    for (let x = 0; x <= segments; x++) {
      const u = x / segments;
      const theta = u * Math.PI * 2;
      p.push(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    }
  }
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * (segments + 1) + x;
      const b = a + segments + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(p), normals: new Float32Array(p), indices: new Uint32Array(idx) };
}

function createCylinder(segments: number): MeshGeometry {
  const p: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    p.push(Math.cos(a), -1, Math.sin(a), Math.cos(a), 1, Math.sin(a));
  }
  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments;
    idx.push(i * 2, n * 2, i * 2 + 1, n * 2, n * 2 + 1, i * 2 + 1);
  }
  const bottom = p.length / 3;
  p.push(0, -1, 0);
  const top = p.length / 3;
  p.push(0, 1, 0);
  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments;
    idx.push(bottom, n * 2, i * 2, top, i * 2 + 1, n * 2 + 1);
  }
  return { positions: new Float32Array(p), normals: recalculateNormals(p, idx), indices: new Uint32Array(idx) };
}

function createTorus(radial: number, tubular: number): MeshGeometry {
  const p: number[] = [];
  const idx: number[] = [];
  const major = 0.72;
  const minor = 0.32;
  for (let r = 0; r <= radial; r++) {
    const u = (r / radial) * Math.PI * 2;
    for (let t = 0; t <= tubular; t++) {
      const v = (t / tubular) * Math.PI * 2;
      const x = (major + minor * Math.cos(v)) * Math.cos(u);
      const y = minor * Math.sin(v);
      const z = (major + minor * Math.cos(v)) * Math.sin(u);
      p.push(x, y, z);
    }
  }
  for (let r = 0; r < radial; r++) {
    for (let t = 0; t < tubular; t++) {
      const a = r * (tubular + 1) + t;
      const b = a + tubular + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(p), normals: recalculateNormals(p, idx), indices: new Uint32Array(idx) };
}
