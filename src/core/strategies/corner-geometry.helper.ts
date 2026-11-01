import {
  CORNER_CONFIG,
  PROFILE_TUBE_SIZE_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  STAIRS_NORMS,
  PROFILE_TUBE_SIZE_MM as T
} from '@/constants/stairs-config';

export const DIAGONAL_CLEAR_GAP_MM = CORNER_CONFIG.DIAGONAL_CLEAR_GAP_MM;
export const DIAGONAL_AXIS_OFFSET_MM = CORNER_CONFIG.SCREW_MITER_OFFSET_MM;

export function calculateMiterProjection(normalOffsetMm: number): number {
  return normalOffsetMm * Math.SQRT2;
}

export function calculateDiagonalLength(clearSpanMm: number): number {
  return clearSpanMm * Math.SQRT2;
}

export function calculateTierSideWingDepthMm(
  stepIndex: number,
  stepCount: number,
  moduleDepthMm: number
): number {
  const tierFromTop = stepCount - stepIndex;
  return tierFromTop === 0 ? 0 : (tierFromTop + 1) * moduleDepthMm;
}

export interface TierWingDepths {
  outerDepthMm: number;
  innerDepthMm: number;
  isTopLanding: boolean;
}

export function calculateTierWingDepths(
  stepIndex: number,
  stepCount: number,
  moduleDepthMm = STEP_FRAME_MODULE_DEPTH_MM
): TierWingDepths {
  const tierFromTop = stepCount - stepIndex;
  const isTopLanding = tierFromTop === 0;
  return {
    outerDepthMm: isTopLanding ? 0 : (tierFromTop + 1) * moduleDepthMm,
    innerDepthMm: isTopLanding ? 0 : tierFromTop * moduleDepthMm,
    isTopLanding
  };
}

export interface CornerSquareBounds {
  xOuter: number;
  xInner: number;
  zOuter: number;
  zInner: number;
  centerX: number;
  centerZ: number;
}

export function calculateCornerSquareBounds(
  xOuter: number,
  xInner: number,
  zOuter: number,
  zInner: number
): CornerSquareBounds {
  return {
    xOuter,
    xInner,
    zOuter,
    zInner,
    centerX: (xOuter + xInner) / 2,
    centerZ: (zOuter + zInner) / 2
  };
}

export function calculateTierZBounds(
  stepIndex: number,
  stepCount: number,
  moduleDepthMm: number
): { zFront: number; zRear: number } {
  const tierFromTop = stepCount - stepIndex;
  return {
    zFront: (tierFromTop + 1) * moduleDepthMm,
    zRear: tierFromTop * moduleDepthMm
  };
}

export interface UniformClearSpansResult {
  numSpans: number;
  numTubes: number;
  clearSpanMm: number;
  pitchMm: number;
  tubeCenterOffsetsMm: number[];
}

export function calculateUniformClearSpans(
  totalClearLengthMm: number,
  maxTargetSpanMm = 350,
  tubeWidthMm = PROFILE_TUBE_SIZE_MM
): UniformClearSpansResult {
  if (totalClearLengthMm <= 0) {
    return { numSpans: 1, numTubes: 0, clearSpanMm: 0, pitchMm: 0, tubeCenterOffsetsMm: [] };
  }

  const numSpans = Math.max(1, Math.ceil(totalClearLengthMm / maxTargetSpanMm));
  const numTubes = numSpans - 1;
  const netClearMm = Math.max(0, totalClearLengthMm - numTubes * tubeWidthMm);
  const clearSpanMm = Number((netClearMm / numSpans).toFixed(1));
  const pitchMm = clearSpanMm + tubeWidthMm;

  const tubeCenterOffsetsMm: number[] = [];
  let currentOffset = 0;
  for (let i = 0; i < numTubes; i++) {
    currentOffset += clearSpanMm + tubeWidthMm / 2;
    tubeCenterOffsetsMm.push(Number(currentOffset.toFixed(1)));
    currentOffset += tubeWidthMm / 2;
  }

  return {
    numSpans,
    numTubes,
    clearSpanMm,
    pitchMm,
    tubeCenterOffsetsMm
  };
}

