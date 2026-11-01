
import * as THREE from 'three';
import { ATLAS_TEXTURE_PATH, ATLAS_UV_MAP } from '../constants/stairs-config';
import type { ViewMode } from '../types/stairs';

const FRAME_COLOR = 0x6c7078;
const FRAME_ROUGHNESS = 0.6;
const FRAME_METALNESS = 0.1; // без env-карты высокий metalness даёт чёрный цвет
const XRAY_OPACITY = 0.32;
/** Физический размер одной плитки текстуры на доске, мм */
const TEXTURE_TILE_MM = 300;
/** Доля плитки, в которой края перекрёстно растушёвываются, чтобы повтор был бесшовным */
const SEAM_BLEND_RATIO = 0.25;

export class MaterialsManager {
  private readonly atlasImage: HTMLImageElement;
  private readonly croppedTextureCache = new Map<number, THREE.CanvasTexture>();
  private readonly materialCache = new Map<string, THREE.Material>();
  private isAtlasLoaded = false;
  private maxAnisotropy = 1;
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

  /**
   * Делает плитку бесшовной: края перекрёстно растушёвываются (кросс-фейд по обеим осям).
   * Это лучше зеркального повтора: на нём появляется ось симметрии (V-образный «шов» посреди ступени).
   */
  private makeSeamless(src: HTMLCanvasElement): HTMLCanvasElement {
    const w = src.width;
    const h = src.height;
    const fx = Math.max(1, Math.floor(w * SEAM_BLEND_RATIO));
    const fy = Math.max(1, Math.floor(h * SEAM_BLEND_RATIO));
    const tw = w - fx;
    const th = h - fy;
    if (tw < 8 || th < 8) return src;

    const srcCtx = src.getContext('2d');
    if (!srcCtx) return src;
    const data = srcCtx.getImageData(0, 0, w, h).data;

    const out = document.createElement('canvas');
    out.width = tw;
    out.height = th;
    const outCtx = out.getContext('2d');
    if (!outCtx) return src;
    const result = outCtx.createImageData(tw, th);
    const px = result.data;

    for (let y = 0; y < th; y++) {
      const ay = y < fy ? y / fy : 1;
      for (let x = 0; x < tw; x++) {
        const ax = x < fx ? x / fx : 1;
        const i00 = (y * w + x) * 4;
        const i10 = (y * w + x + tw) * 4;
        const i01 = ((y + th) * w + x) * 4;
        const i11 = ((y + th) * w + x + tw) * 4;
        const w00 = ax * ay;
        const w10 = (1 - ax) * ay;
        const w01 = ax * (1 - ay);
        const w11 = (1 - ax) * (1 - ay);
        const o = (y * tw + x) * 4;
        for (let c = 0; c < 3; c++) {
          px[o + c] = (data[i00 + c] ?? 0) * w00 + (data[i10 + c] ?? 0) * w10 +
            (data[i01 + c] ?? 0) * w01 + (data[i11 + c] ?? 0) * w11;
        }
        px[o + 3] = 255;
      }
    }

    outCtx.putImageData(result, 0, 0);
    return out;
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

    const texture = new THREE.CanvasTexture(this.makeSeamless(canvas));
    // UV досок заданы в миллиметрах: одна плитка = TEXTURE_TILE_MM на всех гранях
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / TEXTURE_TILE_MM, 1 / TEXTURE_TILE_MM);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    texture.needsUpdate = true;
    return texture;
  }

  /** Анизотропная фильтрация убирает мыло на ступенях при взгляде под скользящим углом */
  setMaxAnisotropy(value: number): void {
    this.maxAnisotropy = Math.max(1, value);
  }

  private getAtlasTexture(atlasIndex: number): THREE.Texture | null {
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
    return baseTexture;
  }

  getBoardMaterial(atlasIndex: number, viewMode: ViewMode): THREE.Material {
    const key = `board_${atlasIndex}_${viewMode}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached;

    const isXray = viewMode === 'xray';

    const material = new THREE.MeshStandardMaterial({
      color: isXray ? 0x88aacc : 0xffffff,
      roughness: 0.65,
      metalness: 0.05,
      transparent: isXray,
      opacity: isXray ? XRAY_OPACITY : 1.0,
      depthWrite: !isXray,
    });

    const texture = this.getAtlasTexture(atlasIndex);
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


