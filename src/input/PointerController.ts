import { vec3 } from "gl-matrix";
import type { CameraState, MeshPart } from "../core/types";
import { intersectGround, pickPart, rayFromScreen } from "../core/raycast";
import { CutManager } from "../slicing/CutManager";
import { OrbitCamera } from "./OrbitCamera";

type HudUpdate = () => void;

export class PointerController {
  private pointerDown = false;
  private lastX = 0;
  private lastY = 0;
  private button = 0;
  private activePart: MeshPart | null = null;
  private dragOffset = vec3.create();

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: OrbitCamera,
    private cutManager: CutManager,
    private getCameraState: () => CameraState,
    private onHudUpdate: HudUpdate,
  ) {
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pointerDown = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.button = event.button;
    this.canvas.setPointerCapture(event.pointerId);

    const rect = this.canvas.getBoundingClientRect();
    const cameraState = this.getCameraState();
    if (this.cutManager.mode === "cut") {
      this.cutManager.beginCut(event.clientX, event.clientY, rect, cameraState);
      this.canvas.classList.add("cutting");
      return;
    }

    const ray = rayFromScreen(event.clientX, event.clientY, rect, cameraState);
    const picked = pickPart(this.cutManager.parts, ray);
    this.cutManager.parts.forEach((p) => (p.selected = p === picked));
    this.activePart = picked;
    if (picked) {
      const hit = intersectGround(ray, 0);
      if (hit) {
        // Keep the initial grab offset so the part does not snap its center to
        // the cursor when dragging begins.
        const translation = vec3.fromValues(picked.modelMatrix[12], picked.modelMatrix[13], picked.modelMatrix[14]);
        vec3.subtract(this.dragOffset, translation, hit);
      }
      this.canvas.classList.add("dragging");
    }
    this.onHudUpdate();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.pointerDown) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    const rect = this.canvas.getBoundingClientRect();
    const cameraState = this.getCameraState();
    if (this.cutManager.mode === "cut") {
      this.cutManager.updateCut(event.clientX, event.clientY, rect, cameraState);
      return;
    }

    if (this.activePart) {
      const ray = rayFromScreen(event.clientX, event.clientY, rect, cameraState);
      const hit = intersectGround(ray, 0);
      if (hit) {
        const target = vec3.add(vec3.create(), hit, this.dragOffset);
        this.activePart.modelMatrix[12] = target[0];
        this.activePart.modelMatrix[13] = target[1];
        this.activePart.modelMatrix[14] = target[2];
      }
      return;
    }

    if (this.button === 2 || event.shiftKey) this.camera.pan(dx, dy);
    else this.camera.orbit(dx, dy);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    try {
      this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released if the window lost focus.
    }
    if (this.cutManager.mode === "cut") this.cutManager.endCut();
    this.activePart = null;
    this.canvas.classList.remove("dragging", "cutting");
    this.onHudUpdate();
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (this.cutManager.mode === "navigate") this.camera.zoom(event.deltaY);
  };
}
