
import * as THREE from 'three';
import type { BoxElement, StairLayoutResult } from '@/types/stairs';
import type { MaterialsManager } from '../materials-manager';

function createPrismGeometryFromPolygon(pts: Array<[number, number]>, cx: number, cz: number, h: number): THREE.BufferGeometry {
  const halfH = h / 2;
  const p = pts.map(([x, z]) => [x - cx, z - cz] as [number, number]);
  const n = p.length;

  // Верх/низ/бока строим из несвязанных вершин: у каждой грани своя плоская нормаль,
  // иначе computeVertexNormals сглаживает рёбра и призма выглядит как круглая труба.
  const positions: number[] = [];
  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, outward: THREE.Vector3): void => {
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const flip = normal.dot(outward) < 0;
    const [v1, v2] = flip ? [c, b] : [b, c];
    positions.push(a.x, a.y, a.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
  };
  const v3 = (i: number, y: number): THREE.Vector3 => {
    const pt = p[i] ?? [0, 0];
    return new THREE.Vector3(pt[0], y, pt[1]);
  };

  // верх и низ (веер от вершины 0)
  for (let i = 1; i < n - 1; i++) {
    pushTri(v3(0, halfH), v3(i, halfH), v3(i + 1, halfH), new THREE.Vector3(0, 1, 0));
    pushTri(v3(0, -halfH), v3(i, -halfH), v3(i + 1, -halfH), new THREE.Vector3(0, -1, 0));
  }

  // боковые грани: наружу = от центра призмы к центру грани
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a0 = v3(i, -halfH);
    const a1 = v3(j, -halfH);
    const b0 = v3(i, halfH);
    const b1 = v3(j, halfH);
    const outward = new THREE.Vector3().add(a0).add(a1).multiplyScalar(0.5);
    outward.y = 0;
    pushTri(a0, a1, b1, outward);
    pushTri(a0, b1, b0, outward);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return geom;
}

function createFrameTubeGeometry(box: BoxElement): THREE.BufferGeometry {
  if (box.polygonXZ && box.polygonXZ.length === 4) {
    return createPrismGeometryFromPolygon(box.polygonXZ, box.x, box.z, box.height);
  }
  return new THREE.BoxGeometry(box.width, box.height, box.depth);
}

export class FrameBuilder {
  static build(layout: StairLayoutResult, materials: MaterialsManager): THREE.Group {
    const frameGroup = new THREE.Group();
    frameGroup.name = 'metal-frame-root';

    const material = materials.getMetalFrameMaterial();

    layout.frameTubes.forEach((box: BoxElement) => {
      const geometry = createFrameTubeGeometry(box);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(box.x, box.y, box.z);

      if (box.rotationY !== undefined && box.rotationY !== 0) {
        mesh.rotation.y = box.rotationY;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = box.id;
      frameGroup.add(mesh);
    });

    return frameGroup;
  }
}


