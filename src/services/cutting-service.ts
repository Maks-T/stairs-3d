// @ts-ignore
import LinearCutter from 'linear-cutter';
import type { BoxElement, StairLayoutResult } from '@/types/stairs';
import { STEP_FRAME_CLEAR_SPAN_MM } from '@/constants/stairs-config';
import { PROFILE_TUBE_SIZE_MM } from '@/constants/stairs-config';

const STOCK_PIPE_LENGTH_MM = 6000;
const SAW_KERF_MM = 3;

export interface StockCutMapItem {
  stockIndex: number;
  stockLength: number;
  cuts: number;
  parts: Array<{ length: number; name: string }>;
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

function getPartCategoryName(lengthMm: number, frameWidthMm: number): string {
  if (Math.abs(lengthMm - Math.round(frameWidthMm)) <= 1) {
    return `Балка ${lengthMm} мм`;
  }
  if (lengthMm === STEP_FRAME_CLEAR_SPAN_MM) {
    return `Перемычка ${lengthMm} мм`;
  }
  return `Стойка ${lengthMm} мм`;
}

export function calculatePipeCutting(layout: StairLayoutResult): CuttingOptimizationResult {
  const partsMap = new Map<number, { count: number; name: string }>();

  layout.frameTubes.forEach((tube: BoxElement) => {
    const lengthMm = Math.round(Math.max(tube.width, tube.height, tube.depth));
    const partName = getPartCategoryName(lengthMm, layout.spacing.frameWidthMm);
    const current = partsMap.get(lengthMm) ?? { count: 0, name: partName };
    current.count++;
    partsMap.set(lengthMm, current);
  });

  const parts = Array.from(partsMap.entries()).map(([length, item]) => ({
    length,
    count: item.count,
    angleLeft: 0,
    angleRight: 0
  }));

  const stocks = [
    {
      length: STOCK_PIPE_LENGTH_MM,
      count: 99,
      angleLeft: 0,
      angleRight: 0
    }
  ];

  try {
    const cutter = new LinearCutter({
      parts,
      stocks,
      algorithms: ['matrix', 'greedy'],
      cutWidth: SAW_KERF_MM,
      solution: 0,
      minRemainMidline: 50,
      optimization: 8,
      height: 40,
      changeCutWidth: false,
      silent: true
    });

    cutter.calculate();
    const res = cutter.result;

    if (res && Array.isArray(res.list)) {
      const cutMap: StockCutMapItem[] = res.list.map((item: any, idx: number) => {
        const partsList = (item.cutMap || [])
          .filter((c: any) => c.type === 'part')
          .map((c: any) => ({
            length: Math.round(c.length),
            name: getPartCategoryName(Math.round(c.length), layout.spacing.frameWidthMm)
          }));

        const remainLength = item.remain?.total?.length ?? 0;
        const wastePercent = item.remain?.total?.percent ?? 0;

        return {
          stockIndex: idx + 1,
          stockLength: item.length || STOCK_PIPE_LENGTH_MM,
          cuts: item.cuts || partsList.length,
          parts: partsList,
          remainLength: Math.round(remainLength),
          wastePercent: Number(wastePercent.toFixed(1))
        };
      });

      const pipeStocksCount = cutMap.length;
      const totalPurchasedPipeM = (pipeStocksCount * STOCK_PIPE_LENGTH_MM) / 1000;
      const totalWasteM = Number(((res.remain?.total?.length || 0) / 1000).toFixed(2));
      const wastePercent = Number((res.remain?.total?.percent || 0).toFixed(1));

      return {
        pipeStocksCount,
        totalCuts: res.cuts || 0,
        totalPurchasedPipeM,
        totalWasteM,
        wastePercent,
        cutMap
      };
    }
  } catch (err) {
    console.warn('LinearCutter error fallback:', err);
  }

  const stockLengthM = STOCK_PIPE_LENGTH_MM / 1000;
  const fallbackCount = Math.max(1, Math.ceil(layout.totalPipeLengthM / stockLengthM));
  const totalPurchasedPipeM = fallbackCount * stockLengthM;
  const totalWasteM = Number((totalPurchasedPipeM - layout.totalPipeLengthM).toFixed(2));
  return {
    pipeStocksCount: fallbackCount,
    totalCuts: layout.frameTubes.length,
    totalPurchasedPipeM,
    totalWasteM,
    wastePercent: Number(((totalWasteM / totalPurchasedPipeM) * 100).toFixed(1)),
    cutMap: []
  };
}