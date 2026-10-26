import {
  STEP_TREAD_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM,
  RISER_THICKNESS_MM,
  PROFILE_TUBE_SIZE_MM,
  TARGET_STEP_HEIGHT_MM,
  MAX_STRINGER_AXIS_STEP_MM,
  RISER_STOCK_HEIGHT_MM,
  STEP_NOSE_OVERHANG_MM,
  NOSE_INNER_GAP_MM,
  DRAINAGE_GAP_MM
} from '../constants/stairs-config';
import type {
  BoxElement,
  StairLayoutResult,
  StepNodeMetrics,
  TransverseSpacing
} from '../types/stairs';
import { calculateStepNodeMetrics, calculateVisibleRiserHeight } from './nodes/step-node-calculator';
import { calculateTransverseSpacing } from './spacing-calculator';

function generateTreadElements(
  stepCount: number,
  stepHeight: number,
  totalWidth: number,
  metrics: StepNodeMetrics
): BoxElement[] {
  const treads: BoxElement[] = [];
  for (let i = 0; i < stepCount; i++) {
    const tierIndexFromTop = (stepCount - 1) - i;
    const zFront = STEP_TREAD_DEPTH_MM + (tierIndexFromTop * metrics.tierStepRunMm);
    const zCenter = zFront - (STEP_TREAD_DEPTH_MM / 2);
    const yCenter = ((i + 1) * stepHeight) - (STEP_TREAD_THICKNESS_MM / 2);

    treads.push({
      id: `tread-${i + 1}`,
      x: 0,
      y: yCenter,
      z: zCenter,
      width: totalWidth,
      height: STEP_TREAD_THICKNESS_MM,
      depth: STEP_TREAD_DEPTH_MM
    });
  }
  return treads;
}

const CLADDING_MIN_ROW_MM = 20;   // ниже этой высоты полоса не ставится
const CLADDING_MIN_LAST_ROW_MM = 40; // остаток уже этого не оставляем узкой полоской

/** Верх ступени k (k = 1..N снизу) и низ её настила */
function treadFrontZ(stepLevel: number, stepCount: number, metrics: StepNodeMetrics): number {
  const tierFromTop = stepCount - stepLevel;
  return STEP_TREAD_DEPTH_MM + (tierFromTop * metrics.tierStepRunMm);
}

/**
 * Раскладка рядов заборной доски 145 мм в диапазоне высот [lo, hi] без зазоров (встык).
 * Ряды идут сверху вниз целой доской. Если остаток получается узким (меньше 40 мм),
 * высота делится поровну между всеми рядами, чтобы не было узкой полоски.
 */
function splitIntoRows(lo: number, hi: number): Array<{ y0: number; y1: number }> {
  const total = hi - lo;
  if (total < CLADDING_MIN_ROW_MM) return [];

  const fullRows = Math.floor(total / RISER_STOCK_HEIGHT_MM);
  const remainder = total - (fullRows * RISER_STOCK_HEIGHT_MM);

  let heights: number[];
  if (fullRows === 0) {
    heights = [total];
  } else if (remainder < 0.5) {
    heights = new Array<number>(fullRows).fill(RISER_STOCK_HEIGHT_MM);
  } else if (remainder < CLADDING_MIN_LAST_ROW_MM) {
    const rows = fullRows + 1;
    heights = new Array<number>(rows).fill(total / rows);
  } else {
    heights = [...new Array<number>(fullRows).fill(RISER_STOCK_HEIGHT_MM), remainder];
  }

  const rows: Array<{ y0: number; y1: number }> = [];
  let top = hi;
  heights.forEach((h) => {
    rows.push({ y0: top - h, y1: top });
    top -= h;
  });
  return rows;
}

/**
 * Зашивка заборной доской МПК (11x145) строго по габариту каркаса:
 *  - боковины заподлицо с краем ступеней, встык без щелей, ступенчатый контур: под каждой ступенью
 *    своя полоса, длиной до плоскости подступенка этой ступени;
 *  - задняя стенка между боковинами, от пола до низа верхней ступени;
 *  - подступенки под носиком (в stairs.risers), зазор 3 мм только снизу для стока воды.
 * Ничего не выступает выше настила и не перекрывает ступени.
 */
