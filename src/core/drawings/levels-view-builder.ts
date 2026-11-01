import type { BoxElement, StairLayoutResult } from '@/types/stairs';
import {
  CORNER_CONFIG,
  PROFILE_TUBE_SIZE_MM as T
} from '@/constants/stairs-config';
import { DRAW } from './drawing-style';
import { getLevelSectionName } from './section-labels';
import {
  boundsOf,
  isBaseRail,
  isPost,
  tierOfBeam,
  tubeOutline,
  uniqueSorted,
  type Pt
} from './plan-geometry';
import {
  createSvgDefs,
  createSvgHeader,
  renderDimensionLine,
  renderPolygon,
  renderText,
  renderTitle
} from './svg-primitives';

const MARGIN = { top: 70, right: 150, bottom: 40, left: 160 };
const BLOCK_HEAD = 70; // заголовок уровня + габаритный размер сверху
const BLOCK_FOOT = 110; // цепочка размеров снизу + примечание

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1;

interface LevelBlock {
  tier: number;
  tubes: BoxElement[];
  minZ: number;
  maxZ: number;
  minX: number;
  maxX: number;
  hasDiagonals: boolean;
}

function buildBlocks(layout: StairLayoutResult): LevelBlock[] {
  const beams = layout.frameTubes.filter((t) => !isPost(t) && !isBaseRail(t));
  const byTier = new Map<number, BoxElement[]>();
  beams.forEach((t) => {
    const tier = tierOfBeam(t, layout.stepHeight);
    const list = byTier.get(tier) ?? [];
    list.push(t);
    byTier.set(tier, list);
  });

  return [...byTier.keys()]
    .sort((a, c) => a - c)
    .map((tier) => {
      const tubes = byTier.get(tier) ?? [];
      const pts: Pt[] = [];
      tubes.forEach((t) => pts.push(...tubeOutline(t)));
      const bb = boundsOf(pts);
      return { tier, tubes, ...bb, hasDiagonals: tubes.some((t) => !!t.polygonXZ) };
    });
}

/**
 * Схема горизонтальных каркасов: отдельный план каркаса каждого уровня (без стоек и настила)
 * с размерами в свету и данными по диагоналям 45°.
 */
