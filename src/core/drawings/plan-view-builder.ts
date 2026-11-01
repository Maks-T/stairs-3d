import type { StairLayoutResult } from '@/types/stairs';
import {
  PROFILE_TUBE_SIZE_MM as T
} from '@/constants/stairs-config';
import { DRAW } from './drawing-style';
import {
  boundsOf,
  isBaseRail,
  isPost,
  treadOutline,
  tubeOutline,
  uniqueSorted,
  type Pt
} from './plan-geometry';
import {
  createSvgDefs,
  createSvgHeader,
  renderDimensionLine,
  renderPolygon,
  renderRect,
  renderText,
  renderTitle
} from './svg-primitives';


const MARGIN = { top: 110, right: 150, bottom: 150, left: 150 };

/**
 * План расположения стоек (сечение Б-Б).
 * Стойки показаны отдельными квадратами 40×40, настил и балки каркаса под ним едва заметны,
 * как на чертеже прямой лестницы.
 */
export function generatePlanViewSvg(layout: StairLayoutResult): string {
  const { frameTubes, treads } = layout;

  const posts = frameTubes.filter(isPost);
  const beams = frameTubes.filter((t) => !isPost(t) && !isBaseRail(t));
  const rails = frameTubes.filter(isBaseRail);
  // На бетоне сечение Б-Б проходит по нижней коробке: стойки верхних коробок выше него (показаны пунктиром)
  const cutPosts = posts.filter((p) => p.y - p.height / 2 <= T + 1);
  const upperPosts = posts.filter((p) => !cutPosts.includes(p));

  const allPoints: Pt[] = [];
  treads.forEach((t) => allPoints.push(...treadOutline(t)));
  frameTubes.forEach((t) => allPoints.push(...tubeOutline(t)));
  const b = boundsOf(allPoints);

  const planW = b.maxX - b.minX;
  const planD = b.maxZ - b.minZ;
  const svgW = planW + MARGIN.left + MARGIN.right;
  const svgH = planD + MARGIN.top + MARGIN.bottom;
  const ox = MARGIN.left - b.minX;
  const oz = MARGIN.top - b.minZ;
  const px = (x: number): number => x + ox;
  const pz = (z: number): number => z + oz;

  const svg: string[] = [
    createSvgHeader(svgW, svgH, `0 0 ${svgW} ${svgH}`),
    createSvgDefs(),
    renderTitle(svgW / 2, DRAW.titleY, 'План расположения стоек (сечение Б-Б)')
  ];

  // Настил: нижние ступени первыми, верхние перекрывают их
  [...treads]
    .sort((a, c) => a.y - c.y)
    .forEach((tread) => {
      const pts = treadOutline(tread).map(([x, z]) => [px(x), pz(z)] as Pt);
      svg.push(renderPolygon(pts, DRAW.treadFill, DRAW.treadStroke, DRAW.strokeThin));
    });

  // Балки и диагонали каркаса: тонкий пунктир, чтобы не спорили со стойками
  svg.push(`<g opacity="${DRAW.beamFaintOpacity}">`);
  beams.forEach((tube) => {
    const pts = tubeOutline(tube).map(([x, z]) => [px(x), pz(z)] as Pt);
    svg.push(renderPolygon(pts, 'none', DRAW.beamFaint, DRAW.strokeThin, 'stroke-dasharray="6 3"'));
  });
  svg.push('</g>');

  rails.forEach((rail) => {
    const pts = tubeOutline(rail).map(([x, z]) => [px(x), pz(z)] as Pt);
    svg.push(renderPolygon(pts, 'url(#steel-hatch)', DRAW.line, DRAW.strokeThin));
  });

  upperPosts.forEach((post) => {
    svg.push(renderRect(px(post.x) - T / 2, pz(post.z) - T / 2, T, T, DRAW.fill, DRAW.lineThin, DRAW.strokeThin, 'stroke-dasharray="4 3"'));
  });
  cutPosts.forEach((post) => {
    svg.push(renderRect(px(post.x) - T / 2, pz(post.z) - T / 2, T, T, DRAW.fill, DRAW.line, DRAW.strokeBeam));
  });

  const postXs = posts.map((p) => p.x);
  const postZs = posts.map((p) => p.z);
  if (posts.length > 0) {
    const frontZ = Math.max(...postZs);
    const rightX = Math.max(...postXs);

    // Цепочка по X: осевые расстояния стоек переднего ряда нижнего яруса
    const frontRowX = uniqueSorted(posts.filter((p) => Math.abs(p.z - frontZ) < 1).map((p) => p.x));
    const chainBaseZ = pz(frontZ) + T / 2;
    const chainOffset = pz(b.maxZ) + 32 - chainBaseZ;
    for (let i = 0; i < frontRowX.length - 1; i++) {
      const a = frontRowX[i] ?? 0;
      const c = frontRowX[i + 1] ?? 0;
      if (c - a < 12) continue;
      svg.push(renderDimensionLine({
        x1: px(a), y1: chainBaseZ, x2: px(c), y2: chainBaseZ,
        text: String(Math.round(c - a)), offset: chainOffset, orientation: 'horizontal', textSide: 'end'
      }));
    }

    // Цепочка по Z: осевые расстояния стоек правого ряда
    const rightColZ = uniqueSorted(posts.filter((p) => Math.abs(p.x - rightX) < 1).map((p) => p.z));
    const chainBaseX = px(rightX) + T / 2;
    const sideOffset = px(b.maxX) + 32 - chainBaseX;
    for (let i = 0; i < rightColZ.length - 1; i++) {
      const a = rightColZ[i] ?? 0;
      const c = rightColZ[i + 1] ?? 0;
      if (c - a < 12) continue;
      svg.push(renderDimensionLine({
        x1: chainBaseX, y1: pz(a), x2: chainBaseX, y2: pz(c),
        text: String(Math.round(c - a)), offset: sideOffset, orientation: 'vertical', textSide: 'end'
      }));
    }
  }

  svg.push(
    renderDimensionLine({
      x1: px(b.minX), y1: pz(b.minZ), x2: px(b.maxX), y2: pz(b.minZ),
      text: String(Math.round(planW)), offset: -30, orientation: 'horizontal'
    }),
    renderDimensionLine({
      x1: px(b.minX), y1: pz(b.minZ), x2: px(b.minX), y2: pz(b.maxZ),
      text: String(Math.round(planD)), offset: -40, orientation: 'vertical', textSide: 'start'
    })
  );

  const legendY = svgH - 80;
  const legend: string[] = [
    renderRect(MARGIN.left, legendY - 11, 14, 14, DRAW.fill, DRAW.line, DRAW.strokeBeam),
    renderText(MARGIN.left + 22, legendY, `Стойка ${T}×${T} мм в сечении, ${cutPosts.length} шт.`, { size: DRAW.noteSize })
  ];
  let rowY = legendY + 24;
  if (upperPosts.length > 0) {
    legend.push(
      renderRect(MARGIN.left, rowY - 11, 14, 14, DRAW.fill, DRAW.lineThin, DRAW.strokeThin, 'stroke-dasharray="4 3"'),
      renderText(MARGIN.left + 22, rowY, `Стойка верхних коробок (выше сечения), ${upperPosts.length} шт.`, { size: DRAW.noteSize })
    );
    rowY += 24;
  }
  if (rails.length > 0) {
    legend.push(
      renderRect(MARGIN.left, rowY - 9, 14, 10, 'url(#steel-hatch)', DRAW.line, DRAW.strokeThin),
      renderText(MARGIN.left + 22, rowY, 'Нижняя обвязка по земле', { size: DRAW.noteSize })
    );
    rowY += 24;
  }
  legend.push(
    `<line x1="${MARGIN.left}" y1="${rowY - 4}" x2="${MARGIN.left + 14}" y2="${rowY - 4}" stroke="${DRAW.beamFaint}" stroke-width="${DRAW.strokeThin}" stroke-dasharray="6 3" />`,
    renderText(MARGIN.left + 22, rowY, 'Балки каркаса под настилом (условно)', { size: DRAW.noteSize })
  );
  svg.push(...legend);

  svg.push('</svg>');
  return svg.join('\n');
}
