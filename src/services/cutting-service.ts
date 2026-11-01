// @ts-ignore
import LinearCutter from 'linear-cutter';
import { SAW_KERF_MM, type CutPart, type StairLayoutResult } from '@calculation/stairs';
import type { CatalogSelection } from '@/catalog/stairs-catalog';

export interface StockCutMapItem {
  stockIndex: number;
  stockLength: number;
  cuts: number;
  // id элемента для подсветки в 3D
  parts: Array<{ length: number; name: string; tubeId: string }>;
  remainLength: number;
  wastePercent: number;
}

export interface CuttingOptimizationResult {
  pipeStocksCount: number;
  totalCuts: number;
  totalPurchasedPipeM: number;
  totalWasteM: number;
  wastePercent: number;
  cutMap: StockCutMapItem[];
}

export interface BoardCutSection {
  id: 'treads' | 'cladding';
  title: string;
  stockLengthMm: number;
  boardsCount: number;
  totalCuts: number;
  totalWasteM: number;
  wastePercent: number;
  // стыки из-за деталей длиннее доски
  joints: number;
  cutMap: StockCutMapItem[];
}

export interface BoardCuttingResult {
  treads: BoardCutSection;
  cladding: BoardCutSection | null;
}

interface CutPiece {
  id: string;
  name: string;
  length: number;
}

interface CutCoreResult {
  cutMap: StockCutMapItem[];
  totalCuts: number;
  totalWasteMm: number;
  wastePercent: number;
}

// запасной раскрой
function fallbackCut(pieces: CutPiece[], stockLengthMm: number, kerfMm: number): CutCoreResult {
  const sorted = [...pieces].sort((a, b) => b.length - a.length);
  const bars: Array<{ used: number; parts: CutPiece[] }> = [];
  sorted.forEach((piece) => {
    const bar = bars.find((b) => b.used + piece.length + (b.parts.length > 0 ? kerfMm : 0) <= stockLengthMm);
    if (bar) {
      bar.used += piece.length + (bar.parts.length > 0 ? kerfMm : 0);
      bar.parts.push(piece);
    } else {
      bars.push({ used: piece.length, parts: [piece] });
    }
  });
  return finalizeBars(
    bars.map((b) => ({
      parts: b.parts.map((p) => ({ length: p.length, name: p.name, tubeId: p.id })),
      remainLength: Math.max(0, stockLengthMm - b.used)
    })),
    stockLengthMm
  );
}

function finalizeBars(
  bars: Array<{ parts: StockCutMapItem['parts']; remainLength: number }>,
  stockLengthMm: number
): CutCoreResult {
  const cutMap: StockCutMapItem[] = bars.map((bar, idx) => ({
    stockIndex: idx + 1,
    stockLength: stockLengthMm,
    cuts: Math.max(0, bar.parts.length - (bar.remainLength > 0 ? 0 : 1)),
    parts: bar.parts,
    remainLength: Math.round(bar.remainLength),
    wastePercent: Number(((bar.remainLength / stockLengthMm) * 100).toFixed(1))
  }));
  const totalWasteMm = cutMap.reduce((acc, bar) => acc + bar.remainLength, 0);
  return {
    cutMap,
    totalCuts: cutMap.reduce((acc, bar) => acc + bar.cuts, 0),
    totalWasteMm,
    wastePercent: cutMap.length > 0 ? Number(((totalWasteMm / (cutMap.length * stockLengthMm)) * 100).toFixed(1)) : 0
  };
}

function optimizeCut(pieces: CutPiece[], stockLengthMm: number, kerfMm: number, heightMm: number): CutCoreResult {
  if (pieces.length === 0) {
    return { cutMap: [], totalCuts: 0, totalWasteMm: 0, wastePercent: 0 };
  }

  const pool = new Map<number, CutPiece[]>();
  pieces.forEach((piece) => {
    const list = pool.get(piece.length) ?? [];
    list.push(piece);
    pool.set(piece.length, list);
  });

  try {
    const cutter = new LinearCutter({
      parts: Array.from(pool.entries()).map(([length, list]) => ({
        length,
        count: list.length,
        angleLeft: 0,
        angleRight: 0
      })),
      stocks: [{ length: stockLengthMm, count: 99, angleLeft: 0, angleRight: 0 }],
      algorithms: ['matrix', 'greedy'],
      cutWidth: kerfMm,
      solution: 0,
      minRemainMidline: 50,
      optimization: 8,
      height: heightMm,
      changeCutWidth: false,
      silent: true
    });

    cutter.calculate();
    const res = cutter.result;

    if (res && Array.isArray(res.list)) {
      const bars: Array<{ parts: StockCutMapItem['parts']; remainLength: number }> = [];

      res.list.forEach((item: any) => {
        // развернуть одинаковые хлысты
        const repeat = Math.max(1, Number(item.count) || 1);
        for (let r = 0; r < repeat; r++) {
          const parts = (item.cutMap || [])
            .filter((c: any) => c.type === 'part')
            .map((c: any) => {
              const length = Math.round(c.length);
              const piece = pool.get(length)?.shift();
              return piece
                ? { length, name: piece.name, tubeId: piece.id }
                : { length, name: `Деталь ${length} мм`, tubeId: '' };
            });
          bars.push({ parts, remainLength: item.remain?.total?.length ?? 0 });
        }
      });

      const placed = bars.reduce((acc, bar) => acc + bar.parts.length, 0);
      if (placed === pieces.length) {
        return finalizeBars(bars, stockLengthMm);
      }
    }
  } catch (err) {
    console.warn('LinearCutter error fallback:', err);
  }

  return fallbackCut(pieces, stockLengthMm, kerfMm);
}