function generateCladdingElements(
  stepCount: number,
  stepHeight: number,
  totalWidth: number,
  metrics: StepNodeMetrics
): { cladding: BoxElement[]; risers: BoxElement[] } {
  const cladding: BoxElement[] = [];
  const risers: BoxElement[] = [];
  const t = RISER_THICKNESS_MM;
  const halfWidth = totalWidth / 2;
  const innerWidth = totalWidth - (2 * t);
  const sideX = halfWidth - (t / 2);
  const noseAndGap = STEP_NOSE_OVERHANG_MM + NOSE_INNER_GAP_MM;

  const treadUnderside = (level: number): number => (level * stepHeight) - STEP_TREAD_THICKNESS_MM;

  // 1. Боковины: полоса под каждой ступенью
  for (let level = 1; level <= stepCount; level++) {
    const hi = treadUnderside(level);
    const lo = level === 1 ? 0 : treadUnderside(level - 1);
    const depth = treadFrontZ(level, stepCount, metrics) - noseAndGap; // до лицевой грани подступенка

    splitIntoRows(lo, hi).forEach((row, rIdx) => {
      const height = row.y1 - row.y0;
      [-sideX, sideX].forEach((x, sideIdx) => {
        cladding.push({
          id: `cladding-side-${sideIdx === 0 ? 'left' : 'right'}-lvl${level}-row${rIdx + 1}`,
          x,
          y: row.y0 + (height / 2),
          z: depth / 2,
          width: t,
          height,
          depth
        });
      });
    });
  }

  // 2. Задняя стенка между боковинами, от пола до низа верхней ступени
  splitIntoRows(0, treadUnderside(stepCount)).forEach((row, rIdx) => {
    const height = row.y1 - row.y0;
    cladding.push({
      id: `cladding-rear-row${rIdx + 1}`,
      x: 0,
      y: row.y0 + (height / 2),
      z: t / 2,
      width: innerWidth,
      height,
      depth: t
    });
  });

  // 3. Подступенки: под носиком, сверху вплотную к настилу, снизу зазор 3 мм (слив воды)
  for (let level = 1; level <= stepCount; level++) {
    const hi = treadUnderside(level); // верх подступенка вплотную к низу настила
    const lo = ((level - 1) * stepHeight) + DRAINAGE_GAP_MM;
    const zFace = treadFrontZ(level, stepCount, metrics) - noseAndGap;
    const zCenter = zFace - (t / 2);

    splitIntoRows(lo, hi).forEach((row, rIdx) => {
      const height = row.y1 - row.y0;
      risers.push({
        id: `riser-lvl${level}-row${rIdx + 1}`,
        x: 0,
        y: row.y0 + (height / 2),
        z: zCenter,
        width: innerWidth,
        height,
        depth: t
      });
    });
  }

  return { cladding, risers };
}