export function generateLevelsViewSvg(layout: StairLayoutResult): string {
  const blocks = buildBlocks(layout);
  const gMinX = Math.min(...blocks.map((bl) => bl.minX));
  const gMaxX = Math.max(...blocks.map((bl) => bl.maxX));
  const ox = MARGIN.left - gMinX;

  const blockHeights = blocks.map((bl) => bl.maxZ - bl.minZ + BLOCK_HEAD + BLOCK_FOOT);
  const svgW = gMaxX - gMinX + MARGIN.left + MARGIN.right;
  const svgH = MARGIN.top + blockHeights.reduce((a, c) => a + c, 0) + MARGIN.bottom;

  const svg: string[] = [
    createSvgHeader(svgW, svgH, `0 0 ${svgW} ${svgH}`),
    createSvgDefs(),
    renderTitle(svgW / 2, DRAW.titleY, 'Схема горизонтальных каркасов по уровням')
  ];

  let cursorY = MARGIN.top;
  blocks.forEach((bl, idx) => {
    const top = cursorY + BLOCK_HEAD;
    const oz = top - bl.minZ;
    const px = (x: number): number => x + ox;
    const pz = (z: number): number => z + oz;
    const elevation = Math.round(bl.tier * layout.stepHeight);

    svg.push(
      renderText(px((bl.minX + bl.maxX) / 2), cursorY + 18, `Уровень ${bl.tier} (отм. +${elevation}), сечение ${getLevelSectionName(bl.tier)}`, {
        size: DRAW.subtitleSize, anchor: 'middle', weight: 700
      })
    );

    bl.tubes.forEach((tube) => {
      const pts = tubeOutline(tube).map(([x, z]) => [px(x), pz(z)] as Pt);
      svg.push(renderPolygon(pts, DRAW.fill, DRAW.line, DRAW.strokeBeam));
    });

    // Габарит по ширине сверху и по глубине слева
    svg.push(
      renderDimensionLine({
        x1: px(bl.minX), y1: pz(bl.minZ), x2: px(bl.maxX), y2: pz(bl.minZ),
        text: String(Math.round(bl.maxX - bl.minX)), offset: -26, orientation: 'horizontal'
      }),
      renderDimensionLine({
        x1: px(bl.minX), y1: pz(bl.minZ), x2: px(bl.minX), y2: pz(bl.maxZ),
        text: String(Math.round(bl.maxZ - bl.minZ)), offset: -64, orientation: 'vertical', textSide: 'start'
      })
    );

    // Размеры в свету между продольными (по Z) элементами: поперечины, торцы, балки крыльев
    const zRun = bl.tubes
      .filter((t) => !t.polygonXZ && near(t.width, T) && t.depth >= 150)
      .map((t) => t.x);
    const xs = uniqueSorted(zRun);
    for (let i = 0; i < xs.length - 1; i++) {
      const a = (xs[i] ?? 0) + T / 2;
      const c = (xs[i + 1] ?? 0) - T / 2;
      if (c - a < 15) continue;
      svg.push(renderDimensionLine({
        x1: px(a), y1: pz(bl.maxZ), x2: px(c), y2: pz(bl.maxZ),
        text: String(Math.round(c - a)), offset: 28, orientation: 'horizontal', textSide: 'end'
      }));
    }

    // Размеры вдоль крыльев между поперечинами (по X), отдельно слева и справа
    const centerX = (bl.minX + bl.maxX) / 2;
    const xRun = bl.tubes.filter((t) => !t.polygonXZ && near(t.depth, T) && t.width > 150 && t.width < 300);
    const innerBeams = bl.tubes.filter((t) => /-inner$/.test(t.id));
    (['left', 'right'] as const).forEach((side) => {
      const group = xRun.filter((t) => (side === 'left' ? t.x < centerX : t.x > centerX));
      if (group.length === 0) return;
      const inner = innerBeams.find((t) => (side === 'left' ? t.x < centerX : t.x > centerX));
      const end = inner ? inner.z + inner.depth / 2 : undefined;
      // Сегменты в свету: от нижней грани поперечины до верхней грани следующей,
      // последний сегмент до торца внутренней балки крыла
      const lowFaces = uniqueSorted(group.map((t) => t.z + T / 2));
      const highFaces = uniqueSorted(group.map((t) => t.z - T / 2));
      const baseX = side === 'right' ? px(bl.maxX) : px(bl.minX);
      const off = side === 'right' ? 30 : -30;
      lowFaces.forEach((low, i) => {
        const next = highFaces[i + 1] ?? end;
        if (next === undefined || next - low < 15) return;
        svg.push(renderDimensionLine({
          x1: baseX, y1: pz(low), x2: baseX, y2: pz(next),
          text: String(Math.round(next - low)), offset: off, orientation: 'vertical',
          textSide: side === 'right' ? 'end' : 'start'
        }));
      });
    });

    if (bl.hasDiagonals) {
      const diag = bl.tubes.find((t) => !!t.polygonXZ);
      const len = diag ? diag.depth.toFixed(2) : '';
      svg.push(renderText(
        px(bl.minX),
        pz(bl.maxZ) + 78,
        `Диагонали 45° парами: отступ от вершины ${CORNER_CONFIG.DIAGONAL_CORNER_OFFSET_MM} мм, зазор между ними ${CORNER_CONFIG.DIAGONAL_CLEAR_GAP_MM} мм, длина по оси ${len} мм`,
        { size: DRAW.noteSize, fill: DRAW.dimText }
      ));
    }

    cursorY += blockHeights[idx] ?? 0;
  });

  svg.push('</svg>');
  return svg.join('\n');
}
