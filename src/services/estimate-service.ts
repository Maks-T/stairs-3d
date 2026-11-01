
import { Estimate } from 'estimate';
import type { StairLayoutResult } from '@/types/stairs';
import type { BoardCuttingResult, CuttingOptimizationResult } from '@/services/cutting-service';
import { getActiveCladding, getActiveProfile, getActiveTread } from '@/catalog/stairs-catalog';

export interface FlatEstimateRow {
  id: string;
  name: string;
  unit: string;
  count: number;
  unitPrice: number;
  totalPrice: number;
  isGroup: boolean;
}

export function buildStairsEstimate(
  layout: StairLayoutResult,
  cuttingResult: CuttingOptimizationResult,
  boardCutting: BoardCuttingResult
): { root: Estimate; rows: FlatEstimateRow[]; grandTotal: number } {
  const profile = getActiveProfile();
  const tread = getActiveTread();
  const cladding = getActiveCladding();
  const treadBoards = boardCutting.treads;
  const claddingBoards = boardCutting.cladding?.boardsCount ?? 0;
  const claddingStock = boardCutting.cladding?.stockLengthMm ?? cladding.stockLengthsMm[0] ?? 3000;

  const root = new Estimate({
    id: 'stair_root',
    name: 'Лестница приставная Oliver Deck',
    unit: 'компл.',
    count: 1
  });

  const deckGroup = root.add({
    id: 'group_decking',
    name: 'Настил и ступени',
    unit: 'компл.'
  });

  deckGroup.add({
    id: 'item_treads',
    name: `${tread.name}, ${tread.thicknessMm}×${tread.depthMm} мм (доска ${treadBoards.stockLengthMm / 1000} м)`,
    unit: 'шт',
    count: treadBoards.boardsCount,
    value: Math.round((tread.pricePerMeter * treadBoards.stockLengthMm) / 1000)
  });

  if (claddingBoards > 0) {
    deckGroup.add({
      id: 'item_cladding',
      name: `Заборная доска ${cladding.name} мм (доска ${claddingStock / 1000} м)`,
      unit: 'шт',
      count: claddingBoards,
      value: Math.round((cladding.pricePerMeter * claddingStock) / 1000)
    });
  }

  const frameGroup = root.add({
    id: 'group_frame',
    name: 'Металлокаркас',
    unit: 'компл.'
  });

  frameGroup.add({
    id: 'item_pipes',
    name: `Профильная ${profile.name.toLowerCase()} мм (хлыст ${profile.stockLengthMm / 1000} м)`,
    unit: 'шт',
    count: cuttingResult.pipeStocksCount,
    value: profile.pricePerStock
  });

  const hardwareGroup = root.add({
    id: 'group_hardware',
    name: 'Крепеж и фурнитура',
    unit: 'компл.'
  });

  hardwareGroup.add({
    id: 'item_screws_treads',
    name: `Саморезы для ДПК ${layout.fasteners.treads.spec} (уп. 100 шт)`,
    unit: 'уп.',
    count: layout.fasteners.treads.boxesCount,
    value: 650
  });

  if (layout.fasteners.risersAndCladding.countRaw > 0) {
    hardwareGroup.add({
      id: 'item_screws_cladding',
      name: `Саморезы ${layout.fasteners.risersAndCladding.spec} (уп. 100 шт)`,
      unit: 'уп.',
      count: layout.fasteners.risersAndCladding.boxesCount,
      value: 490
    });
  }

  hardwareGroup.add({
    id: 'item_brackets',
    name: 'Монтажные уголки усиленные',
    unit: 'шт',
    count: layout.stepCount * 4,
    value: 65
  });

  const rows: FlatEstimateRow[] = [];

  const traverse = (container: any) => {
    const el = container.element;
    const isRoot = el.id === 'stair_root';

    if (!isRoot) {
      rows.push({
        id: el.id,
        name: el.name,
        unit: el.unit,
        count: el.count,
        unitPrice: Math.round(el.unitPrice.total || el.value || 0),
        totalPrice: Math.round(el.price.total || 0),
        isGroup: el.role === 'group'
      });
    }

    if (container.children) {
      Object.values(container.children).forEach((child: any) => traverse(child));
    }
  };

  traverse(root);
  const grandTotal = Math.round(root.element.price.total || 0);

  return { root, rows, grandTotal };
}


