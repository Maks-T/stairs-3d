import * as THREE from 'three';
import type { BoxElement, StairLayoutResult, ViewMode } from '../../types/stairs';
import type { MaterialsManager } from '../materials-manager';

/**
 * Модульный строитель досок ступеней и подступенков.
 * Управляет режимами отображения (сплошной настил, рентген, полное скрытие).
 */
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

    const showCladding = viewMode !== 'no-cladding';

    // Боковая и задняя зашивка (обшивка)
    if (showCladding) {
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

    // Ступени (проступи ДПК CM 305)
    layout.treads.forEach((box: BoxElement) => {
      const material = materials.getBoardMaterial(atlasIndex, viewMode, box.width, box.depth);
      const geometry = new THREE.BoxGeometry(box.width, box.height, box.depth);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(box.x, box.y, box.z);
      mesh.castShadow = viewMode === 'solid';
      mesh.receiveShadow = viewMode === 'solid';
      mesh.name = box.id;

      // Носик капиноса (свес 20 мм вниз на передней кромке)
      const noseLipHeight = 15;
      const noseLipDepth = 6;
      const noseGeom = new THREE.BoxGeometry(box.width, noseLipHeight, noseLipDepth);
      const noseMesh = new THREE.Mesh(noseGeom, material);
      noseMesh.position.set(0, -(box.height / 2) - (noseLipHeight / 2), (box.depth / 2) - (noseLipDepth / 2));
      mesh.add(noseMesh);

      boardsGroup.add(mesh);
    });

    // Вертикальные подступенки (заборная доска МПК 11 мм)
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