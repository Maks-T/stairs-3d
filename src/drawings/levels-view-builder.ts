import { boundsOf, CORNER, isBaseRail, isPost, tierOfBeam, tubeOutline, uniqueSorted, type BoxElement, type Pt, type StairLayoutResult } from '@calculation/stairs';
import { dimLinear, polygon, viewport, type Entity } from 'cad-blueprint';
import { DRAW, PAPER } from './drawing-style';
import { planPoint } from './plan-geometry';
import { getLevelSectionName } from './section-labels';
import { L, type StairDrawing } from './stair-theme';

const near = (p: number, q: number): boolean => Math.abs(p - q) < 1;

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
    const tier = tierOfBeam(t, layout.module, layout.stepHeight);
    byTier.set(tier, [...(byTier.get(tier) ?? []), t]);
  });
  return [...byTier.keys()]
    .sort((p, q) => p - q)
    .map((tier) => {
      const tubes = byTier.get(tier) ?? [];
      const pts: Pt[] = [];
      tubes.forEach((t) => pts.push(...tubeOutline(t)));
      return { tier, tubes, ...boundsOf(pts), hasDiagonals: tubes.some((t) => !!t.polygonXZ) };
    });
}

/** Каркас одного яруса в координатах плана (Y = −z): балки и размеры. */
function levelEntities(d: StairDrawing, layout: StairLayoutResult, bl: LevelBlock): Entity[] {
  const T = layout.module.tube;
  const a = (mm: number): number => d.a(mm);
  const out: Entity[] = bl.tubes.map((t) => polygon(tubeOutline(t).map(planPoint), { layer: L.outline, fill: DRAW.fill }));

  out.push(
    dimLinear([bl.minX, -bl.minZ], [bl.maxX, -bl.minZ], { offset: a(PAPER.dimFirst), layer: L.dimensions }),
    dimLinear([bl.minX, -bl.minZ], [bl.minX, -bl.maxZ], { direction: 'vertical', offset: a(PAPER.dimFirst + PAPER.dimStep + 4), layer: L.dimensions })
  );

  // пролёты между поперечинами, снизу
  const xs = uniqueSorted(bl.tubes.filter((t) => !t.polygonXZ && near(t.width, T) && t.depth >= 150).map((t) => t.x));
  for (let i = 0; i < xs.length - 1; i++) {
    const x1 = (xs[i] ?? 0) + T / 2;
    const x2 = (xs[i + 1] ?? 0) - T / 2;
    if (x2 - x1 < 15) continue;
    out.push(dimLinear([x1, -bl.maxZ], [x2, -bl.maxZ], { offset: -a(PAPER.dimFirst), layer: L.dimensions }));
  }

  // пролёты на крыльях, по бокам
  const centerX = (bl.minX + bl.maxX) / 2;
  const xRun = bl.tubes.filter((t) => !t.polygonXZ && near(t.depth, T) && t.width > 150 && t.width < 300);
  const innerBeams = bl.tubes.filter((t) => /-inner$/.test(t.id));
  (['left', 'right'] as const).forEach((side) => {
    const group = xRun.filter((t) => (side === 'left' ? t.x < centerX : t.x > centerX));
    if (group.length === 0) return;
    const inner = innerBeams.find((t) => (side === 'left' ? t.x < centerX : t.x > centerX));
    const end = inner ? inner.z + inner.depth / 2 : undefined;
    const low = uniqueSorted(group.map((t) => t.z + T / 2));
    const high = uniqueSorted(group.map((t) => t.z - T / 2));
    const baseX = side === 'right' ? bl.maxX : bl.minX;
    const at = side === 'right' ? bl.maxX + a(PAPER.dimFirst) : bl.minX - a(PAPER.dimFirst);
    low.forEach((z1, i) => {
      const z2 = high[i + 1] ?? end;
      if (z2 === undefined || z2 - z1 < 15) return;
      out.push(dimLinear([baseX, -z1], [baseX, -z2], { direction: 'vertical', at: [at, 0], layer: L.dimensions }));
    });
  });

  if (bl.hasDiagonals) {
    const diag = bl.tubes.find((t) => !!t.polygonXZ);
    const len = diag ? diag.depth.toFixed(2) : '';
    out.push(
      d.note(
        [bl.minX, -bl.maxZ - a(PAPER.dimFirst + 8)],
        `Диагонали 45° парами: отступ от вершины ${CORNER.DIAGONAL_OFFSET_MM} мм, зазор между ними ${(CORNER.DIAGONAL_OFFSET_MM * Math.SQRT2).toFixed(2)} мм, длина по оси ${len} мм`,
        { anchor: 'top-left', color: DRAW.dimText }
      )
    );
  }
  return out;
}

/**
 * Схема горизонтальных каркасов по уровням: каждый ярус — отдельный видовой экран со своей подписью,
 * экраны стоят столбиком сверху вниз (уровень 1 сверху).
 */
export function buildLevelsView(d: StairDrawing, layout: StairLayoutResult): Entity[] {
  const blocks = buildBlocks(layout);
  const a = (mm: number): number => d.a(mm);
  const out: Entity[] = [];
  let top = 0;
  for (const bl of blocks) {
    const elevation = Math.round(bl.tier * layout.stepHeight);
    out.push(
      viewport(levelEntities(d, layout, bl), {
        id: `level-${bl.tier}`,
        // верх яруса (стена, z = minZ) ставится на текущую строку листа
        target: [0, -bl.minZ],
        position: [0, top],
        title: `Уровень ${bl.tier} (отм. +${elevation}), сечение ${getLevelSectionName(bl.tier)}`,
        layer: L.notes
      })
    );
    top -= bl.maxZ - bl.minZ + a(PAPER.dimFirst + 2 * PAPER.dimStep + (bl.hasDiagonals ? 14 : 4) + PAPER.title + 8);
  }
  return d.withTitle(out, 'Схема горизонтальных каркасов по уровням');
}
