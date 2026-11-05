import { dimChain, type Entity } from 'cad-blueprint';
import { L, type StairDrawing } from './stair-theme';

/**
 * Ось высотных отметок: цепочка размеров между уровнями по вертикали `axisX` и отметки `0.000`, `+170`, …
 * `startX(i)` — откуда тянется выноска к отметке уровня `i`.
 */
export function levelAxis(d: StairDrawing, axisX: number, stepCount: number, stepHeight: number, startX: (level: number) => number): Entity[] {
  const out: Entity[] = [];
  if (stepCount > 0) {
    const points = Array.from({ length: stepCount + 1 }, (_, i) => [axisX, i * stepHeight] as [number, number]);
    out.push(dimChain(points, { direction: 'vertical', offset: 0, layer: L.dimensions }));
  }
  const symbolX = axisX + d.a(8);
  for (let i = 0; i <= stepCount; i++) {
    const value = i === 0 ? '0.000' : `+${Math.round(i * stepHeight)}`;
    out.push(...d.levelMark(startX(i), i * stepHeight, symbolX, value, `Уровень ${i}`));
  }
  return out;
}
