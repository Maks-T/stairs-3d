import * as THREE from 'three';
import { FASTENERS_GEOMETRY_CONFIG } from '@/constants/stairs-config';
import type { FastenerPoint } from '@/types/stairs';

const LATHE_SEGMENTS = 12;
const DEFAULT_UP_VECTOR = new THREE.Vector3(0, 1, 0);

function createScrewGeometry(
  shaftLength: number,
  shaftRadius: number,
  headHeight: number,
  headRadius: number,
  tipLength: number
): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [
    new THREE.Vector2(0, -shaftLength),
    new THREE.Vector2(shaftRadius * 0.4, -shaftLength + tipLength * 0.4),
    new THREE.Vector2(shaftRadius, -shaftLength + tipLength),
    new THREE.Vector2(shaftRadius, 0),
    new THREE.Vector2(headRadius, 0),
    new THREE.Vector2(headRadius, headHeight),
    new THREE.Vector2(0, headHeight)
  ];

  const geometry = new THREE.LatheGeometry(points, LATHE_SEGMENTS);
  geometry.computeVertexNormals();
  return geometry;
}

function createInstancedScrewMesh(
  points: FastenerPoint[],
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string
): THREE.InstancedMesh {
  const count = points.length;
  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.name = name;
  instancedMesh.castShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const targetNormal = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  points.forEach((p: FastenerPoint, index: number) => {
    targetNormal.set(p.normalX, p.normalY, p.normalZ).normalize();
    orientation.setFromUnitVectors(DEFAULT_UP_VECTOR, targetNormal);
    position.set(p.x, p.y, p.z);

    matrix.compose(position, orientation, scale);
    instancedMesh.setMatrixAt(index, matrix);
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  return instancedMesh;
}

export class FastenersBuilder {
  static build(points: FastenerPoint[], visible: boolean): THREE.Group {
    const group = new THREE.Group();
    group.name = 'fasteners-root';
    group.visible = visible;

    if (points.length === 0) {
      return group;
    }

    const material = new THREE.MeshStandardMaterial({
      color: FASTENERS_GEOMETRY_CONFIG.COLOR,
      roughness: FASTENERS_GEOMETRY_CONFIG.ROUGHNESS,
      metalness: FASTENERS_GEOMETRY_CONFIG.METALNESS
    });

    const treadPoints = points.filter((p: FastenerPoint) => p.type === 'tread');
    if (treadPoints.length > 0) {
      const treadGeometry = createScrewGeometry(
        FASTENERS_GEOMETRY_CONFIG.TREAD_SHAFT_LENGTH_MM,
        FASTENERS_GEOMETRY_CONFIG.TREAD_SHAFT_RADIUS_MM,
        FASTENERS_GEOMETRY_CONFIG.TREAD_HEAD_HEIGHT_MM,
        FASTENERS_GEOMETRY_CONFIG.TREAD_HEAD_RADIUS_MM,
        FASTENERS_GEOMETRY_CONFIG.TIP_LENGTH_MM
      );
      group.add(createInstancedScrewMesh(treadPoints, treadGeometry, material, 'tread-screws-mesh'));
    }

    const claddingPoints = points.filter((p: FastenerPoint) => p.type !== 'tread');
    if (claddingPoints.length > 0) {
      const claddingGeometry = createScrewGeometry(
        FASTENERS_GEOMETRY_CONFIG.CLADDING_SHAFT_LENGTH_MM,
        FASTENERS_GEOMETRY_CONFIG.CLADDING_SHAFT_RADIUS_MM,
        FASTENERS_GEOMETRY_CONFIG.CLADDING_HEAD_HEIGHT_MM,
        FASTENERS_GEOMETRY_CONFIG.CLADDING_HEAD_RADIUS_MM,
        FASTENERS_GEOMETRY_CONFIG.TIP_LENGTH_MM
      );
      group.add(createInstancedScrewMesh(claddingPoints, claddingGeometry, material, 'cladding-screws-mesh'));
    }

    return group;
  }
}