import { concreteLayers, type BoxElement, type StairLayoutResult } from '@calculation/stairs';
import { DRAW } from './drawing-style';
import {
  createSvgDefs,
  createSvgHeader,
  renderDimensionLine,
  renderLevelAxis,
  renderLevelMark,
  renderLine,
  renderTitle
} from './svg-primitives';

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

const MARGIN = { top: 190, right: 200, bottom: 100, left: 150 };
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

// разрез А-А у стены (z = 0), вид от стены
export function generateSectionViewSvg(layout: StairLayoutResult): string {
  const { frameTubes, treads, risers, cladding, stepCount, stepHeight, totalHeight } = layout;

  const prisms: Prism[] = [
    ...frameTubes.map((t) => toPrism(t, 'frame')),
    ...treads.map((t) => toPrism(t, 'tread')),
    ...risers.map((t) => toPrism(t, 'riser')),
    ...cladding.map((t) => toPrism(t, 'cladding'))
  ];

  const minX = Math.min(...prisms.map((p) => p.x0));
  const maxX = Math.max(...prisms.map((p) => p.x1));
  const drawingW = maxX - minX;

  const width = drawingW + MARGIN.left + MARGIN.right;
  const height = totalHeight + MARGIN.top + MARGIN.bottom;
  const ox = MARGIN.left - minX;
  const baseY = MARGIN.top + totalHeight;
  const px = (x: number): number => x + ox;
  const py = (y: number): number => baseY - y;

  const svg: string[] = [
    createSvgHeader(width, height, `0 0 ${width} ${height}`),
    createSvgDefs(),
    renderTitle(width / 2, DRAW.titleY, 'Разрез А-А (вид от стены)'),
    renderLine(px(minX) - 30, baseY, px(maxX) + 30, baseY, DRAW.ground, DRAW.strokeBeam)
  ];

  // дальние детали первыми
  const order: Record<PrismKind, number> = { frame: 0, cladding: 1, riser: 2, tread: 3 };
  const sorted = [...prisms].sort((a, b) => {
    if (a.cut !== b.cut) return a.cut ? 1 : -1;
    if (Math.abs(a.z0 - b.z0) > 0.5) return b.z0 - a.z0;
    return order[a.kind] - order[b.kind];
  });

  const drawPrism = (p: Prism): void => {
    const x = px(p.x0);
    const y = py(p.y1);
    const w = p.x1 - p.x0;
    const h = p.y1 - p.y0;
    const outline = `x="${x}" y="${y}" width="${w}" height="${h}"`;

    if (p.cut) {
      const hatch = p.kind === 'frame' ? 'url(#steel-hatch)' : 'url(#board-hatch)';
      svg.push(
        `<rect ${outline} fill="${DRAW.fill}" stroke="none" />`,
        `<rect ${outline} fill="${hatch}" stroke="${DRAW.line}" stroke-width="${DRAW.strokeBeam}" />`
      );
      return;
    }

    const fill = p.kind === 'riser' || p.kind === 'cladding'
      ? DRAW.riser
      : p.kind === 'tread' ? DRAW.treadFill : DRAW.fill;
    svg.push(`<rect ${outline} fill="${fill}" stroke="${DRAW.line}" stroke-width="${DRAW.strokeOutline}" />`);
  };

  sorted.filter((p) => !p.cut).forEach(drawPrism);

  // бетон в сечении
  if (layout.supportMode === 'concrete') {
    concreteLayers(layout.module, frameTubes, stepCount, stepHeight).forEach((layer) => {
      svg.push(
        `<rect x="${px(layer.minX)}" y="${py(layer.topY)}" width="${layer.maxX - layer.minX}" height="${layer.topY}" fill="${DRAW.concrete}" stroke="none" />`
      );
    });
  }

  sorted.filter((p) => p.cut).forEach(drawPrism);

  const levels: Array<{ level: number; minX: number; maxX: number; topY: number }> = [];
  for (let level = 1; level <= stepCount; level++) {
    const topY = level * stepHeight;
    const atLevel = treads.filter((t) => Math.abs(t.y + layout.module.treadThickness / 2 - topY) < 1).map((t) => toPrism(t, 'tread'));
    if (atLevel.length === 0) continue;
    levels.push({
      level,
      minX: Math.min(...atLevel.map((p) => p.x0)),
      maxX: Math.max(...atLevel.map((p) => p.x1)),
      topY
    });
  }

  const topEdgeY = py(totalHeight) - layout.module.treadThickness;
  const widthDims: Array<{ minX: number; maxX: number }> = [];
  [...levels].reverse().forEach((lv) => {
    if (!widthDims.some((d) => Math.abs(d.minX - lv.minX) < 0.5 && Math.abs(d.maxX - lv.maxX) < 0.5)) {
      widthDims.push({ minX: lv.minX, maxX: lv.maxX });
    }
  });
  widthDims.forEach((d, i) => {
    svg.push(renderDimensionLine({
      x1: px(d.minX), y1: topEdgeY, x2: px(d.maxX), y2: topEdgeY,
      text: String(Math.round(d.maxX - d.minX)), offset: -(26 + i * 26), orientation: 'horizontal'
    }));
  });

  svg.push(renderDimensionLine({
    x1: px(minX), y1: baseY, x2: px(minX), y2: py(totalHeight),
    text: String(Math.round(totalHeight)), offset: -45, orientation: 'vertical', textSide: 'start'
  }));

  const axisX = px(maxX) + 55;
  const symbolX = axisX + 25;
  svg.push(renderLevelAxis(axisX, baseY, stepCount, stepHeight));
  for (let i = 0; i <= stepCount; i++) {
    const lvlY = py(i * stepHeight);
    const lv = levels.find((l) => l.level === i);
    const start = i === 0 ? px(maxX) + 5 : px(lv?.maxX ?? maxX) + 5;
    svg.push(renderLevelMark(start, lvlY, `Уровень ${i}`, i === 0 ? '0.000' : `+${Math.round(i * stepHeight)}`, symbolX));
  }

  svg.push('</svg>');
  return svg.join('\n');
}
