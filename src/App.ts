import { vec3 } from "gl-matrix";
import type { CameraState, ShapeKind } from "./core/types";
import { createPart } from "./core/geometryUtils";
import { createPrimitive } from "./geometry/primitives";
import { OrbitCamera } from "./input/OrbitCamera";
import { PointerController } from "./input/PointerController";
import { Renderer } from "./render/Renderer";
import { CutManager } from "./slicing/CutManager";

const shapeColors: Record<ShapeKind, vec3> = {
  cube: vec3.fromValues(0.28, 0.56, 0.95),
  sphere: vec3.fromValues(0.18, 0.72, 0.62),
  cylinder: vec3.fromValues(0.92, 0.48, 0.25),
  torus: vec3.fromValues(0.78, 0.5, 0.95),
};

export class App {
  private canvas = document.querySelector<HTMLCanvasElement>("#glCanvas")!;
  private titleScreen = document.querySelector<HTMLElement>("#titleScreen")!;
  private startButton = document.querySelector<HTMLButtonElement>("#startButton")!;
  private hud = document.querySelector<HTMLElement>("#hud")!;
  private help = document.querySelector<HTMLElement>("#help")!;
  private modeLabel = document.querySelector<HTMLElement>("#modeLabel")!;
  private modeButton = document.querySelector<HTMLButtonElement>("#modeButton")!;
  private resetButton = document.querySelector<HTMLButtonElement>("#resetButton")!;
  private shapeSelect = document.querySelector<HTMLSelectElement>("#shapeSelect")!;

  private renderer = new Renderer(this.canvas);
  private camera = new OrbitCamera();
  private cutManager = new CutManager();
  private cameraState!: CameraState;
  private currentShape: ShapeKind = "cube";

  constructor() {
    this.spawnShape(this.currentShape);
    new PointerController(this.canvas, this.camera, this.cutManager, () => this.cameraState, () => this.updateHud());
    this.startButton.addEventListener("click", () => this.start());
    this.modeButton.addEventListener("click", () => {
      this.cutManager.toggleMode();
      this.updateHud();
    });
    this.resetButton.addEventListener("click", () => this.spawnShape(this.currentShape));
    this.shapeSelect.addEventListener("change", () => this.spawnShape(this.shapeSelect.value as ShapeKind));
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "c") {
        this.cutManager.toggleMode();
        this.updateHud();
      }
      if (event.key === "Escape") {
        this.cutManager.cancelCut();
        if (this.cutManager.mode === "cut") this.cutManager.toggleMode();
        this.updateHud();
      }
    });
    requestAnimationFrame(this.frame);
  }

  private start(): void {
    this.titleScreen.classList.add("hidden");
    this.hud.hidden = false;
    this.help.hidden = false;
    this.updateHud();
  }

  private spawnShape(kind: ShapeKind): void {
    this.currentShape = kind;
    const geometry = createPrimitive(kind);
    const part = createPart(1, geometry, shapeColors[kind]);
    this.cutManager.setParts([part]);
    this.renderer.clearMeshCache();
    this.shapeSelect.value = kind;
    this.updateHud();
  }

  private updateHud(): void {
    this.modeLabel.textContent = this.cutManager.mode === "cut" ? "Cut" : "Navigate";
    this.modeButton.textContent = this.cutManager.mode === "cut" ? "Enter Navigate" : "Enter Cut";
    this.canvas.classList.toggle("cutting", this.cutManager.mode === "cut");
  }

  private frame = (): void => {
    const aspect = Math.max(1e-3, this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight));
    this.cameraState = this.camera.state(aspect);
    this.renderer.render(this.cutManager.parts, this.cameraState, this.cutManager.preview);
    requestAnimationFrame(this.frame);
  };
}
