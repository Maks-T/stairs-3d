import {FASTENERS_CONFIG} from '@/constants/stairs-config';
import type {FastenersCalculationResult, SideCladdingPiece} from '@/types/stairs';

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