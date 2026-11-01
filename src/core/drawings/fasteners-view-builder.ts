import type { StairLayoutResult } from '@/types/stairs';
import { FASTENERS_CONFIG } from '@/constants/stairs-config';
import { DRAW } from './drawing-style';
import { boundsOf, isBaseRail, isPost, treadOutline, tubeOutline, type Pt } from './plan-geometry';
import { createSvgDefs, createSvgHeader, renderDimensionLine, renderPolygon, renderText, renderTitle } from './svg-primitives';

const MARGIN = { top: 110, right: 150, bottom: 150, left: 150 };
const MARK_MM = 9;
const MARK_COLOR = '#b91c1c';

function plus(x: number, y: number): string {
  return `<path d="M${x - MARK_MM} ${y}H${x + MARK_MM}M${x} ${y - MARK_MM}V${y + MARK_MM}" stroke="${MARK_COLOR}" stroke-width="2.2" />`;
}

function cross(x: number, y: number): string {
  const d = MARK_MM * 0.75;
  return `<path d="M${x - d} ${y - d}L${x + d} ${y + d}M${x - d} ${y + d}L${x + d} ${y - d}" stroke="${MARK_COLOR}" stroke-width="2.2" />`;
}

/**
 * Схема точек крепления ступеней (вид сверху): саморезы над поперечинами отмечены «+»,
 * у торцовки 45° на углах марша «×». Снизу итог по саморезам подступенков и обшивки.
 */
export function generateFastenersViewSvg(layout: StairLayoutResult): string {
  const { frameTubes, treads, fastenerPoints, fasteners } = layout;
  const beams = frameTubes.filter((t) => !isPost(t) && !isBaseRail(t));

  const allPoints: Pt[] = [];
  treads.forEach((t) => allPoints.push(...treadOutline(t)));
  beams.forEach((t) => allPoints.push(...tubeOutline(t)));
  const b = boundsOf(allPoints);

  const planW = b.maxX - b.minX;
  const planD = b.maxZ - b.minZ;
  const svgW = planW + MARGIN.left + MARGIN.right;
  const svgH = planD + MARGIN.top + MARGIN.bottom;
  const px = (x: number): number => x + MARGIN.left - b.minX;
  const pz = (z: number): number => z + MARGIN.top - b.minZ;

  const svg: string[] = [
    createSvgHeader(svgW, svgH, `0 0 ${svgW} ${svgH}`),
    createSvgDefs(),
    renderTitle(svgW / 2, DRAW.titleY, 'Схема точек крепления ступеней')
  ];

  [...treads]
    .sort((a, c) => a.y - c.y)
    .forEach((tread) => {
      const pts = treadOutline(tread).map(([x, z]) => [px(x), pz(z)] as Pt);
      svg.push(renderPolygon(pts, DRAW.treadFill, DRAW.treadStroke, DRAW.strokeThin));
    });

  svg.push(`<g opacity="${DRAW.beamFaintOpacity}">`);
  beams.forEach((tube) => {
    const pts = tubeOutline(tube).map(([x, z]) => [px(x), pz(z)] as Pt);
    svg.push(renderPolygon(pts, 'none', DRAW.beamFaint, DRAW.strokeThin, 'stroke-dasharray="6 3"'));
  });
  svg.push('</g>');

  const treadPoints = fastenerPoints.filter((p) => p.type === 'tread');
  treadPoints.forEach((p) => svg.push(p.id.includes('-miter') ? cross(px(p.x), pz(p.z)) : plus(px(p.x), pz(p.z))));

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

  const { treadsCount, risersCount, sideCladdingCount } = fasteners.breakdown;
  const legendY = svgH - 90;
  svg.push(
    plus(MARGIN.left + 7, legendY - 4),
    renderText(MARGIN.left + 24, legendY, `Саморез ${FASTENERS_CONFIG.TREAD_SCREW_SPEC}: 54 мм от носика и 20 мм от заднего края ступени, на осях поперечин`, { size: DRAW.noteSize }),
    cross(MARGIN.left + 7, legendY + 20),
    renderText(MARGIN.left + 24, legendY + 24, 'То же у торцовки 45°: 41.21 мм от линии шва', { size: DRAW.noteSize }),
    renderText(
      MARGIN.left,
      legendY + 52,
      `Ступени: ${treadsCount} шт. Подступенки: ${risersCount} шт., боковая зашивка: ${sideCladdingCount} шт. ` +
        `(${FASTENERS_CONFIG.CLADDING_SCREW_SPEC}, по 2 на стойку, 25 мм от краёв доски)`,
      { size: DRAW.noteSize, fill: DRAW.dimText }
    )
  );

  svg.push('</svg>');
  return svg.join('\n');
}
