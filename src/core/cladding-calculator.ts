import type { BoxElement, StairLayoutResult } from '../types/stairs';

const STOCK_LENGTH_MM = 3000;
const SAW_KERF_MM = 3;

export interface CladdingEstimate {
  sideBoardCount: number;
  riserBoardCount: number;
  totalCladdingBoards: number;
  totalCladdingLinearMeters: number;
}

function pieceLength(box: BoxElement): number {
  return Math.max(box.width, box.depth);
}

function countStockBoards(lengthsMm: number[]): number {
  const pieces: number[] = [];
  lengthsMm.forEach((len) => {
    let rest = len;
    while (rest > STOCK_LENGTH_MM) {
      pieces.push(STOCK_LENGTH_MM);
      rest -= STOCK_LENGTH_MM;
    }
    if (rest > 0) pieces.push(rest);
  });
  pieces.sort((a, b) => b - a);

  const boards: number[] = [];
  pieces.forEach((len) => {
    const need = len + SAW_KERF_MM;
    const idx = boards.findIndex((used) => used + need <= STOCK_LENGTH_MM);
    if (idx >= 0) {
      boards[idx] = (boards[idx] ?? 0) + need;
    } else {
      boards.push(need);
    }
  });
  return boards.length;
}

export function calculateCladdingEstimate(layout: StairLayoutResult): CladdingEstimate {
  const side = layout.cladding.filter((b) => b.id.startsWith('cladding-side'));

  const sideBoardCount = countStockBoards(side.map(pieceLength));
  const riserBoardCount = countStockBoards(layout.risers.map(pieceLength));

  const totalCladdingBoards = countStockBoards(
    [...side, ...layout.risers].map(pieceLength)
  );

  return {
    sideBoardCount,
    riserBoardCount,
    totalCladdingBoards,
    totalCladdingLinearMeters: Number(((totalCladdingBoards * STOCK_LENGTH_MM) / 1000).toFixed(1))
  };
}