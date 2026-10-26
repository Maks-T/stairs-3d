import type { BoxElement, StairLayoutResult } from '../types/stairs';

const STOCK_LENGTH_MM = 3000;
const SAW_KERF_MM = 3;

export interface CladdingEstimate {
  rearBoardCount: number;
  rearRows: number;
  sideBoardCount: number;
  riserBoardCount: number;
  totalCladdingBoards: number;
  totalCladdingLinearMeters: number;
}

/** Длина детали вдоль доски: у всех элементов зашивки это наибольший из горизонтальных размеров */
function pieceLength(box: BoxElement): number {
  return Math.max(box.width, box.depth);
}

/**
 * Раскрой деталей на хлысты 3000 мм (first-fit decreasing).
 * Деталь длиннее хлыста режется на куски по 3000 мм + остаток.
 */
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

  const boards: number[] = []; // занятая длина каждого хлыста
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

/**
 * Количество заборных досок МПК (11x145x3000) по реальной геометрии зашивки.
 * Считает ровно те детали, которые рисует layout: боковины, задняя стенка, подступенки.
 */
export function calculateCladdingEstimate(layout: StairLayoutResult): CladdingEstimate {
  const rear = layout.cladding.filter((b) => b.id.startsWith('cladding-rear'));
  const side = layout.cladding.filter((b) => b.id.startsWith('cladding-side'));

  const rearBoardCount = countStockBoards(rear.map(pieceLength));
  const sideBoardCount = countStockBoards(side.map(pieceLength));
  const riserBoardCount = countStockBoards(layout.risers.map(pieceLength));

  // Доски разного назначения одной ширины 145 мм можно кроить вместе, поэтому итог считаем общим раскроем
  const totalCladdingBoards = countStockBoards(
    [...rear, ...side, ...layout.risers].map(pieceLength)
  );

  return {
    rearBoardCount,
    rearRows: rear.length,
    sideBoardCount,
    riserBoardCount,
    totalCladdingBoards,
    totalCladdingLinearMeters: Number(((totalCladdingBoards * STOCK_LENGTH_MM) / 1000).toFixed(1))
  };
}
