import * as THREE from 'three';
import { ATLAS_TEXTURE_PATH, ATLAS_UV_MAP } from '../constants/stairs-config';
import type { ViewMode } from '../types/stairs';

const FRAME_COLOR = 0x2b2c2f;
const FRAME_ROUGHNESS = 0.45;
const FRAME_METALNESS = 0.65;
const XRAY_OPACITY = 0.32;

export class MaterialsManager {
  private readonly atlasImage: HTMLImageElement;
  private readonly croppedTextureCache = new Map<number, THREE.CanvasTexture>();
  private readonly materialCache = new Map<string, THREE.Material>();
  private isAtlasLoaded = false;
  private onAtlasReadyCallback: (() => void) | null = null;

  constructor(onReady?: () => void) {
    this.onAtlasReadyCallback = onReady ?? null;
    this.atlasImage = new Image();
    this.atlasImage.src = ATLAS_TEXTURE_PATH;
    this.atlasImage.onload = () => {
      this.isAtlasLoaded = true;
      this.croppedTextureCache.clear();
      this.materialCache.clear();
      if (this.onAtlasReadyCallback) {
        this.onAtlasReadyCallback();
      }
    };
  }

  private createCroppedTexture(uv: [number, number, number, number], inset = 0.012): THREE.CanvasTexture | null {
    const width = this.atlasImage.naturalWidth;
    const height = this.atlasImage.naturalHeight;
    if (!width || !height) return null;

    const [u0, v0, u1, v1] = uv;
    const sx = Math.floor((u0 + inset) * width);
    const sy = Math.floor((v0 + inset) * height);
    const sw = Math.floor((u1 - u0 - inset * 2) * width);
    const sh = Math.floor((v1 - v0 - inset * 2) * height);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(this.atlasImage, sx, sy, sw, sh, 0, 0, sw, sh);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  private getAtlasTexture(atlasIndex: number, repeatX: number, repeatY: number): THREE.Texture | null {
    if (!this.isAtlasLoaded) return null;

    let baseTexture = this.croppedTextureCache.get(atlasIndex);
    if (!baseTexture) {
      const item = ATLAS_UV_MAP[atlasIndex];
      if (!item) return null;
      const created = this.createCroppedTexture(item.uv);
      if (!created) return null;
      baseTexture = created;
      this.croppedTextureCache.set(atlasIndex, baseTexture);
    }

    const cloned = baseTexture.clone();
    cloned.wrapS = THREE.MirroredRepeatWrapping;
    cloned.wrapT = THREE.MirroredRepeatWrapping;
    cloned.repeat.set(repeatX, repeatY);
    cloned.needsUpdate = true;
    return cloned;
  }

  getBoardMaterial(atlasIndex: number, viewMode: ViewMode, widthMm: number, depthMm: number): THREE.Material {
    const key = `board_${atlasIndex}_${viewMode}_${Math.round(widthMm)}_${Math.round(depthMm)}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached;

    const isXray = viewMode === 'xray';
    const repeatX = Math.max(1, widthMm / 300);
    const repeatY = Math.max(1, depthMm / 300);

    const material = new THREE.MeshStandardMaterial({
      color: isXray ? 0x88aacc : 0xffffff,
      roughness: 0.65,
      metalness: 0.05,
      transparent: isXray,
      opacity: isXray ? XRAY_OPACITY : 1.0,
      depthWrite: !isXray,
    });

    const texture = this.getAtlasTexture(atlasIndex, repeatX, repeatY);
    if (texture && !isXray) {
      material.map = texture;
    }

    this.materialCache.set(key, material);
    return material;
  }

  getMetalFrameMaterial(): THREE.Material {
    const key = 'metal_frame_default';
    const cached = this.materialCache.get(key);
    if (cached) return cached;

    const material = new THREE.MeshStandardMaterial({
      color: FRAME_COLOR,
      roughness: FRAME_ROUGHNESS,
      metalness: FRAME_METALNESS,
    });

    this.materialCache.set(key, material);
    return material;
  }

  dispose(): void {
    this.materialCache.forEach((mat) => {
      if ('map' in mat && mat.map) (mat.map as THREE.Texture).dispose();
      mat.dispose();
    });
    this.materialCache.clear();
    this.croppedTextureCache.forEach((tex) => tex.dispose());
    this.croppedTextureCache.clear();
  }
}