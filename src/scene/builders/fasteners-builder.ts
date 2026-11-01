import * as THREE from 'three';
import { FASTENERS_GEOMETRY_CONFIG as G } from '@/constants/stairs-config';
import type { FastenerPoint } from '@/types/stairs';

const LATHE_SEGMENTS = 16;
const DOME_STEPS = 6;
/** Головка чуть выступает над доской, чтобы читаться на любой текстуре */
const HEAD_LIFT_MM = 0.4;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Саморез вдоль оси Y: стержень с острием уходит вниз (в доску), полукруглая головка над плоскостью Y = 0.
 */
function createScrewGeometry(shaftLength: number, shaftRadius: number, headRadius: number, headHeight: number): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0, -shaftLength),
    new THREE.Vector2(shaftRadius * 0.5, -shaftLength + G.TIP_LENGTH_MM * 0.5),
    new THREE.Vector2(shaftRadius, -shaftLength + G.TIP_LENGTH_MM),
    new THREE.Vector2(shaftRadius, 0),
    new THREE.Vector2(headRadius, 0)
  ];
  for (let i = 1; i <= DOME_STEPS; i++) {
    const a = (i / DOME_STEPS) * (Math.PI / 2);
    profile.push(new THREE.Vector2(headRadius * Math.cos(a), headHeight * Math.sin(a)));
  }
  const geometry = new THREE.LatheGeometry(profile, LATHE_SEGMENTS);
  geometry.computeVertexNormals();
  return geometry;
}

function createScrewMaterial(): THREE.MeshStandardMaterial {
  const color = new THREE.Color(G.COLOR);
  return new THREE.MeshStandardMaterial({
    color,
    metalness: G.METALNESS,
    roughness: G.ROUGHNESS,
    // без env-карты металл темнеет: лёгкое свечение держит цвет на тёмных досках
    emissive: color,
    emissiveIntensity: G.EMISSIVE_INTENSITY
  });
}

function createScrewMesh(
  points: FastenerPoint[],
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, points.length);
  mesh.name = name;
  mesh.castShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  points.forEach((p, i) => {
    normal.set(p.normalX, p.normalY, p.normalZ).normalize();
    orientation.setFromUnitVectors(UP, normal);
    position.set(p.x, p.y, p.z).addScaledVector(normal, HEAD_LIFT_MM);
    mesh.setMatrixAt(i, matrix.compose(position, orientation, scale));
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export class FastenersBuilder {
  static build(points: FastenerPoint[], visible: boolean): THREE.Group {
    const group = new THREE.Group();
    group.name = 'fasteners-root';
    group.visible = visible;
    if (points.length === 0) return group;

    const material = createScrewMaterial();

    const treadPoints = points.filter((p) => p.type === 'tread');
    if (treadPoints.length > 0) {
      const geometry = createScrewGeometry(G.TREAD_SHAFT_LENGTH_MM, G.TREAD_SHAFT_RADIUS_MM, G.TREAD_HEAD_RADIUS_MM, G.TREAD_HEAD_HEIGHT_MM);
      group.add(createScrewMesh(treadPoints, geometry, material, 'tread-screws'));
    }

    const boardPoints = points.filter((p) => p.type !== 'tread');
    if (boardPoints.length > 0) {
      const geometry = createScrewGeometry(G.CLADDING_SHAFT_LENGTH_MM, G.CLADDING_SHAFT_RADIUS_MM, G.CLADDING_HEAD_RADIUS_MM, G.CLADDING_HEAD_HEIGHT_MM);
      group.add(createScrewMesh(boardPoints, geometry, material, 'board-screws'));
    }

    return group;
  }
}