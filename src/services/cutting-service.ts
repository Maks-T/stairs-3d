// @ts-ignore
import LinearCutter from 'linear-cutter';
import type { BoxElement, StairLayoutResult } from '@/types/stairs';
import {
  CLADDING_SAW_KERF_MM,
  STEP_FRAME_CLEAR_SPAN_MM
} from '@/constants/stairs-config';
import { getActiveCladding, getActiveProfile, getActiveTread } from '@/catalog/stairs-catalog';
import { isPost, tubeLengthMm } from '@/core/drawings/plan-geometry';

const SAW_KERF_MM = 3;

export interface StockCutMapItem {
  stockIndex: number;
  stockLength: number;
  cuts: number;
  /** tubeId: id элемента модели (труба, ступень, доска) для подсветки в 3D */
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

/** Результат раскроя досок одного вида (ступени или подступенки с боковой зашивкой) */
export interface BoardCutSection {
  id: 'treads' | 'cladding';
  title: string;
  stockLengthMm: number;
  boardsCount: number;
  totalCuts: number;
  totalWasteM: number;
  wastePercent: number;
  /** сколько стыков пришлось сделать из-за деталей длиннее доски */
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

/** Запасной раскрой (первая подходящая по убыванию), если библиотека не отработала */
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

/**
 * Линейный раскрой заготовок одной длины через linear-cutter.
 * Каждому куску на карте достаётся конкретный элемент модели (по длине), чтобы его можно было подсветить.
 */
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
        // linear-cutter склеивает одинаковые хлысты в один элемент с полем count: разворачиваем обратно
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

function getTubeName(tube: BoxElement, lengthMm: number, frameWidthMm: number): string {
  if (tube.id.startsWith('rail-')) return `Нижняя обвязка ${lengthMm} мм`;
  if (tube.polygonXZ) return `Диагональ ${lengthMm} мм`;
  if (isPost(tube)) return `Стойка ${lengthMm} мм`;
  if (Math.abs(lengthMm - Math.round(frameWidthMm)) <= 1) return `Балка ${lengthMm} мм`;
  if (lengthMm === STEP_FRAME_CLEAR_SPAN_MM) return `Перемычка ${lengthMm} мм`;
  return `Балка ${lengthMm} мм`;
}

export function calculatePipeCutting(layout: StairLayoutResult): CuttingOptimizationResult {
  const profile = getActiveProfile();
  const stockLengthMm = profile.stockLengthMm;

  const pieces: CutPiece[] = layout.frameTubes.map((tube: BoxElement) => {
    const length = Math.round(tubeLengthMm(tube));
    return { id: tube.id, name: getTubeName(tube, length, layout.spacing.frameWidthMm), length };
  });

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

/** Деталь длиннее доски режется на части по длине доски (с остатком): на стыках нужен подступенок или закладная */
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
  const core = optimizeCut(pieces, stockLengthMm, CLADDING_SAW_KERF_MM, heightMm);
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

/**
 * Раскрой досок: ступени (длина доски выбирается по минимальной стоимости закупки)
 * и подступенки с боковой зашивкой из выбранной заборной доски (длина тоже по минимальной цене).
 */
export function calculateBoardCutting(layout: StairLayoutResult): BoardCuttingResult {
  const tread = getActiveTread();

  const treadPieces: CutPiece[] = layout.treads.map((t: BoxElement) => {
    const length = Math.round(t.width);
    return { id: t.id, name: `Ступень ${length} мм`, length };
  });

  let bestTreads: BoardCutSection | null = null;
  let bestCost = Infinity;
  tread.stockLengthsMm.forEach((stock) => {
    const section = buildBoardSection('treads', `Ступени ${tread.name}`, treadPieces, stock, tread.thicknessMm);
    const cost = section.boardsCount * (stock / 1000) * tread.pricePerMeter;
    if (cost < bestCost) {
      bestCost = cost;
      bestTreads = section;
    }
  });

  const claddingPieces: CutPiece[] = [
    ...layout.cladding.map((box: BoxElement) => {
      // длина доски: большая из сторон в плане (боковые подступенки у угловых маршей идут по глубине, фронтальные по ширине)
      const length = Math.round(Math.max(box.width, box.depth));
      return { id: box.id, name: `Боковая доска ${length} мм`, length };
    }),
    ...layout.risers.map((box: BoxElement) => {
      const length = Math.round(Math.max(box.width, box.depth));
      return { id: box.id, name: `Подступенок ${length} мм`, length };
    })
  ];

  let bestCladding: BoardCutSection | null = null;
  if (claddingPieces.length > 0) {
    const board = getActiveCladding();
    let bestCladdingCost = Infinity;
    board.stockLengthsMm.forEach((stock) => {
      const section = buildBoardSection('cladding', `Доска ${board.name}`, claddingPieces, stock, board.thicknessMm);
      const cost = section.boardsCount * (stock / 1000) * board.pricePerMeter;
      if (cost < bestCladdingCost) {
        bestCladdingCost = cost;
        bestCladding = section;
      }
    });
  }

  return {
    treads: bestTreads ?? buildBoardSection('treads', `Ступени ${tread.name}`, treadPieces, 3000, tread.thicknessMm),
    cladding: bestCladding
  };
}
