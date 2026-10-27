import {
  FASTENERS_CONFIG,
  PROFILE_TUBE_SIZE_MM,
  RISER_THICKNESS_MM,
  RISER_TOP_CLEARANCE_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM
} from '@/constants/stairs-config';
import type {
  FastenerPoint,
  FastenersCalculationResult,
  SideCladdingPiece,
  StepNodeMetrics,
  TransverseSpacing
} from '@/types/stairs';
import { calculateVisibleRiserHeight } from './nodes/step-node-calculator';

const RELATIVE_FASTENER_LOW_RATIO = 0.28;
const RELATIVE_FASTENER_HIGH_RATIO = 0.72;

export interface FastenerPointsPayload {
  stepCount: number;
  stepHeight: number;
  totalWidth: number;
  spacing: TransverseSpacing;
  metrics: StepNodeMetrics;
  hasRisers: boolean;
  hasSideCladding: boolean;
  sidePieces: SideCladdingPiece[];
}

function calculateItemSummary(
  countRaw: number,
  spec: string,
  drillBitDiameterMm: number
) {
  const countWithReserve = Math.ceil(countRaw * FASTENERS_CONFIG.HARDWARE_RESERVE_FACTOR);
  const boxesCount = Math.max(1, Math.ceil(countWithReserve / FASTENERS_CONFIG.BOX_PACKAGE_SIZE));

  return {
    spec,
    countRaw,
    countWithReserve,
    boxesCount,
    drillBitDiameterMm
  };
}

export function calculateFasteners(
  stepCount: number,
  postsAlongWidth: number,
  hasRisers: boolean,
  hasSideCladding: boolean,
  sidePieces: SideCladdingPiece[]
): FastenersCalculationResult {
  const treadsCount = stepCount * postsAlongWidth * FASTENERS_CONFIG.SCREWS_PER_STRINGER_TREAD;
  const risersCount = hasRisers
    ? stepCount * postsAlongWidth * FASTENERS_CONFIG.SCREWS_PER_POST_RISER
    : 0;

  const sideScrewsPerSide = sidePieces.reduce((acc, piece) => {
    return acc + (piece.postsCrossed * FASTENERS_CONFIG.SCREWS_PER_POST_CLADDING_TIER);
  }, 0);
  const sideCladdingCount = hasSideCladding ? sideScrewsPerSide * 2 : 0;

  const treads = calculateItemSummary(
    treadsCount,
    FASTENERS_CONFIG.TREAD_SCREW_SPEC,
    FASTENERS_CONFIG.TREAD_DRILL_BIT_MM
  );

  const risersAndCladdingTotal = risersCount + sideCladdingCount;
  const risersAndCladding = calculateItemSummary(
    risersAndCladdingTotal,
    FASTENERS_CONFIG.CLADDING_SCREW_SPEC,
    FASTENERS_CONFIG.CLADDING_DRILL_BIT_MM
  );

  return {
    treads,
    risersAndCladding,
    breakdown: {
      treadsCount,
      risersCount,
      sideCladdingCount
    },
    totalScrewsWithReserve: treads.countWithReserve + risersAndCladding.countWithReserve
  };
}

function generateTreadFastenerPoints(
  stepCount: number,
  stepHeight: number,
  spacing: TransverseSpacing
): FastenerPoint[] {
  const points: FastenerPoint[] = [];
  const halfWidth = spacing.frameWidthMm / 2;

  for (let i = 0; i < stepCount; i++) {
    const stepLevel = i + 1;
    const tierFromTop = stepCount - stepLevel;
    const tierZStart = tierFromTop * STEP_FRAME_MODULE_DEPTH_MM;
    const tierZEnd = (tierFromTop + 1) * STEP_FRAME_MODULE_DEPTH_MM;
    const rearZ = tierZStart + (PROFILE_TUBE_SIZE_MM / 2);
    const frontZ = tierZEnd - (PROFILE_TUBE_SIZE_MM / 2);
    const topY = stepLevel * stepHeight;

    spacing.postXOffsets.forEach((xOff: number, pIdx: number) => {
      const postX = -halfWidth + xOff + (PROFILE_TUBE_SIZE_MM / 2);

      points.push({
        id: `fastener-tread-${stepLevel}-p${pIdx + 1}-rear`,
        x: postX,
        y: topY,
        z: rearZ,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        type: 'tread',
        spec: FASTENERS_CONFIG.TREAD_SCREW_SPEC
      });

      points.push({
        id: `fastener-tread-${stepLevel}-p${pIdx + 1}-front`,
        x: postX,
        y: topY,
        z: frontZ,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        type: 'tread',
        spec: FASTENERS_CONFIG.TREAD_SCREW_SPEC
      });
    });
  }

  return points;
}

