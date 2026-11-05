import { concreteLayers, type BoxElement, type StairLayoutResult } from '@calculation/stairs';
import { dimLinear, line, type Entity } from 'cad-blueprint';
import { DRAW, PAPER } from './drawing-style';
import { levelAxis } from './level-axis';
import { L, type StairDrawing } from './stair-theme';

type PrismKind = 'frame' | 'riser' | 'cladding' | 'tread';

interface Prism {
  id: string;
  kind: PrismKind;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
  cut: boolean;
}

const CUT_EPS_MM = 0.5;

function toPrism(box: BoxElement, kind: PrismKind): Prism {
  let x0: number;
  let x1: number;
  let z0: number;
  let z1: number;

  if (box.polygonXZ && box.polygonXZ.length > 0) {
    const xs = box.polygonXZ.map((p) => p[0]);
    const zs = box.polygonXZ.map((p) => p[1]);
    x0 = Math.min(...xs);
    x1 = Math.max(...xs);
    z0 = Math.min(...zs);
    z1 = Math.max(...zs);
  } else {
    const rotated = Math.abs(Math.abs(box.rotationY ?? 0) - Math.PI / 2) < 0.01;
    const xExt = rotated ? box.depth : box.width;
    const zExt = rotated ? box.width : box.depth;
    x0 = box.x - xExt / 2;
    x1 = box.x + xExt / 2;
    z0 = box.z - zExt / 2;
    z1 = box.z + zExt / 2;
  }

  return {
    id: box.id,
    kind,
    x0,
    x1,
    y0: box.y - box.height / 2,
    y1: box.y + box.height / 2,
    z0,
    z1,
    cut: z0 <= CUT_EPS_MM && z1 > CUT_EPS_MM
  };
}

// Разрез А-А у стены (z = 0), вид от стены. X — вдоль марша, Y — вверх.
export function buildSectionView(d: StairDrawing, layout: StairLayoutResult): Entity[] {
  const { frameTubes, treads, risers, cladding, stepCount, stepHeight, totalHeight } = layout;
  const a = (mm: number): number => d.a(mm);

  const prisms: Prism[] = [
    ...frameTubes.map((t) => toPrism(t, 'frame')),
    ...treads.map((t) => toPrism(t, 'tread')),
    ...risers.map((t) => toPrism(t, 'riser')),
    ...cladding.map((t) => toPrism(t, 'cladding'))
  ];
  const minX = Math.min(...prisms.map((p) => p.x0));
  const maxX = Math.max(...prisms.map((p) => p.x1));

  const out: (Entity | null)[] = [line([minX - a(3), 0], [maxX + a(3), 0], { layer: L.ground })];

  // дальние детали первыми
  const order: Record<PrismKind, number> = { frame: 0, cladding: 1, riser: 2, tread: 3 };
  const sorted = [...prisms].sort((p, q) => {
    if (p.cut !== q.cut) return p.cut ? 1 : -1;
    if (Math.abs(p.z0 - q.z0) > 0.5) return q.z0 - p.z0;
    return order[p.kind] - order[q.kind];
  });

  const drawPrism = (p: Prism): Entity | null => {
    const w = p.x1 - p.x0;
    const h = p.y1 - p.y0;
    if (p.cut) return d.box(p.kind === 'frame' ? L.cutSteel : L.cutBoard, p.x0, p.y0, w, h, 'hatch');
    const fill = p.kind === 'riser' || p.kind === 'cladding' ? DRAW.riser : p.kind === 'tread' ? DRAW.treadFill : DRAW.fill;
    return d.box(p.kind === 'frame' ? L.outline : L.thin, p.x0, p.y0, w, h, fill);
  };

  out.push(...sorted.filter((p) => !p.cut).map(drawPrism));

  // бетон в сечении
  if (layout.supportMode === 'concrete') {
    for (const layer of concreteLayers(layout.module, frameTubes, stepCount, stepHeight)) {
      out.push(d.box(L.concrete, layer.minX, 0, layer.maxX - layer.minX, layer.topY, 'hatch', { color: DRAW.concrete, lineWeight: 0 }));
    }
  }

  out.push(...sorted.filter((p) => p.cut).map(drawPrism));

  // ширины по уровням (одинаковые не повторяются), сверху вниз
  const levels: { level: number; minX: number; maxX: number }[] = [];
  for (let level = 1; level <= stepCount; level++) {
    const topY = level * stepHeight;
    const atLevel = treads.filter((t) => Math.abs(t.y + layout.module.treadThickness / 2 - topY) < 1).map((t) => toPrism(t, 'tread'));
    if (atLevel.length === 0) continue;
    levels.push({ level, minX: Math.min(...atLevel.map((p) => p.x0)), maxX: Math.max(...atLevel.map((p) => p.x1)) });
  }
  const widths: { minX: number; maxX: number }[] = [];
  [...levels].reverse().forEach((lv) => {
    if (!widths.some((w) => Math.abs(w.minX - lv.minX) < 0.5 && Math.abs(w.maxX - lv.maxX) < 0.5)) widths.push(lv);
  });
  widths.forEach((w, i) => {
    out.push(dimLinear([w.minX, totalHeight], [w.maxX, totalHeight], { offset: a(PAPER.dimFirst + i * PAPER.dimStep), layer: L.dimensions }));
  });

  out.push(dimLinear([minX, 0], [minX, totalHeight], { direction: 'vertical', offset: a(14), layer: L.dimensions }));

  const axisX = maxX + a(16);
  out.push(...levelAxis(d, axisX, stepCount, stepHeight, (i) => (i === 0 ? maxX + a(1) : (levels.find((l) => l.level === i)?.maxX ?? maxX) + a(1))));

  return d.withTitle(out.filter((e): e is Entity => e !== null), 'Разрез А-А (вид от стены)');
}
