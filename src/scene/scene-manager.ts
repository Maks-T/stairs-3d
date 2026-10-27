import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BackgroundType, StairLayoutResult, ViewMode } from '../types/stairs';
import { MaterialsManager } from './materials-manager';
import { FrameBuilder } from './builders/frame-builder';
import { BoardsBuilder } from './builders/boards-builder';
import { FastenersBuilder } from './builders/fasteners-builder';

export class SceneManager {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene: THREE.Scene;
  private readonly controls: OrbitControls;
  private readonly materials: MaterialsManager;
  private readonly container: HTMLElement;

  private frameGroup: THREE.Group | null = null;
  private boardsGroup: THREE.Group | null = null;
  private fastenersGroup: THREE.Group | null = null;

  constructor(container: HTMLElement, onMaterialsReady?: () => void) {
    this.container = container;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, 1, 10, 30000);
    this.camera.position.set(1600, 1200, 2400);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 10000;
    this.controls.minDistance = 200;

    this.initLights();
    this.setBackground('white');

    this.materials = new MaterialsManager(onMaterialsReady);
    this.handleResize();

    this.startAnimationLoop();
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(2000, 3500, 2500);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-2000, 1500, 1500);
    this.scene.add(fill);

    const back = new THREE.DirectionalLight(0xffffff, 0.3);
    back.position.set(-1500, 1000, -2000);
    this.scene.add(back);
  }

  setBackground(name: BackgroundType): void {
    if (name === 'no') {
      this.scene.background = null;
    } else if (name === 'white') {
      this.scene.background = new THREE.Color(0xf4f5f7);
    } else {
      const loader = new THREE.CubeTextureLoader();
      loader.setPath(`./textures/cube/${name}/`);
      this.scene.background = loader.load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
    }
  }

  renderStairs(layout: StairLayoutResult, viewMode: ViewMode, atlasIndex: number, showFasteners: boolean): void {
    if (this.frameGroup) {
      this.scene.remove(this.frameGroup);
      this.frameGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
    }
    if (this.boardsGroup) {
      this.scene.remove(this.boardsGroup);
      this.boardsGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
    }
    if (this.fastenersGroup) {
      this.scene.remove(this.fastenersGroup);
      this.fastenersGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
    }

    this.frameGroup = FrameBuilder.build(layout, this.materials);
    this.boardsGroup = BoardsBuilder.build(layout, this.materials, viewMode, atlasIndex);
    this.fastenersGroup = FastenersBuilder.build(layout.fastenerPoints, showFasteners);

    this.scene.add(this.frameGroup);
    this.scene.add(this.boardsGroup);
    this.scene.add(this.fastenersGroup);

    this.controls.target.set(0, layout.totalHeight / 2, layout.totalDepth / 2);
  }

  public handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private startAnimationLoop(): void {
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
}