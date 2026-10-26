import * as THREE from 'three';
import type { BoxElement, StairLayoutResult } from '../../types/stairs';
import type { MaterialsManager } from '../materials-manager';

export class FrameBuilder {
  static build(layout: StairLayoutResult, materials: MaterialsManager): THREE.Group {
    const frameGroup = new THREE.Group();
    frameGroup.name = 'metal-frame-root';

    const material = materials.getMetalFrameMaterial();

    layout.frameTubes.forEach((box: BoxElement) => {
      const geometry = new THREE.BoxGeometry(box.width, box.height, box.depth);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(box.x, box.y, box.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = box.id;
      frameGroup.add(mesh);
    });

    return frameGroup;
  }
}