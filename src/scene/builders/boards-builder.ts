
import * as THREE from 'three';
import {
  STEP_NOSE_LIP_HEIGHT_MM,
  STEP_NOSE_RADIUS_MM
} from '@/constants/stairs-config';
import type { BoxElement, StairLayoutResult, ViewMode } from '@/types/stairs';
import type { MaterialsManager } from '../materials-manager';

const NOSE_LIP_THICKNESS_MM = 20;
const UV_OFFSET_RANGE_MM = 1800;

/** Смещение текстуры, зависящее от id доски: соседние доски не повторяют один и тот же рисунок */
function textureOffsetMm(id: string): [number, number] {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const a = (hash >>> 0) % UV_OFFSET_RANGE_MM;
  const b = ((hash >>> 8) >>> 0) % UV_OFFSET_RANGE_MM;
  return [a, b];
}

/**
 * UV граней бруса в миллиметрах: рисунок идёт вдоль длинной стороны доски и одного масштаба на всех гранях.
 * Порядок граней BoxGeometry: +x, -x, +y, -y, +z, -z (по 4 вершины).
 */
function applyPhysicalBoxUv(geom: THREE.BoxGeometry, w: number, h: number, d: number, offset: [number, number]): void {
  const uv = geom.getAttribute('uv');
  const faces: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face++) {
    const dims = faces[face] ?? [1, 1];
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[0] + offset[0], uv.getY(i) * dims[1] + offset[1]);
    }
  }
  uv.needsUpdate = true;
}

function createMiterTreadGeometry(
  width: number,
  height: number,
  depth: number,
  cutLeftDeg = 0,
  cutRightDeg = 0,
  offset: [number, number] = [0, 0]
): THREE.BufferGeometry {
  const halfH = height / 2;
  const halfD = depth / 2;
  const halfW = width / 2;
  const lipH = STEP_NOSE_LIP_HEIGHT_MM;
  const r = STEP_NOSE_RADIUS_MM;

  const profilePoints: Array<[number, number]> = [
    [-halfD, halfH],
    [halfD - r, halfH],
    [halfD, halfH - r],
    [halfD, -halfH - lipH + r],
    [halfD - r, -halfH - lipH],
    [halfD - NOSE_LIP_THICKNESS_MM + r, -halfH - lipH],
    [halfD - NOSE_LIP_THICKNESS_MM, -halfH - lipH + r],
    [halfD - NOSE_LIP_THICKNESS_MM, -halfH],
    [-halfD, -halfH]
  ];

  const tanLeft = cutLeftDeg > 0 ? Math.tan((cutLeftDeg * Math.PI) / 180) : 0;
  const tanRight = cutRightDeg > 0 ? Math.tan((cutRightDeg * Math.PI) / 180) : 0;

  const getXLeft = (z: number): number => -halfW + (halfD - z) * tanLeft;
  const getXRight = (z: number): number => halfW - (halfD - z) * tanRight;

  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const n = profilePoints.length;
  let perimeter = 0;
  const cumDist: number[] = [0];
  for (let i = 0; i < n - 1; i++) {
    const p1 = profilePoints[i];
    const p2 = profilePoints[i + 1];
    if (p1 && p2) {
      perimeter += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      cumDist.push(perimeter);
    }
  }

  for (let i = 0; i < n; i++) {
    const pt = profilePoints[i];
    if (!pt) continue;
    const [z, y] = pt;
    // UV в миллиметрах: u вдоль длины ступени, v вдоль профиля (верх, носик, низ)
    const v = (cumDist[i] ?? 0) + offset[1];

    const xL = getXLeft(z);
    vertices.push(xL, y, z);
    uvs.push(xL + halfW + offset[0], v);

    const xR = getXRight(z);
    vertices.push(xR, y, z);
    uvs.push(xR + halfW + offset[0], v);
  }

  for (let i = 0; i < n - 1; i++) {
    const iL = i * 2;
    const iR = i * 2 + 1;
    const nextL = (i + 1) * 2;
    const nextR = (i + 1) * 2 + 1;

    indices.push(iL, nextL, nextR);
    indices.push(iL, nextR, iR);
  }

  const baseBackL = (n - 1) * 2;
  const baseBackR = (n - 1) * 2 + 1;
  indices.push(baseBackL, 0, 1);
  indices.push(baseBackL, 1, baseBackR);

  const cap2D = profilePoints.map(([z, y]) => new THREE.Vector2(z, y));
  const capTris = THREE.ShapeUtils.triangulateShape(cap2D, []);

  const appendCap = (isRight: boolean): void => {
    const startIdx = vertices.length / 3;
    for (let i = 0; i < n; i++) {
      const pt = profilePoints[i];
      if (!pt) continue;
      const [z, y] = pt;
      vertices.push(isRight ? getXRight(z) : getXLeft(z), y, z);
      uvs.push(z + halfD + offset[0], y + halfH + lipH + offset[1]);
    }

    for (let t = 0; t < capTris.length; t++) {
      const tri = capTris[t];
      if (!tri || tri.length < 3) continue;
      const a = tri[0];
      const b = tri[1];
      const c = tri[2];
      if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number') {
        if (isRight) {
          indices.push(startIdx + a, startIdx + c, startIdx + b);
        } else {
          indices.push(startIdx + a, startIdx + b, startIdx + c);
        }
      }
    }
  };

  appendCap(false);
  appendCap(true);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export class BoardsBuilder {
  static build(
    layout: StairLayoutResult,
    materials: MaterialsManager,
    viewMode: ViewMode,
    atlasIndex: number
  ): THREE.Group {
    const boardsGroup = new THREE.Group();
    boardsGroup.name = 'boards-root';

    if (viewMode === 'frame') {
      boardsGroup.visible = false;
      return boardsGroup;
    }

    const material = materials.getBoardMaterial(atlasIndex, viewMode);

    const renderBox = (box: BoxElement): void => {
      const geometry = new THREE.BoxGeometry(box.width, box.height, box.depth);
      applyPhysicalBoxUv(geometry, box.width, box.height, box.depth, textureOffsetMm(box.id));
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(box.x, box.y, box.z);
      if (box.rotationY !== undefined && box.rotationY !== 0) {
        mesh.rotation.y = box.rotationY;
      }
      mesh.castShadow = viewMode === 'solid';
      mesh.name = box.id;
      boardsGroup.add(mesh);
    };

    layout.cladding.forEach((box: BoxElement) => renderBox(box));
    layout.risers.forEach((box: BoxElement) => renderBox(box));

    layout.treads.forEach((box: BoxElement) => {
      const leftCut = box.cutAngleLeftDeg ?? 0;
      const rightCut = box.cutAngleRightDeg ?? 0;
      const geometry = createMiterTreadGeometry(
        box.width,
        box.height,
        box.depth,
        leftCut,
        rightCut,
        textureOffsetMm(box.id)
      );

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(box.x, box.y, box.z);
      if (box.rotationY !== undefined && box.rotationY !== 0) {
        mesh.rotation.y = box.rotationY;
      }
      mesh.castShadow = viewMode === 'solid';
      mesh.receiveShadow = viewMode === 'solid';
      mesh.name = box.id;
      boardsGroup.add(mesh);
    });

    return boardsGroup;
  }
}


