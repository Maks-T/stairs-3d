import type { StairLayoutResult } from '@calculation/stairs';
import type { CadDocument } from 'cad-blueprint';
import { buildFastenersView } from './fasteners-view-builder';
import { buildLevelsView } from './levels-view-builder';
import { buildPlanView } from './plan-view-builder';
import { buildSectionView } from './section-view-builder';
import { buildSideView } from './side-view-builder';
import { StairDrawing, type StairDrawingOptions } from './stair-theme';
import type { DrawingViewOption, DrawingViewType } from './types';

/** Листы документа: id листа = вид в `DrawingsView`. */
export const DRAWING_VIEWS: readonly DrawingViewOption[] = [
  { id: 'side', title: 'Вид сбоку' },
  { id: 'front', title: 'Разрез А-А' },
  { id: 'plan', title: 'План стоек (Б-Б)' },
  { id: 'levels', title: 'Каркасы по уровням' },
  { id: 'fasteners', title: 'Точки крепления' }
];

const BUILDERS: Record<DrawingViewType, (d: StairDrawing, layout: StairLayoutResult) => ReturnType<typeof buildSideView>> = {
  side: buildSideView,
  front: buildSectionView,
  plan: buildPlanView,
  levels: buildLevelsView,
  fasteners: buildFastenersView
};

/**
 * Все чертежи лестницы одним документом `cad-blueprint`: пять листов (`side`, `front`, `plan`, `levels`, `fasteners`),
 * общие слои, стили и блоки условных знаков. Из него же — SVG, DXF, компактный JSON для БД и `.vcad`.
 */
export function buildStairDrawings(layout: StairLayoutResult, options: StairDrawingOptions = {}): CadDocument {
  const d = new StairDrawing(options);
  for (const view of DRAWING_VIEWS) d.doc.addSheet(view.title, BUILDERS[view.id](d, layout), view.id);
  return d.doc;
}
