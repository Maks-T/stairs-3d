import * as THREE from 'three';
import {
  STEP_NOSE_OVERHANG_MM,
  STEP_NOSE_LIP_HEIGHT_MM,
  STEP_NOSE_RADIUS_MM
} from '@/constants/stairs-config';
import type { BoxElement, StairLayoutResult, ViewMode } from '../../types/stairs';
import type { MaterialsManager } from '../materials-manager';

function applyTreadUVs(
  geom: THREE.BufferGeometry,
  width: number,
  height: number,
  depth: number,
  lipH: number
): void {
  const pos = geom.attributes.position;
  if (!pos) return;

  const uvs = new Float32Array(pos.count * 2);
  const halfW = width / 2;
  const halfD = depth / 2;
  const halfH = height / 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const u = (x + halfW) / width;
    const v = z > halfD - lipH && y < halfH
      ? 1.0 - ((halfH - y) / (height + lipH)) * 0.25
      : (z + halfD) / depth;

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = Math.max(0, Math.min(1, v));
  }

  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

function createTreadGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const halfH = height / 2;
  const halfD = depth / 2;
  const lipH = STEP_NOSE_LIP_HEIGHT_MM;
  const lipD = STEP_NOSE_OVERHANG_MM;
  const r = STEP_NOSE_RADIUS_MM;

  const shape = new THREE.Shape();
  const zBack = -halfD;
  const zFront = halfD;
  const yTop = halfH;
  const yBottom = -halfH;
  const yLip = yBottom - lipH;

  shape.moveTo(zBack, yTop);
  shape.lineTo(zFront - r, yTop);
  shape.quadraticCurveTo(zFront, yTop, zFront, yTop - r);
  shape.lineTo(zFront, yLip + r);
  shape.quadraticCurveTo(zFront, yLip, zFront - r, yLip);
  shape.lineTo(zFront - lipD, yLip);
  shape.lineTo(zFront - lipD, yBottom);
  shape.lineTo(zBack, yBottom);
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: width,
    bevelEnabled: false
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.translate(0, 0, -width / 2);
  geom.rotateY(-Math.PI / 2);
  applyTreadUVs(geom, width, height, depth, lipH);
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

    if (layout.cladding.length > 0) {
      layout.cladding.forEach((box: BoxElement) => {
        const material = materials.getBoardMaterial(atlasIndex, viewMode, box.width, box.depth);
        const geometry = new THREE.BoxGeometry(box.width, box.height, box.depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(box.x, box.y, box.z);
        mesh.castShadow = viewMode === 'solid';
        mesh.name = box.id;
        boardsGroup.add(mesh);
      });
    }

    layout.treads.forEach((box: BoxElement) => {
      const material = materials.getBoardMaterial(atlasIndex, viewMode, box.width, box.depth);
      const geometry = createTreadGeometry(box.width, box.height, box.depth);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(box.x, box.y, box.z);
      mesh.castShadow = viewMode === 'solid';
      mesh.receiveShadow = viewMode === 'solid';
      mesh.name = box.id;
      boardsGroup.add(mesh);
    });

    layout.risers.forEach((box: BoxElement) => {
      const material = materials.getBoardMaterial(atlasIndex, viewMode, box.width, box.height);
      const geometry = new THREE.BoxGeometry(box.width, box.height, box.depth);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(box.x, box.y, box.z);
      mesh.castShadow = viewMode === 'solid';
      mesh.receiveShadow = viewMode === 'solid';
      mesh.name = box.id;
      boardsGroup.add(mesh);
    });

    return boardsGroup;
  }
}