const toPiece = (p: CutPart): CutPiece => ({ id: p.id, name: p.name, length: p.lengthMm });

export function calculatePipeCutting(layout: StairLayoutResult, selection: CatalogSelection): CuttingOptimizationResult {
  const { profile } = selection;
  const stockLengthMm = profile.stockLengthMm;
  const pieces = layout.parts.tubes.map(toPiece);

  const core = optimizeCut(pieces, stockLengthMm, SAW_KERF_MM, profile.sizeMm);
  const stocks = core.cutMap.length;

  return {
    pipeStocksCount: stocks,
    totalCuts: core.totalCuts,
    totalPurchasedPipeM: (stocks * stockLengthMm) / 1000,
    totalWasteM: Number((core.totalWasteMm / 1000).toFixed(2)),
    wastePercent: core.wastePercent,
    cutMap: core.cutMap
  };
}

// длинная деталь режется по длине доски
function splitLongPieces(pieces: CutPiece[], stockLengthMm: number): { pieces: CutPiece[]; joints: number } {
  const result: CutPiece[] = [];
  let joints = 0;
  pieces.forEach((piece) => {
    if (piece.length <= stockLengthMm) {
      result.push(piece);
      return;
    }
    const parts = Math.ceil(piece.length / stockLengthMm);
    joints += parts - 1;
    let rest = piece.length;
    for (let k = 1; k <= parts; k++) {
      const len = Math.min(rest, stockLengthMm);
      result.push({ id: piece.id, name: `${piece.name} (часть ${k}/${parts})`, length: len });
      rest -= len;
    }
  });
  return { pieces: result, joints };
}

function buildBoardSection(
  id: BoardCutSection['id'],
  title: string,
  rawPieces: CutPiece[],
  stockLengthMm: number,
  heightMm: number
): BoardCutSection {
  const { pieces, joints } = splitLongPieces(rawPieces, stockLengthMm);
  const core = optimizeCut(pieces, stockLengthMm, SAW_KERF_MM, heightMm);
  return {
    id,
    title,
    stockLengthMm,
    boardsCount: core.cutMap.length,
    totalCuts: core.totalCuts,
    totalWasteM: Number((core.totalWasteMm / 1000).toFixed(2)),
    wastePercent: core.wastePercent,
    joints,
    cutMap: core.cutMap
  };
}

// самая дешёвая длина доски
function cheapestSection(
  id: BoardCutSection['id'],
  title: string,
  pieces: CutPiece[],
  stockLengthsMm: number[],
  pricePerMeter: number,
  heightMm: number
): BoardCutSection {
  let best: BoardCutSection | null = null;
  let bestCost = Infinity;
  stockLengthsMm.forEach((stock) => {
    const section = buildBoardSection(id, title, pieces, stock, heightMm);
    const cost = section.boardsCount * (stock / 1000) * pricePerMeter;
    if (cost < bestCost) {
      bestCost = cost;
      best = section;
    }
  });
  return best ?? buildBoardSection(id, title, pieces, stockLengthsMm[0] ?? 3000, heightMm);
}

export function calculateBoardCutting(layout: StairLayoutResult, selection: CatalogSelection): BoardCuttingResult {
  const { tread, cladding } = selection;
  const boardPieces = layout.parts.boards.map(toPiece);
  return {
    treads: cheapestSection('treads', `Ступени ${tread.name}`, layout.parts.treads.map(toPiece), tread.stockLengthsMm, tread.pricePerMeter, tread.thicknessMm),
    cladding: boardPieces.length > 0
      ? cheapestSection('cladding', `Доска ${cladding.name}`, boardPieces, cladding.stockLengthsMm, cladding.pricePerMeter, cladding.thicknessMm)
      : null
  };
}
