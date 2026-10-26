import {
  STEP_TREAD_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM,
  RISER_THICKNESS_MM,
  PROFILE_TUBE_SIZE_MM,
  TARGET_STEP_HEIGHT_MM,
  MAX_STRINGER_AXIS_STEP_MM,
  RISER_TOP_CLEARANCE_MM,
  RISER_STOCK_HEIGHT_MM,
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
    const zBack = tierIndexFromTop * metrics.tierStepRunMm;
    const zCenter = zBack + (STEP_TREAD_DEPTH_MM / 2);
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

function generateRiserElements(
  stepCount: number,
  stepHeight: number,
  frameWidthMm: number,
  metrics: StepNodeMetrics
): BoxElement[] {
  const risers: BoxElement[] = [];
  const riserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);
  const actualHeight = Math.max(0, riserHeight - RISER_TOP_CLEARANCE_MM);

  for (let i = 0; i < stepCount; i++) {
    const tierIndexFromTop = (stepCount - 1) - i;
    const zFrontTier = (tierIndexFromTop + 1) * metrics.tierStepRunMm;
    const zCenter = zFrontTier + (RISER_THICKNESS_MM / 2);
    const yBottom = i * stepHeight;
    const yCenter = yBottom + (actualHeight / 2);

    risers.push({
      id: `riser-${i + 1}`,
      x: 0,
      y: yCenter,
      z: zCenter,
      width: frameWidthMm,
      height: actualHeight,
      depth: RISER_THICKNESS_MM
    });
  }
  return risers;
}

