import { isBaseRail, isPost, treadOutline, tubeOutline, uniqueSorted, type Pt, type StairLayoutResult } from '@calculation/stairs';
import { dimLinear, line, polygon, type Entity } from 'cad-blueprint';
import { DRAW, PAPER } from './drawing-style';
import { planBounds, planFaintBeams, planOverallDims, planPoint, planTreads } from './plan-geometry';
import { L, type StairDrawing } from './stair-theme';

// План расположения стоек (сечение Б-Б).
export function buildPlanView(d: StairDrawing, layout: StairLayoutResult): Entity[] {
  const { frameTubes, treads } = layout;
  const T = layout.module.tube;
  const a = (mm: number): number => d.a(mm);

  const posts = frameTubes.filter(isPost);
  const beams = frameTubes.filter((t) => !isPost(t) && !isBaseRail(t));
  const rails = frameTubes.filter(isBaseRail);
  // на бетоне стойки верхних коробок выше сечения
  const cutPosts = posts.filter((p) => p.y - p.height / 2 <= T + 1);
  const upperPosts = posts.filter((p) => !cutPosts.includes(p));

  const all: Pt[] = [];
  treads.forEach((t) => all.push(...treadOutline(t)));
  frameTubes.forEach((t) => all.push(...tubeOutline(t)));
  const b = planBounds(all);

  const out: (Entity | null)[] = [...planTreads(layout), ...planFaintBeams(beams)];
  rails.forEach((r) => out.push(polygon(tubeOutline(r).map(planPoint), { layer: L.cutSteel, fill: 'hatch' })));
  upperPosts.forEach((p) => out.push(d.box(L.hidden, p.x - T / 2, -p.z - T / 2, T, T)));
  cutPosts.forEach((p) => out.push(d.box(L.outline, p.x - T / 2, -p.z - T / 2, T, T)));

  if (posts.length > 0) {
    const frontZ = Math.max(...posts.map((p) => p.z));
    const rightX = Math.max(...posts.map((p) => p.x));

    // шаг стоек переднего ряда, снизу
    const rowX = uniqueSorted(posts.filter((p) => Math.abs(p.z - frontZ) < 1).map((p) => p.x));
    const baseY = -(frontZ + T / 2);
    const lineY = -b.maxZ - a(PAPER.dimFirst);
    for (let i = 0; i < rowX.length - 1; i++) {
      const x1 = rowX[i] ?? 0;
      const x2 = rowX[i + 1] ?? 0;
      if (x2 - x1 < 12) continue;
      out.push(dimLinear([x1, baseY], [x2, baseY], { at: [0, lineY], layer: L.dimensions }));
    }

    // шаг стоек правого ряда, справа
    const colZ = uniqueSorted(posts.filter((p) => Math.abs(p.x - rightX) < 1).map((p) => p.z));
    const baseX = rightX + T / 2;
    const lineX = b.maxX + a(PAPER.dimFirst);
    for (let i = 0; i < colZ.length - 1; i++) {
      const z1 = colZ[i] ?? 0;
      const z2 = colZ[i + 1] ?? 0;
      if (z2 - z1 < 12) continue;
      out.push(dimLinear([baseX, -z1], [baseX, -z2], { direction: 'vertical', at: [lineX, 0], layer: L.dimensions }));
    }
  }

  out.push(...planOverallDims(d, b));

  // условные обозначения
  const icon = a(4);
  let y = -b.maxZ - a(PAPER.dimFirst + 14);
  const row = (symbol: (Entity | null)[], label: string): void => {
    out.push(...symbol, d.note([b.minX + icon + a(3), y + icon / 2], label, { anchor: 'middle-left' }));
    y -= a(7);
  };
  row([d.box(L.outline, b.minX, y, icon, icon)], `Стойка ${T}×${T} мм в сечении, ${cutPosts.length} шт.`);
  if (upperPosts.length > 0) row([d.box(L.hidden, b.minX, y, icon, icon)], `Стойка верхних коробок (выше сечения), ${upperPosts.length} шт.`);
  if (rails.length > 0) row([d.box(L.cutSteel, b.minX, y + icon * 0.15, icon, icon * 0.7, 'hatch')], 'Нижняя обвязка по земле');
  row([line([b.minX, y + icon / 2], [b.minX + icon, y + icon / 2], { layer: L.faintBeam, color: DRAW.beamFaint })], 'Балки каркаса под настилом (условно)');

  return d.withTitle(out.filter((e): e is Entity => e !== null), 'План расположения стоек (сечение Б-Б)');
}