function generateRiserFastenerPoints(
  stepCount: number,
  stepHeight: number,
  spacing: TransverseSpacing,
  metrics: StepNodeMetrics
): FastenerPoint[] {
  const points: FastenerPoint[] = [];
  const halfWidth = spacing.frameWidthMm / 2;
  const riserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);
  const actualHeight = Math.max(0, riserHeight - RISER_TOP_CLEARANCE_MM);

  for (let i = 0; i < stepCount; i++) {
    const stepLevel = i + 1;
    const tierFromTop = (stepCount - 1) - i;
    const zFrontFace = (tierFromTop + 1) * metrics.tierStepRunMm + RISER_THICKNESS_MM;
    const yBase = i * stepHeight;
    const yLow = yBase + (actualHeight * RELATIVE_FASTENER_LOW_RATIO);
    const yHigh = yBase + (actualHeight * RELATIVE_FASTENER_HIGH_RATIO);

    spacing.postXOffsets.forEach((xOff: number, pIdx: number) => {
      const postX = -halfWidth + xOff + (PROFILE_TUBE_SIZE_MM / 2);

      points.push({
        id: `fastener-riser-${stepLevel}-p${pIdx + 1}-low`,
        x: postX,
        y: yLow,
        z: zFrontFace,
        normalX: 0,
        normalY: 0,
        normalZ: 1,
        type: 'riser',
        spec: FASTENERS_CONFIG.CLADDING_SCREW_SPEC
      });

      points.push({
        id: `fastener-riser-${stepLevel}-p${pIdx + 1}-high`,
        x: postX,
        y: yHigh,
        z: zFrontFace,
        normalX: 0,
        normalY: 0,
        normalZ: 1,
        type: 'riser',
        spec: FASTENERS_CONFIG.CLADDING_SCREW_SPEC
      });
    });
  }

  return points;
}

function generateCladdingFastenerPoints(
  stepCount: number,
  totalWidth: number,
  metrics: StepNodeMetrics,
  sidePieces: SideCladdingPiece[]
): FastenerPoint[] {
  const points: FastenerPoint[] = [];
  const sideHalfWidth = totalWidth / 2;

  const rowZCenters: number[] = [PROFILE_TUBE_SIZE_MM / 2];
  for (let r = 1; r <= stepCount; r++) {
    rowZCenters.push((r * metrics.tierStepRunMm) - (PROFILE_TUBE_SIZE_MM / 2));
  }

  const sides: Array<{ sign: 1 | -1; name: string }> = [
    { sign: -1, name: 'left' },
    { sign: 1, name: 'right' }
  ];

  let currentY = 0;
  sidePieces.forEach((piece: SideCladdingPiece) => {
    const yLow = currentY + (piece.heightMm * RELATIVE_FASTENER_LOW_RATIO);
    const yHigh = currentY + (piece.heightMm * RELATIVE_FASTENER_HIGH_RATIO);

    sides.forEach((side) => {
      const xPos = side.sign * sideHalfWidth;

      for (let postIdx = 0; postIdx < piece.postsCrossed; postIdx++) {
        const zPos = rowZCenters[postIdx] ?? 0;

        points.push({
          id: `fastener-cladding-${side.name}-t${piece.tierIndex}-p${postIdx + 1}-low`,
          x: xPos,
          y: yLow,
          z: zPos,
          normalX: side.sign,
          normalY: 0,
          normalZ: 0,
          type: 'cladding',
          spec: FASTENERS_CONFIG.CLADDING_SCREW_SPEC
        });

        points.push({
          id: `fastener-cladding-${side.name}-t${piece.tierIndex}-p${postIdx + 1}-high`,
          x: xPos,
          y: yHigh,
          z: zPos,
          normalX: side.sign,
          normalY: 0,
          normalZ: 0,
          type: 'cladding',
          spec: FASTENERS_CONFIG.CLADDING_SCREW_SPEC
        });
      }
    });

    currentY += piece.heightMm;
  });

  return points;
}

export function calculateFastenerPoints(payload: FastenerPointsPayload): FastenerPoint[] {
  const treadPoints = generateTreadFastenerPoints(
    payload.stepCount,
    payload.stepHeight,
    payload.spacing
  );

  const riserPoints = payload.hasRisers
    ? generateRiserFastenerPoints(
      payload.stepCount,
      payload.stepHeight,
      payload.spacing,
      payload.metrics
    )
    : [];

  const claddingPoints = payload.hasSideCladding
    ? generateCladdingFastenerPoints(
      payload.stepCount,
      payload.totalWidth,
      payload.metrics,
      payload.sidePieces
    )
    : [];

  return [...treadPoints, ...riserPoints, ...claddingPoints];
}