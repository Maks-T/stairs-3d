import { STEP_NODE, type StairLayoutResult } from '@calculation/stairs';
import { dimChain, dimLinear, line, polygon, type Entity, type Point2 } from 'cad-blueprint';
import { PAPER } from './drawing-style';
import { L, type StairDrawing } from './stair-theme';
import { getLevelSectionLetter } from './section-labels';
import { levelAxis } from './level-axis';

// Вид сбоку. Начало координат — передний нижний угол марша, X — вглубь, Y — вверх.
export function buildSideView(d: StairDrawing, layout: StairLayoutResult): Entity[] {
  const { stepCount, stepHeight, totalDepth, totalHeight, risers, module: m } = layout;
  const a = (mm: number): number => d.a(mm);
  const T = m.tube;
  const M = m.moduleDepth;
  const concrete = layout.supportMode === 'concrete';
  const beamBottom = (level: number): number => level * stepHeight - m.treadThickness - T;
  const tierStartX = (level: number): number => (stepCount - level) * M;
  const out: (Entity | null)[] = [line([-a(4), 0], [totalDepth + a(4), 0], { layer: L.ground })];
  const post = (x: number, top: number, bottom: number): Entity | null => d.box(L.outline, x, bottom, T, top - bottom);

  if (concrete) {
    // бетон: как разрез Е-Е
    const outline: Point2[] = [[0, 0]];
    for (let level = stepCount; level >= 1; level--) {
      const x = tierStartX(level) + M - T;
      outline.push([outline[outline.length - 1]?.[0] ?? 0, beamBottom(level)], [x, beamBottom(level)]);
    }
    outline.push([tierStartX(1) + M - T, 0]);
    out.push(polygon(outline, { layer: L.concrete, fill: 'hatch' }));
    out.push(d.note([tierStartX(1) / 2 + M / 2, beamBottom(1) / 2], 'Бетон', { height: 3.5, anchor: 'middle-center' }));
    for (let level = 1; level <= stepCount; level++) {
      out.push(post(tierStartX(level) + M - T, beamBottom(level), level === 1 ? T : beamBottom(level - 1)));
    }
    out.push(d.box(L.cutSteel, tierStartX(1) + M - T, 0, T, T, 'hatch'));
  } else {
    // стойки от земли
    out.push(post(0, beamBottom(stepCount), 0));
    for (let level = stepCount; level >= 1; level--) out.push(post(tierStartX(level) + M - T, beamBottom(level), 0));
  }

  // каркасы ярусов
  for (let level = 1; level <= stepCount; level++) {
    const x = tierStartX(level);
    const y = beamBottom(level);
    out.push(
      d.box(L.outline, x, y, M, T),
      line([x + T, y], [x + T, y + T], { layer: L.thin }),
      line([x + M - T, y], [x + M - T, y + T], { layer: L.thin })
    );
  }

  // ступени и их глубина
  for (let i = 0; i < stepCount; i++) {
    const top = (i + 1) * stepHeight;
    const x = (stepCount - 1 - i) * M;
    out.push(d.box(L.cutBoard, x, top - m.treadThickness, m.treadDepth, m.treadThickness, 'hatch'));
    out.push(dimLinear([x, top], [x + m.treadDepth, top], { layer: L.dimensions, offset: a(5) }));
  }

  if (risers.length > 0) {
    const riserH = stepHeight - m.treadThickness - STEP_NODE.RISER_TOP_CLEARANCE_MM;
    for (let i = 0; i < stepCount; i++) {
      const x = (stepCount - i) * M;
      const top = (i + 1) * stepHeight - m.treadThickness - STEP_NODE.RISER_TOP_CLEARANCE_MM;
      out.push(d.box(L.riser, x, top - riserH, m.boardThickness, riserH, '#cbd5e1'));
    }
  }

  // ось отметок справа
  const axisX = totalDepth + a(16);
  out.push(...levelAxis(d, axisX, stepCount, stepHeight, (i) => (i === 0 ? totalDepth + a(1) : (stepCount - i) * M + m.treadDepth + a(1))));

  // высоты слева
  const topY = totalHeight;
  out.push(
    dimLinear([0, 0], [0, topY], { direction: 'vertical', offset: a(24), layer: L.dimensions }),
    dimChain([[0, topY - stepHeight], [0, topY - m.treadThickness], [0, topY]], { direction: 'vertical', offset: a(12), layer: L.dimensions })
  );

  // глубины снизу
  for (let r = 0; r < stepCount; r++) {
    const x1 = r * M + T;
    out.push(dimLinear([x1, 0], [x1 + m.clearSpan, 0], { offset: -a(PAPER.dimFirst), layer: L.dimensions }));
  }
  out.push(
    dimLinear([0, 0], [M, 0], { offset: -a(PAPER.dimFirst + PAPER.dimStep), layer: L.dimensions }),
    dimLinear([0, 0], [totalDepth, 0], { offset: -a(PAPER.dimFirst + 2 * PAPER.dimStep), layer: L.dimensions })
  );

  // свес носика верхней ступени
  const noseX = M + (risers.length > 0 ? m.boardThickness : 0);
  if (m.treadDepth - noseX > 0.5) {
    out.push(dimLinear([noseX, topY - m.treadThickness], [m.treadDepth, topY - m.treadThickness], { offset: -a(4), layer: L.dimensions }));
  }

  // разрез А-А
  out.push(...d.sectionCut([0, topY + a(14)], 'right', 'А', -1), ...d.sectionCut([0, -a(9)], 'right', 'А', 1));

  // секущие плоскости ярусов и Б-Б
  const beamMid = (level: number): number => level * stepHeight - m.treadThickness - T / 2;
  const leftX = -a(34);
  const cuts: { label: string; y: number; rightX: number }[] = [];
  for (let level = stepCount; level >= 1; level--) {
    cuts.push({ label: getLevelSectionLetter(level), y: beamMid(level), rightX: (stepCount - level) * M + m.treadDepth + a(16) });
  }
  cuts.push({ label: 'Б', y: Math.min(30, beamBottom(1) / 2), rightX: totalDepth + a(4) });
  for (const c of cuts) out.push(...d.sectionCut([leftX, c.y], 'down', c.label, -1), ...d.sectionCut([c.rightX, c.y], 'down', c.label, 1));

  return d.withTitle(out.filter((e): e is Entity => e !== null), 'Вид сбоку');
}

