import { boundsOf, treadOutline, tubeOutline, type BoxElement, type PlanBounds, type Pt, type StairLayoutResult } from '@calculation/stairs';
import { dimLinear, polygon, type Entity, type Point2 } from 'cad-blueprint';
import { DRAW, PAPER } from './drawing-style';
import { L, type StairDrawing } from './stair-theme';

/**
 * План (вид сверху): x — по оси марша, z — от стены. На чертеже Y = −z, чтобы стена была сверху, как в прежних SVG.
 */
export const planPoint = ([x, z]: Pt | readonly [number, number]): Point2 => [x, z === 0 ? 0 : -z];

export function planBounds(points: Pt[]): PlanBounds {
  return boundsOf(points);
}

/** Ступени на плане (снизу вверх по высоте, чтобы верхние перекрывали нижние). */
export function planTreads(layout: StairLayoutResult): Entity[] {
  return [...layout.treads]
    .sort((p, q) => p.y - q.y)
    .map((t) => polygon(treadOutline(t).map(planPoint), { layer: L.tread, fill: DRAW.treadFill }));
}

/** Балки каркаса под настилом — условно, штриховыми. */
export function planFaintBeams(beams: BoxElement[]): Entity[] {
  return beams.map((t) => polygon(tubeOutline(t).map(planPoint), { layer: L.faintBeam }));
}

/** Габаритные размеры плана: ширина сверху (у стены), глубина слева. */
export function planOverallDims(d: StairDrawing, b: PlanBounds): Entity[] {
  return [
    dimLinear([b.minX, -b.minZ], [b.maxX, -b.minZ], { offset: d.a(PAPER.dimFirst), layer: L.dimensions }),
    dimLinear([b.minX, -b.minZ], [b.minX, -b.maxZ], { direction: 'vertical', offset: d.a(PAPER.dimFirst + 2), layer: L.dimensions })
  ];
}
