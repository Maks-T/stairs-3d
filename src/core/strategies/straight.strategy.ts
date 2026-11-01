
import {
  PROFILE_TUBE_SIZE_MM,
  MAX_STRINGER_AXIS_STEP_MM,
  POST_PITCH_MM,
  RISER_THICKNESS_MM,
  RISER_TOP_CLEARANCE_MM,
  STEP_FRAME_CLEAR_SPAN_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  STEP_TREAD_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM
} from '@/constants/stairs-config';
import type {
  BoxElement,
  StepNodeMetrics,
  TransverseSpacing
} from '@/types/stairs';
import { calculateSideCladdingPieces } from '../cladding-calculator';
import { calculateVisibleRiserHeight } from '../nodes/step-node-calculator';
import { calculateTransverseSpacing } from '../spacing-calculator';
import type { StairCalculationContext, StairLayoutStrategy, StrategyLayout } from './stair-strategy.interface';

function createTreads(
  stepCount: number,
  stepHeight: number,
  totalWidth: number,
  metrics: StepNodeMetrics
): BoxElement[] {
  const treads: BoxElement[] = [];
  for (let i = 0; i < stepCount; i++) {
    const tierFromTop = stepCount - 1 - i;
    const zBack = tierFromTop * metrics.tierStepRunMm;
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

function createRisers(
  stepCount: number,
  stepHeight: number,
  frameWidthMm: number,
  metrics: StepNodeMetrics
): BoxElement[] {
  const risers: BoxElement[] = [];
  const riserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);
  const actualHeight = Math.max(0, riserHeight - RISER_TOP_CLEARANCE_MM);

  for (let i = 0; i < stepCount; i++) {
    const tierFromTop = stepCount - 1 - i;
    const zFrontTier = (tierFromTop + 1) * metrics.tierStepRunMm;
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

function createCladding(
  stepCount: number,
  stepHeight: number,
  totalWidth: number
): BoxElement[] {
  const cladding: BoxElement[] = [];
  const sideX = (totalWidth / 2) - (RISER_THICKNESS_MM / 2);
  const sidePieces = calculateSideCladdingPieces(stepCount, stepHeight);

  let currentY = 0;
  sidePieces.forEach((piece) => {
    const tierFromBottom = piece.tierIndex;
    const yCenter = currentY + (piece.heightMm / 2);
    const zCenter = piece.lengthMm / 2;

    [-sideX, sideX].forEach((xPos: number, sideIdx: number) => {
      cladding.push({
        id: `cladding-side-${sideIdx === 0 ? 'left' : 'right'}-tier-${tierFromBottom}`,
        x: xPos,
        y: yCenter,
        z: zCenter,
        width: RISER_THICKNESS_MM,
        height: piece.heightMm,
        depth: piece.lengthMm
      });
    });

    currentY += piece.heightMm;
  });

  return cladding;
}

/**
 * Опоры задают равномерную сетку с шагом не больше шага опор. Лаги под ступенью (поперечины каркаса)
 * делят каждый пролёт между опорами на равные части не больше предельного шага лаг.
 */
function buildJoistSpacing(postSpacing: TransverseSpacing, maxJoistPitchMm: number): TransverseSpacing {
  const offsets: number[] = [];
  const posts = postSpacing.postXOffsets;
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i] ?? 0;
    const b = posts[i + 1] ?? 0;
    const parts = Math.max(1, Math.ceil((b - a) / maxJoistPitchMm));
    for (let k = 0; k < parts; k++) offsets.push(Math.round(a + ((b - a) * k) / parts));
  }
  offsets.push(posts[posts.length - 1] ?? 0);
  const spans = offsets.slice(1).map((x, i) => x - (offsets[i] ?? 0) - PROFILE_TUBE_SIZE_MM);
  return { ...postSpacing, postXOffsets: offsets, spans, numPosts: offsets.length };
}

function createFrameTubes(
  stepCount: number,
  stepHeight: number,
  spacing: TransverseSpacing,
  postOffsets: number[],
  metrics: StepNodeMetrics
): { tubes: BoxElement[]; totalLengthMm: number } {
  const tubes: BoxElement[] = [];
  let totalLengthMm = 0;
  const halfWidth = spacing.frameWidthMm / 2;

  const postIndices = postOffsets.map((o) => spacing.postXOffsets.indexOf(o)).filter((i) => i >= 0);

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

    postIndices.forEach((pIdx: number) => {
      const xOff = spacing.postXOffsets[pIdx] ?? 0;
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

    const tierZStart = tierFromTop * STEP_FRAME_MODULE_DEPTH_MM;
    const tierZEnd = (tierFromTop + 1) * STEP_FRAME_MODULE_DEPTH_MM;
    const rearZ = tierZStart + (PROFILE_TUBE_SIZE_MM / 2);
    const frontZ = tierZEnd - (PROFILE_TUBE_SIZE_MM / 2);
    const stringerZ = (tierZStart + tierZEnd) / 2;

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

    spacing.postXOffsets.forEach((xOff: number, pIdx: number) => {
      const postX = -halfWidth + xOff + (PROFILE_TUBE_SIZE_MM / 2);
      tubes.push({
        id: `stringer-lvl${stepLevel}-p${pIdx + 1}`,
        x: postX,
        y: beamY,
        z: stringerZ,
        width: PROFILE_TUBE_SIZE_MM,
        height: PROFILE_TUBE_SIZE_MM,
        depth: STEP_FRAME_CLEAR_SPAN_MM
      });
      totalLengthMm += STEP_FRAME_CLEAR_SPAN_MM;
    });
  }

  return { tubes, totalLengthMm };
}

export class StraightStairStrategy implements StairLayoutStrategy {
  calculate(context: StairCalculationContext): StrategyLayout {
    const { widthMm, heightMm, stepCount, stepHeight, metrics, options } = context;

    const frameWidthMm = Math.max(
      PROFILE_TUBE_SIZE_MM * 2,
      widthMm - (2 * RISER_THICKNESS_MM)
    );

    const postSpacing = calculateTransverseSpacing(frameWidthMm, PROFILE_TUBE_SIZE_MM, POST_PITCH_MM);
    const spacing = buildJoistSpacing(postSpacing, MAX_STRINGER_AXIS_STEP_MM);

    const totalDepth = (stepCount * STEP_FRAME_MODULE_DEPTH_MM) + metrics.frontOverhangMm;
    const visibleRiserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);

    const cladding = options.hasSideCladding
      ? createCladding(stepCount, stepHeight, widthMm)
      : [];
    const treads = createTreads(stepCount, stepHeight, widthMm, metrics);
    const risers = options.hasRisers
      ? createRisers(stepCount, stepHeight, spacing.frameWidthMm, metrics)
      : [];
    const { tubes: frameTubes, totalLengthMm } = createFrameTubes(
      stepCount,
      stepHeight,
      spacing,
      postSpacing.postXOffsets,
      metrics
    );


    return {
      stairType: 'straight',
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
}


