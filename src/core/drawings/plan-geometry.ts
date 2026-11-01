import {
  STEP_TREAD_THICKNESS_MM,
  PROFILE_TUBE_SIZE_MM as T
} from '@/constants/stairs-config';
import type { BoxElement } from '@/types/stairs';


export type Pt = [number, number];

export interface PlanBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Вертикальная стойка каркаса (на бетоне нижние стойки бывают короче сечения трубы) */
export function isPost(tube: BoxElement): boolean {
  return tube.id.startsWith('post') || tube.height > T + 0.5;
}

/** Длина заготовки трубы: у стойки высота, у диагонали длина по оси, у остальных наибольший размер */
export function tubeLengthMm(tube: BoxElement): number {
  if (tube.polygonXZ) return tube.depth;
  if (isPost(tube)) return tube.height;
  return Math.max(tube.width, tube.height, tube.depth);
}

/** Нижняя обвязка на бетоне (только в режиме бетонного основания) */
export function isBaseRail(tube: BoxElement): boolean {
  return tube.id.startsWith('rail-');
}

/** Номер яруса (1 — нижний) по высотной отметке горизонтальной трубы */
export function tierOfBeam(tube: BoxElement, stepHeight: number): number {
  return Math.round((tube.y + T / 2 + STEP_TREAD_THICKNESS_MM) / stepHeight);
}

/** Контур трубы в плане (x, z мировые) */
export function tubeOutline(tube: BoxElement): Pt[] {
  if (tube.polygonXZ && tube.polygonXZ.length === 4) {
    return tube.polygonXZ.map(([x, z]) => [x, z] as Pt);
  }
  const hw = tube.width / 2;
  const hd = tube.depth / 2;
  return [
    [tube.x - hw, tube.z - hd],
    [tube.x + hw, tube.z - hd],
    [tube.x + hw, tube.z + hd],
    [tube.x - hw, tube.z + hd]
  ];
}

/**
 * Контур доски ступени в плане с учётом поворота вокруг Y и торцовки 45°.
 * Локально: ширина вдоль X, носик со стороны +Z; торцовка уходит к заднему краю.
 */
export function treadOutline(tread: BoxElement): Pt[] {
  const hw = tread.width / 2;
  const hd = tread.depth / 2;
  const tanL = (tread.cutAngleLeftDeg ?? 0) > 0 ? Math.tan(((tread.cutAngleLeftDeg ?? 0) * Math.PI) / 180) : 0;
  const tanR = (tread.cutAngleRightDeg ?? 0) > 0 ? Math.tan(((tread.cutAngleRightDeg ?? 0) * Math.PI) / 180) : 0;

  const local: Pt[] = [
    [-hw, hd],
    [hw, hd],
    [hw - tread.depth * tanR, -hd],
    [-hw + tread.depth * tanL, -hd]
  ];

  const rot = tread.rotationY ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return local.map(([lx, lz]) => [
    tread.x + lx * cos + lz * sin,
    tread.z - lx * sin + lz * cos
  ] as Pt);
}

export function boundsOf(points: Pt[]): PlanBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  points.forEach(([x, z]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });
  return { minX, maxX, minZ, maxZ };
}

export function uniqueSorted(values: number[], tolerance = 1): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const result: number[] = [];
  sorted.forEach((v) => {
    const last = result[result.length - 1];
    if (last === undefined || Math.abs(v - last) > tolerance) result.push(v);
  });
  return result;
}
