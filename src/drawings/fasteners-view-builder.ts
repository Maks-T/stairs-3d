import { CORNER, FASTENERS, isBaseRail, isPost, treadOutline, tubeOutline, type Pt, type StairLayoutResult } from '@calculation/stairs';
import type { Entity } from 'cad-blueprint';
import { DRAW, PAPER } from './drawing-style';
import { planBounds, planFaintBeams, planOverallDims, planTreads } from './plan-geometry';
import type { StairDrawing } from './stair-theme';

// Схема точек крепления ступеней (вид сверху).
export function buildFastenersView(d: StairDrawing, layout: StairLayoutResult): Entity[] {
  const { frameTubes, treads, fastenerPoints, fasteners } = layout;
  const a = (mm: number): number => d.a(mm);
  const beams = frameTubes.filter((t) => !isPost(t) && !isBaseRail(t));

  const all: Pt[] = [];
  treads.forEach((t) => all.push(...treadOutline(t)));
  beams.forEach((t) => all.push(...tubeOutline(t)));
  const b = planBounds(all);

  const out: Entity[] = [...planTreads(layout), ...planFaintBeams(beams)];
  for (const p of fastenerPoints.filter((f) => f.type === 'tread')) {
    out.push(d.fastener(p.id.includes('-miter') ? 'cross' : 'plus', [p.x, -p.z]));
  }
  out.push(...planOverallDims(d, b));

  const { treadsCount, risersCount, sideCladdingCount } = fasteners.breakdown;
  const x = b.minX;
  let y = -b.maxZ - a(PAPER.dimFirst + 6);
  const textX = x + a(6);
  out.push(
    d.fastener('plus', [x + a(2.5), y]),
    d.note([textX, y], `Саморез ${FASTENERS.TREAD_SPEC}: ${FASTENERS.TREAD_FROM_NOSE_MM} мм от носика и ${FASTENERS.TREAD_FROM_BACK_MM} мм от заднего края ступени, на осях поперечин`, { anchor: 'middle-left' })
  );
  y -= a(7);
  out.push(
    d.fastener('cross', [x + a(2.5), y]),
    d.note([textX, y], `То же у торцовки 45°: ${CORNER.SCREW_MITER_OFFSET_MM} мм от линии шва`, { anchor: 'middle-left' })
  );
  y -= a(8);
  out.push(
    d.note(
      [x, y],
      `Ступени: ${treadsCount} шт. Подступенки: ${risersCount} шт., боковая зашивка: ${sideCladdingCount} шт. ` +
        `(${FASTENERS.BOARD_SPEC}, по 2 на стойку, ${FASTENERS.BOARD_EDGE_MM} мм от краёв доски)`,
      { anchor: 'middle-left', color: DRAW.dimText }
    )
  );

  return d.withTitle(out, 'Схема точек крепления ступеней');
}
