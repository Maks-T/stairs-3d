import {
  CLADDING_STOCK_LENGTH_MM,
  CLADDING_SAW_KERF_MM,
  RISER_STOCK_HEIGHT_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  RISER_THICKNESS_MM
} from '@/constants/stairs-config';
import type { BoxElement, SideCladdingPiece, StairLayoutResult } from '@/types/stairs';

export interface CladdingEstimate {
  sideBoardCount: number;
  riserBoardCount: number;
  totalCladdingBoards: number;
  totalCladdingLinearMeters: number;
  sidePieces: SideCladdingPiece[];
}

export function calculateSideCladdingPieces(stepCount: number): SideCladdingPiece[] {
  const pieces: SideCladdingPiece[] = [];
  for (let tier = 1; tier <= stepCount; tier++) {
    const stepsSpanned = stepCount - tier + 1;
    const lengthMm = (stepsSpanned * STEP_FRAME_MODULE_DEPTH_MM) + RISER_THICKNESS_MM;
    const heightMm = tier === 1 ? RISER_STOCK_HEIGHT_MM : 130;
    const postsCrossed = stepsSpanned + 1;

    pieces.push({
      tierIndex: tier,
      lengthMm,
      heightMm,
      postsCrossed
    });
  }
  return pieces;
}

function countStockBoards(lengthsMm: number[]): number {
  const pieces: number[] = [];
  lengthsMm.forEach((len) => {
    let rest = len;
    while (rest > CLADDING_STOCK_LENGTH_MM) {
      pieces.push(CLADDING_STOCK_LENGTH_MM);
      rest -= CLADDING_STOCK_LENGTH_MM;
    }
    if (rest > 0) pieces.push(rest);
  });
  pieces.sort((a, b) => b - a);

  const boards: number[] = [];
  pieces.forEach((len) => {
    const need = len + CLADDING_SAW_KERF_MM;
    const idx = boards.findIndex((used) => used + need <= CLADDING_STOCK_LENGTH_MM);
    if (idx >= 0) {
      boards[idx] = (boards[idx] ?? 0) + need;
    } else {
      boards.push(need);
    }
  });
  return boards.length;
}

export function calculateCladdingEstimate(layout: StairLayoutResult): CladdingEstimate {
  const sidePieces = calculateSideCladdingPieces(layout.stepCount);
  const sideLengths: number[] = [];
  sidePieces.forEach((p) => {
    sideLengths.push(p.lengthMm);
    sideLengths.push(p.lengthMm);
  });

  const sideBoardCount = countStockBoards(sideLengths);
  const riserBoardCount = countStockBoards(layout.risers.map((r: BoxElement) => r.width));
  const totalCladdingBoards = countStockBoards([...sideLengths, ...layout.risers.map((r: BoxElement) => r.width)]);

  return {
    sideBoardCount,
    riserBoardCount,
    totalCladdingBoards,
    totalCladdingLinearMeters: Number(((totalCladdingBoards * CLADDING_STOCK_LENGTH_MM) / 1000).toFixed(1)),
    sidePieces
  };
}