export function isTrapezoidReinforcementNeeded(
  shortSideMm: number,
  clearSpanMm: number
): boolean {
  const longSideMm = shortSideMm + clearSpanMm;
  const effectiveScrewSpanMm = longSideMm - calculateMiterProjection(CORNER_CONFIG.DIAGONAL_CORNER_OFFSET_MM);
  return effectiveScrewSpanMm > STAIRS_NORMS.MAX_STRINGER_STEP;
}

export function calculateRemainingStraightSpans(
  remainingLengthMm: number,
  targetSpanMm = CORNER_CONFIG.TARGET_TRAPEZOID_SPAN_MM
): number[] {
  if (remainingLengthMm <= 0) return [];

  const numSpans = Math.max(1, Math.ceil(remainingLengthMm / targetSpanMm));
  const totalPostsWidth = (numSpans - 1) * PROFILE_TUBE_SIZE_MM;
  const totalClear = Math.max(0, remainingLengthMm - totalPostsWidth);

  const baseSpan = Math.floor(totalClear / numSpans);
  const remainder = totalClear % numSpans;
  const spans = new Array<number>(numSpans).fill(baseSpan);

  let left = 0;
  let right = numSpans - 1;
  let added = 0;

  while (added < remainder) {
    const leftVal = spans[left];
    if (leftVal !== undefined) spans[left] = leftVal + 1;
    added++;

    if (added < remainder && left !== right) {
      const rightVal = spans[right];
      if (rightVal !== undefined) spans[right] = rightVal + 1;
      added++;
    }
    left++;
    right--;
  }

  return spans;
}

export interface CalculatedDiagonalSpec {
  idSuffix: string;
  x: number;
  z: number;
  lengthMm: number;
  rotationY: number;
  cutAngleLeftDeg: number;
  cutAngleRightDeg: number;
  polygonXZ?: Array<[number, number]>;
}

export interface DynamicDiagonalParams {
  isLeft: boolean;
  xOuter: number;
  xInner: number;
  zFront: number;
  zRear: number;
}

interface DiagonalPolygon {
  pts: Array<[number, number]>;
  center: { x: number; z: number };
  lengthMm: number;
}

function createPolygonResult(p1: [number, number], p2: [number, number], p3: [number, number], p4: [number, number]): DiagonalPolygon {
  const cx = (p1[0] + p2[0] + p3[0] + p4[0]) / 4;
  const cz = (p1[1] + p2[1] + p3[1] + p4[1]) / 4;
  const mid1X = (p1[0] + p2[0]) / 2;
  const mid1Z = (p1[1] + p2[1]) / 2;
  const mid2X = (p3[0] + p4[0]) / 2;
  const mid2Z = (p3[1] + p4[1]) / 2;
  const len = Math.hypot(mid2X - mid1X, mid2Z - mid1Z);

  return {
    pts: [p1, p2, p3, p4],
    center: { x: Number(cx.toFixed(2)), z: Number(cz.toFixed(2)) },
    lengthMm: Number(len.toFixed(1))
  };
}

interface CornerBoxBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