function generateCladdingElements(
  stepCount: number,
  stepHeight: number,
  totalWidth: number,
  totalHeight: number,
  metrics: StepNodeMetrics
): BoxElement[] {
  const cladding: BoxElement[] = [];
  const halfWidth = totalWidth / 2;
  const boardThick = RISER_THICKNESS_MM;
  const slatHeight = RISER_STOCK_HEIGHT_MM;
  const gap = 3;

  const sideRows = Math.ceil(totalHeight / (slatHeight + gap));
  for (let r = 0; r < sideRows; r++) {
    const currentH = Math.min(slatHeight, totalHeight - (r * (slatHeight + gap)));
    const rowY = (r * (slatHeight + gap)) + (currentH / 2);
    const rowTopY = rowY + (currentH / 2);
    if (currentH <= 0) break;

    const matchingStepIdx = Math.min(stepCount - 1, Math.floor(rowTopY / stepHeight));
    const tierFromTop = stepCount - 1 - matchingStepIdx;
    const sideDepth = (tierFromTop + 1) * metrics.tierStepRunMm;
    const zCenter = sideDepth / 2;

    [-halfWidth + (boardThick / 2), halfWidth - (boardThick / 2)].forEach((xPos, sideIdx) => {
      cladding.push({
        id: `cladding-side-${sideIdx === 0 ? 'left' : 'right'}-row-${r + 1}`,
        x: xPos,
        y: rowY,
        z: zCenter,
        width: boardThick,
        height: currentH,
        depth: sideDepth
      });
    });
  }
  return cladding;
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

  const rowZCenters: number[] = [PROFILE_TUBE_SIZE_MM / 2];
  for (let r = 1; r <= stepCount; r++) {
    rowZCenters.push((r * metrics.tierStepRunMm) - (PROFILE_TUBE_SIZE_MM / 2));
  }

  for (let r = 0; r <= stepCount; r++) {
    const zPos = rowZCenters[r];
    if (zPos === undefined) continue;

    const tierStep = r <= 1 ? stepCount : stepCount - r + 1;
    const topBeamY = (tierStep * stepHeight) - STEP_TREAD_THICKNESS_MM - (PROFILE_TUBE_SIZE_MM / 2);
    const postHeight = topBeamY - (PROFILE_TUBE_SIZE_MM / 2);

    spacing.postXOffsets.forEach((xOff, pIdx) => {
      const postX = -halfWidth + xOff + (PROFILE_TUBE_SIZE_MM / 2);
      tubes.push({
        id: `post-r${r}-p${pIdx + 1}`,
        x: postX,
        y: postHeight / 2,
        z: zPos,
        width: PROFILE_TUBE_SIZE_MM,
        height: postHeight,
        depth: PROFILE_TUBE_SIZE_MM
      });
      totalLengthMm += postHeight;
    });
  }

  for (let i = 0; i < stepCount; i++) {
    const stepLevel = i + 1;
    const beamY = (stepLevel * stepHeight) - STEP_TREAD_THICKNESS_MM - (PROFILE_TUBE_SIZE_MM / 2);
    const tierFromTop = stepCount - stepLevel;

    const rearZ = rowZCenters[tierFromTop];
    const frontZ = rowZCenters[tierFromTop + 1];
    if (rearZ === undefined || frontZ === undefined) continue;

    tubes.push({
      id: `beam-front-lvl${stepLevel}`,
      x: 0,
      y: beamY,
      z: frontZ,
      width: spacing.frameWidthMm,
      height: PROFILE_TUBE_SIZE_MM,
      depth: PROFILE_TUBE_SIZE_MM
    });
    totalLengthMm += spacing.frameWidthMm;

    tubes.push({
      id: `beam-rear-lvl${stepLevel}`,
      x: 0,
      y: beamY,
      z: rearZ,
      width: spacing.frameWidthMm,
      height: PROFILE_TUBE_SIZE_MM,
      depth: PROFILE_TUBE_SIZE_MM
    });
    totalLengthMm += spacing.frameWidthMm;

    const isTop = stepLevel === stepCount;
    const clearLength = isTop ? metrics.upperClearSpanMm : metrics.lowerClearSpanMm;
    const stringerZ = isTop
      ? (PROFILE_TUBE_SIZE_MM + (271 - PROFILE_TUBE_SIZE_MM)) / 2
      : (tierFromTop * metrics.tierStepRunMm) + (231 / 2);

    spacing.postXOffsets.forEach((xOff, pIdx) => {
      const postX = -halfWidth + xOff + (PROFILE_TUBE_SIZE_MM / 2);
      tubes.push({
        id: `stringer-lvl${stepLevel}-p${pIdx + 1}`,
        x: postX,
        y: beamY,
        z: stringerZ,
        width: PROFILE_TUBE_SIZE_MM,
        height: PROFILE_TUBE_SIZE_MM,
        depth: clearLength
      });
      totalLengthMm += clearLength;
    });
  }

  return { tubes, totalLengthMm };
}

export function calculateStairLayout(
  widthMm: number,
  heightMm: number,
  options: { hasRisers?: boolean; hasSideCladding?: boolean } = {}
): StairLayoutResult {
  const { hasRisers = true, hasSideCladding = true } = options;
  const stepCount = Math.max(1, Math.round(heightMm / TARGET_STEP_HEIGHT_MM));
  const stepHeight = heightMm / stepCount;
  const metrics = calculateStepNodeMetrics();

  const frameWidthMm = Math.max(PROFILE_TUBE_SIZE_MM * 2, widthMm - (2 * RISER_THICKNESS_MM));
  const spacing = calculateTransverseSpacing(
    frameWidthMm,
    PROFILE_TUBE_SIZE_MM,
    MAX_STRINGER_AXIS_STEP_MM
  );

  const totalDepth = (stepCount * metrics.tierStepRunMm) + metrics.frontOverhangMm;
  const visibleRiserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);

  const cladding = hasSideCladding
    ? generateCladdingElements(stepCount, stepHeight, widthMm, heightMm, metrics)
    : [];
  const treads = generateTreadElements(stepCount, stepHeight, widthMm, metrics);
  const risers = hasRisers
    ? generateRiserElements(stepCount, stepHeight, spacing.frameWidthMm, metrics)
    : [];
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