function generateFrameTubes(
  stepCount: number,
  stepHeight: number,
  spacing: TransverseSpacing,
  metrics: StepNodeMetrics
): { tubes: BoxElement[]; totalLengthMm: number } {
  const tubes: BoxElement[] = [];
  let totalLengthMm = 0;
  const halfWidth = spacing.frameWidthMm / 2;

  for (let i = 0; i < stepCount; i++) {
    const stepLevel = i + 1;
    const beamY = (stepLevel * stepHeight) - STEP_TREAD_THICKNESS_MM - (PROFILE_TUBE_SIZE_MM / 2);
    const legHeight = beamY - (PROFILE_TUBE_SIZE_MM / 2);

    const tierFromTop = stepCount - stepLevel;
    const zFrontEdge = STEP_TREAD_DEPTH_MM + (tierFromTop * metrics.tierStepRunMm) - metrics.frontOverhangMm;
    const zFrontCenter = zFrontEdge - (PROFILE_TUBE_SIZE_MM / 2);

    const zRearEdge = tierFromTop === 0
      ? metrics.rearOverhangMm
      : STEP_TREAD_DEPTH_MM + ((tierFromTop - 1) * metrics.tierStepRunMm) - metrics.frontOverhangMm - PROFILE_TUBE_SIZE_MM;
    const zRearCenter = zRearEdge + (PROFILE_TUBE_SIZE_MM / 2);

    const frameDepth = Math.abs(zFrontCenter - zRearCenter);
    const zCenter = zRearCenter + (frameDepth / 2);

    [zRearCenter, zFrontCenter].forEach((zPos) => {
      spacing.postXOffsets.forEach((xOff, pIdx) => {
        const postX = -halfWidth + xOff + (PROFILE_TUBE_SIZE_MM / 2);
        tubes.push({
          id: `post-lvl${stepLevel}-z${Math.round(zPos)}-p${pIdx + 1}`,
          x: postX,
          y: legHeight / 2,
          z: zPos,
          width: PROFILE_TUBE_SIZE_MM,
          height: legHeight,
          depth: PROFILE_TUBE_SIZE_MM
        });
        totalLengthMm += legHeight;
      });
    });

    tubes.push({
      id: `beam-rear-lvl${stepLevel}`,
      x: 0, y: beamY, z: zRearCenter,
      width: spacing.frameWidthMm, height: PROFILE_TUBE_SIZE_MM, depth: PROFILE_TUBE_SIZE_MM
    });
    tubes.push({
      id: `beam-front-lvl${stepLevel}`,
      x: 0, y: beamY, z: zFrontCenter,
      width: spacing.frameWidthMm, height: PROFILE_TUBE_SIZE_MM, depth: PROFILE_TUBE_SIZE_MM
    });
    totalLengthMm += spacing.frameWidthMm * 2;

    spacing.postXOffsets.forEach((xOff, pIdx) => {
      const postX = -halfWidth + xOff + (PROFILE_TUBE_SIZE_MM / 2);
      tubes.push({
        id: `stringer-lvl${stepLevel}-p${pIdx + 1}`,
        x: postX, y: beamY, z: zCenter,
        width: PROFILE_TUBE_SIZE_MM, height: PROFILE_TUBE_SIZE_MM, depth: frameDepth
      });
      totalLengthMm += frameDepth;
    });
  }

  return { tubes, totalLengthMm };
}

export function calculateStairLayout(widthMm: number, heightMm: number): StairLayoutResult {
  const stepCount = Math.max(1, Math.round(heightMm / TARGET_STEP_HEIGHT_MM));
  const stepHeight = heightMm / stepCount;
  const metrics = calculateStepNodeMetrics();

  const frameWidthMm = Math.max(PROFILE_TUBE_SIZE_MM * 2, widthMm - (2 * RISER_THICKNESS_MM));
  const spacing = calculateTransverseSpacing(
    frameWidthMm,
    PROFILE_TUBE_SIZE_MM,
    MAX_STRINGER_AXIS_STEP_MM
  );

  const totalDepth = STEP_TREAD_DEPTH_MM + ((stepCount - 1) * metrics.tierStepRunMm);
  const visibleRiserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);

  const { cladding, risers } = generateCladdingElements(stepCount, stepHeight, widthMm, metrics);
  const treads = generateTreadElements(stepCount, stepHeight, widthMm, metrics);
  const { tubes: frameTubes, totalLengthMm } = generateFrameTubes(
    stepCount,
    stepHeight,
    spacing,
    metrics
  );

  return {
    stepCount,
    stepHeight,
    visibleRiserHeight,
    totalWidth: widthMm,
    totalHeight: heightMm,
    totalDepth,
    cladding,
    treads,
    risers,
    frameTubes,
    spacing,
    metrics,
    totalPipeLengthM: Number((totalLengthMm / 1000).toFixed(2))
  };
}