// Диагонали идут парой вдоль 45° и сдвинуты на 30 мм от вершины внутреннего угла каркаса:
//  - диагональ A (со стороны внутренней балки) упирается торцами в боковые грани внутренней и внешней балок крыла (X = const);
//  - диагональ B (со стороны фасада) упирается торцами в заднюю балку яруса и фасадную балку (Z = const).
// Так оба торца каждой диагонали лежат на реальных гранях профиля, а длина по оси = 191·√2 = 270.11 мм.
function buildLeftCornerPolygon(
  b: CornerBoxBounds,
  isDiagonalA: boolean
): DiagonalPolygon {
  const axialT = T * Math.SQRT2;
  const off = CORNER_CONFIG.DIAGONAL_CORNER_OFFSET_MM;
  // Вершина внутреннего угла: внутренняя балка (X = xMax) + задняя балка (Z = zMin); линии диагоналей x + z = const
  const c0 = b.xMax + b.zMin;

  if (isDiagonalA) {
    const k1 = c0 - off;
    const k2 = k1 - axialT;
    const p1: [number, number] = [b.xMax, k1 - b.xMax];
    const p2: [number, number] = [b.xMax, k2 - b.xMax];
    const p3: [number, number] = [b.xMin, k2 - b.xMin];
    const p4: [number, number] = [b.xMin, k1 - b.xMin];
    return createPolygonResult(p1, p2, p3, p4);
  }

  const k3 = c0 + off;
  const k4 = k3 + axialT;
  const p1: [number, number] = [k3 - b.zMin, b.zMin];
  const p2: [number, number] = [k4 - b.zMin, b.zMin];
  const p3: [number, number] = [k4 - b.zMax, b.zMax];
  const p4: [number, number] = [k3 - b.zMax, b.zMax];
  return createPolygonResult(p1, p2, p3, p4);
}

function buildRightCornerPolygon(
  b: CornerBoxBounds,
  isDiagonalA: boolean
): DiagonalPolygon {
  const axialT = T * Math.SQRT2;
  const off = CORNER_CONFIG.DIAGONAL_CORNER_OFFSET_MM;
  // Вершина внутреннего угла: внутренняя балка (X = xMin) + задняя балка (Z = zMin); линии диагоналей z - x = const
  const c0 = b.zMin - b.xMin;

  if (isDiagonalA) {
    const k1 = c0 - off;
    const k2 = k1 - axialT;
    const p1: [number, number] = [b.xMin, b.xMin + k1];
    const p2: [number, number] = [b.xMin, b.xMin + k2];
    const p3: [number, number] = [b.xMax, b.xMax + k2];
    const p4: [number, number] = [b.xMax, b.xMax + k1];
    return createPolygonResult(p1, p2, p3, p4);
  }

  const k3 = c0 + off;
  const k4 = k3 + axialT;
  const p1: [number, number] = [b.zMin - k3, b.zMin];
  const p2: [number, number] = [b.zMin - k4, b.zMin];
  const p3: [number, number] = [b.zMax - k4, b.zMax];
  const p4: [number, number] = [b.zMax - k3, b.zMax];
  return createPolygonResult(p1, p2, p3, p4);
}

export function calculateCornerDiagonalPair(params: DynamicDiagonalParams): [CalculatedDiagonalSpec, CalculatedDiagonalSpec] {
  const { isLeft, xOuter, xInner, zFront, zRear } = params;

  // Чистые внутренние границы углового проема яруса между окаймляющими балками
  const bounds: CornerBoxBounds = {
    xMin: isLeft ? xOuter + T : xInner + T,
    xMax: isLeft ? xInner - T : xOuter - T,
    zMin: zRear + T,
    zMax: zFront - T
  };

  let d1: DiagonalPolygon;
  let d2: DiagonalPolygon;

  if (isLeft) {
    d1 = buildLeftCornerPolygon(bounds, true);
    d2 = buildLeftCornerPolygon(bounds, false);
  } else {
    d1 = buildRightCornerPolygon(bounds, true);
    d2 = buildRightCornerPolygon(bounds, false);
  }

  return [
    {
      idSuffix: 'd1',
      x: d1.center.x,
      z: d1.center.z,
      lengthMm: d1.lengthMm,
      rotationY: 0,
      cutAngleLeftDeg: CORNER_CONFIG.MITER_ANGLE_DEG,
      cutAngleRightDeg: CORNER_CONFIG.MITER_ANGLE_DEG,
      polygonXZ: d1.pts
    },
    {
      idSuffix: 'd2',
      x: d2.center.x,
      z: d2.center.z,
      lengthMm: d2.lengthMm,
      rotationY: 0,
      cutAngleLeftDeg: CORNER_CONFIG.MITER_ANGLE_DEG,
      cutAngleRightDeg: CORNER_CONFIG.MITER_ANGLE_DEG,
      polygonXZ: d2.pts
    }
  ];
}
