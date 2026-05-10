import { mat3, mat4, vec3, vec4 } from "gl-matrix";
import type { MeshGeometry, MeshPart, Plane } from "../core/types";
import { compactGeometry, createPart } from "../core/geometryUtils";

type V = vec3;

interface ClipResult {
  geometry: MeshGeometry;
  capPoints: V[];
}

export class MeshCutter {
  private epsilon = 1e-5;

  cut(part: MeshPart, worldPlane: Plane, nextId: () => number): MeshPart[] {
    // The cutter works in local mesh space, so moved pieces can still be sliced
    // with the same generic triangle pipeline.
    const plane = this.transformPlaneToLocal(worldPlane, part.modelMatrix);
    const positive = this.clipGeometry(part.geometry, plane, true);
    const negative = this.clipGeometry(part.geometry, plane, false);

    // If the plane only grazed the mesh, keep the original part instead of
    // creating tiny invalid pieces.
    if (positive.geometry.indices.length < 3 || negative.geometry.indices.length < 3) {
      return [part];
    }

    this.addCap(positive, plane, false);
    this.addCap(negative, plane, true);

    const a = createPart(nextId(), positive.geometry, vec3.clone(part.color));
    const b = createPart(nextId(), negative.geometry, vec3.scale(vec3.create(), part.color, 0.82));
    mat4.copy(a.modelMatrix, part.modelMatrix);
    mat4.copy(b.modelMatrix, part.modelMatrix);

    const separation = vec3.scale(vec3.create(), plane.normal, 0.035);
    mat4.translate(a.modelMatrix, a.modelMatrix, separation);
    mat4.translate(b.modelMatrix, b.modelMatrix, vec3.negate(separation, separation));
    return [a, b];
  }

  private transformPlaneToLocal(worldPlane: Plane, model: mat4): Plane {
    const inv = mat4.invert(mat4.create(), model) ?? mat4.create();
    const worldPoint = vec3.scale(vec3.create(), worldPlane.normal, -worldPlane.constant);
    const localPoint4 = vec4.transformMat4(vec4.create(), vec4.fromValues(worldPoint[0], worldPoint[1], worldPoint[2], 1), inv);
    const normalMat = mat3.fromMat4(mat3.create(), model);
    mat3.transpose(normalMat, normalMat);
    const localNormal = vec3.transformMat3(vec3.create(), worldPlane.normal, normalMat);
    vec3.normalize(localNormal, localNormal);
    const localPoint = vec3.fromValues(localPoint4[0], localPoint4[1], localPoint4[2]);
    return { normal: localNormal, constant: -vec3.dot(localNormal, localPoint) };
  }

  private clipGeometry(geometry: MeshGeometry, plane: Plane, keepPositive: boolean): ClipResult {
    const positions: number[] = [];
    const indices: number[] = [];
    const capPoints: V[] = [];
    const source = geometry.positions;

    // Each triangle is clipped independently. Cross-plane edges add points that
    // later become the visible cap surface.
    for (let i = 0; i < geometry.indices.length; i += 3) {
      const tri = [0, 1, 2].map((k) => {
        const idx = geometry.indices[i + k] * 3;
        return vec3.fromValues(source[idx], source[idx + 1], source[idx + 2]);
      });
      const clipped = this.clipPolygon(tri, plane, keepPositive, capPoints);
      if (clipped.length >= 3) {
        const base = positions.length / 3;
        for (const v of clipped) positions.push(v[0], v[1], v[2]);
        for (let k = 1; k < clipped.length - 1; k++) indices.push(base, base + k, base + k + 1);
      }
    }

    return { geometry: compactGeometry(positions, indices), capPoints };
  }

  private clipPolygon(poly: V[], plane: Plane, keepPositive: boolean, capPoints: V[]): V[] {
    const out: V[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const da = this.distance(plane, a);
      const db = this.distance(plane, b);
      const ina = keepPositive ? da >= -this.epsilon : da <= this.epsilon;
      const inb = keepPositive ? db >= -this.epsilon : db <= this.epsilon;

      if (ina && inb) {
        out.push(vec3.clone(b));
      } else if (ina && !inb) {
        const p = this.intersection(a, b, da, db);
        out.push(p);
        capPoints.push(p);
      } else if (!ina && inb) {
        const p = this.intersection(a, b, da, db);
        out.push(p, vec3.clone(b));
        capPoints.push(p);
      }
    }
    return out;
  }

  private addCap(result: ClipResult, plane: Plane, normalMatchesPlane: boolean): void {
    const unique = this.uniquePoints(result.capPoints);
    if (unique.length < 3) return;

    const center = vec3.create();
    for (const p of unique) vec3.add(center, center, p);
    vec3.scale(center, center, 1 / unique.length);

    const normal = normalMatchesPlane ? vec3.clone(plane.normal) : vec3.negate(vec3.create(), plane.normal);
    const tangent = Math.abs(normal[1]) < 0.92 ? vec3.fromValues(0, 1, 0) : vec3.fromValues(1, 0, 0);
    const u = vec3.cross(vec3.create(), tangent, normal);
    vec3.normalize(u, u);
    const v = vec3.cross(vec3.create(), normal, u);
    // Sorting around the cap center gives us a clean triangle fan for the simple
    // primitive meshes used in this raw WebGL2 assignment.
    unique.sort((a, b) => {
      const aa = Math.atan2(vec3.dot(vec3.subtract(vec3.create(), a, center), v), vec3.dot(vec3.subtract(vec3.create(), a, center), u));
      const bb = Math.atan2(vec3.dot(vec3.subtract(vec3.create(), b, center), v), vec3.dot(vec3.subtract(vec3.create(), b, center), u));
      return aa - bb;
    });

    const positions = Array.from(result.geometry.positions);
    const indices = Array.from(result.geometry.indices);
    const centerIndex = positions.length / 3;
    positions.push(center[0], center[1], center[2]);
    const start = positions.length / 3;
    for (const p of unique) positions.push(p[0], p[1], p[2]);
    for (let i = 0; i < unique.length; i++) {
      const a = start + i;
      const b = start + ((i + 1) % unique.length);
      if (normalMatchesPlane) indices.push(centerIndex, b, a);
      else indices.push(centerIndex, a, b);
    }
    result.geometry = compactGeometry(positions, indices);
  }

  private uniquePoints(points: V[]): V[] {
    const unique: V[] = [];
    for (const p of points) {
      if (!unique.some((q) => vec3.distance(p, q) < 1e-4)) unique.push(vec3.clone(p));
    }
    return unique;
  }

  private distance(plane: Plane, p: V): number {
    return vec3.dot(plane.normal, p) + plane.constant;
  }

  private intersection(a: V, b: V, da: number, db: number): V {
    const t = da / (da - db);
    return vec3.lerp(vec3.create(), a, b, Math.min(1, Math.max(0, t)));
  }
}
