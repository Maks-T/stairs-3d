const DEFAULT_KERF_MM = 3;

/** Раскладка отрезков по доскам одной длины (по убыванию, первая подходящая). Отрезки длиннее доски режутся на части. */
export function countBoards(lengthsMm: number[], stockLengthMm: number, kerfMm = DEFAULT_KERF_MM): number {
  const pieces: number[] = [];
  lengthsMm.forEach((len) => {
    let rest = len;
    while (rest > stockLengthMm) {
      pieces.push(stockLengthMm);
      rest -= stockLengthMm;
    }
    if (rest > 0) pieces.push(rest);
  });
  pieces.sort((a, b) => b - a);

  const boards: number[] = [];
  pieces.forEach((len) => {
    const need = len + kerfMm;
    const idx = boards.findIndex((used) => used + need <= stockLengthMm + kerfMm);
    if (idx >= 0) {
      boards[idx] = (boards[idx] ?? 0) + need;
    } else {
      boards.push(need);
    }
  });
  return boards.length;
}

export interface BoardPurchase {
  stockLengthMm: number;
  boards: number;
  totalCost: number;
}

/** Выбирает длину доски (из доступных), при которой закупка по цене за п.м. выходит дешевле всего */
export function chooseCheapestStock(
  lengthsMm: number[],
  stockLengthsMm: number[],
  pricePerMeter: number,
  kerfMm = DEFAULT_KERF_MM
): BoardPurchase {
  let best: BoardPurchase | null = null;
  stockLengthsMm.forEach((stock) => {
    const boards = countBoards(lengthsMm, stock, kerfMm);
    const totalCost = boards * (stock / 1000) * pricePerMeter;
    if (!best || totalCost < best.totalCost) best = { stockLengthMm: stock, boards, totalCost };
  });
  return best ?? { stockLengthMm: stockLengthsMm[0] ?? 3000, boards: 0, totalCost: 0 };
}
