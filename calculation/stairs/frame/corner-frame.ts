import { CORNER } from '../constants';
import type { BoxElement, StairModule } from '../types';
import { calcCornerDiagonalPair } from './corner-geometry';
import { calcUniformClearSpans } from './spacing';

export interface TierFrameBase {
  idPrefix: string;
  zFront: number;
  zRear: number;
  beamY: number;
}

export function buildXJoistRow(
  m: StairModule,
  p: TierFrameBase & { fromX: number; toX: number; includeStart: boolean; includeEnd: boolean }
): BoxElement[] {
  const result: BoxElement[] = [];
  const zMid = (p.zFront + p.zRear) / 2;
  const distance = Math.abs(p.toX - p.fromX);
  const dir = p.toX >= p.fromX ? 1 : -1;
  const add = (id: string, x: number): void => {
    result.push({ id, x, y: p.beamY, z: zMid, width: m.tube, height: m.tube, depth: m.clearSpan });
  };

  if (p.includeStart) add(`${p.idPrefix}-start`, p.fromX);
  if (distance > m.tube) {
    const count = Math.max(1, Math.ceil(distance / (m.cornerTargetSpan + m.tube)));
    const pitch = distance / count;
    for (let k = 1; k < count; k++) add(`${p.idPrefix}-s${k}`, p.fromX + dir * pitch * k);
  }
  if (p.includeEnd) add(`${p.idPrefix}-end`, p.toX);
  return result;
}

export interface WingParams extends TierFrameBase {
  isLeft: boolean;
  xOuter: number;
  xInner: number;
}

export function buildCornerDiagonals(m: StairModule, p: WingParams): BoxElement[] {
  return calcCornerDiagonalPair({ ...p, tube: m.tube }).map((d) => ({
    id: `${p.idPrefix}-${d.idSuffix}`,
    x: d.x,
    y: p.beamY,
    z: d.z,
    width: m.tube,
    height: m.tube,
    depth: d.lengthMm,
    cutAngleLeftDeg: CORNER.MITER_ANGLE_DEG,
    cutAngleRightDeg: CORNER.MITER_ANGLE_DEG,
    polygonXZ: d.polygonXZ
  }));
}

export function buildSideWingFrame(m: StairModule, p: WingParams): BoxElement[] {
  const T = m.tube;
  const outerX = p.isLeft ? p.xOuter + T / 2 : p.xOuter - T / 2;
  const innerX = p.isLeft ? p.xInner - T / 2 : p.xInner + T / 2;
  const spanX = (outerX + innerX) / 2;
  const tube = (id: string, x: number, z: number, width: number, depth: number): BoxElement => ({
    id: `${p.idPrefix}-${id}`,
    x,
    y: p.beamY,
    z,
    width,
    height: T,
    depth
  });

  const result: BoxElement[] = [tube('outer', outerX, p.zFront / 2, T, p.zFront)];
  if (p.zRear > T) result.push(tube('inner', innerX, (p.zRear + T) / 2, T, p.zRear + T));
  result.push(tube('wall-cap', spanX, T / 2, m.clearSpan, T));

  const wingSpan = p.zRear - T;
  if (wingSpan > m.cornerTargetSpan) {
    calcUniformClearSpans(wingSpan, m.cornerTargetSpan, T).forEach((offset, k) => {
      result.push(tube(`joist-s${k + 1}`, spanX, T + offset, m.clearSpan, T));
    });
  }
  return result;
}

// опоры на общей сетке
export function buildPostGrid(m: StairModule, tubes: BoxElement[], columnsX: number[], rowsZ: number[]): BoxElement[] {
  const T = m.tube;
  const tol = 0.6;
  const supports = tubes.filter((t) => !t.polygonXZ && t.height <= T + 0.5);
  const columns = [...columnsX].sort((a, b) => a - b).filter((x, i, arr) => i === 0 || x - (arr[i - 1] ?? x) > 1);
  const posts: BoxElement[] = [];

  rowsZ.forEach((z, rowIdx) => {
    columns.forEach((x, colIdx) => {
      const covering = supports.filter(
        (t) => Math.abs(x - t.x) <= t.width / 2 + tol && Math.abs(z - t.z) <= t.depth / 2 + tol
      );
      if (covering.length === 0) return;
      const beam = covering.reduce((low, t) => (t.y < low.y ? t : low));
      const height = beam.y - T / 2;
      if (height <= 1) return;
      posts.push({ id: `post-grid-c${colIdx + 1}-r${rowIdx + 1}`, x, y: height / 2, z, width: T, height, depth: T });
    });
  });
  return posts;
}
