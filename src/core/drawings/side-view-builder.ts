
import type { StairLayoutResult } from '@/types/stairs';
import {
  PROFILE_TUBE_SIZE_MM,
  STEP_TREAD_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM,
  STEP_NOSE_OVERHANG_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  STEP_FRAME_CLEAR_SPAN_MM,
  RISER_THICKNESS_MM,
  RISER_TOP_CLEARANCE_MM
} from '@/constants/stairs-config';
import {
  createSvgDefs,
  createSvgHeader,
  renderDimensionLine,
  renderLevelAxis,
  renderLevelMark,
  renderLine,
  renderPolygon,
  renderRect,
  renderSectionCutMark,
  renderText,
  renderTitle
} from './svg-primitives';
import { DRAW } from './drawing-style';
import { getLevelSectionLetter } from './section-labels';

interface SideViewMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const VIEW_MARGIN: SideViewMargin = {
  top: 110,
  right: 155,
  bottom: 120,
  left: 160
};

export function generateSideViewSvg(layout: StairLayoutResult): string {
  const { stepCount, stepHeight, totalDepth, totalHeight, metrics, risers } = layout;

  const width = totalDepth + VIEW_MARGIN.left + VIEW_MARGIN.right;
  const height = totalHeight + VIEW_MARGIN.top + VIEW_MARGIN.bottom;
  const originX = VIEW_MARGIN.left;
  const baseY = VIEW_MARGIN.top + totalHeight;
  const topTreadY = baseY - totalHeight;

  const svgParts: string[] = [
    createSvgHeader(width, height, `0 0 ${width} ${height}`),
    createSvgDefs(),
    renderTitle(width / 2, DRAW.titleY, 'Вид сбоку'),
    renderLine(originX - 40, baseY, originX + totalDepth + 40, baseY, DRAW.ground, DRAW.strokeBeam)
  ];

  const T = PROFILE_TUBE_SIZE_MM;
  const M = STEP_FRAME_MODULE_DEPTH_MM;
  const concrete = layout.supportMode === 'concrete';
  const beamBottom = (level: number): number => level * stepHeight - STEP_TREAD_THICKNESS_MM - T;
  const tierStartX = (level: number): number => originX + (stepCount - level) * M;
  const post = (x: number, top: number, bottom: number): string =>
    renderRect(x, baseY - top, T, top - bottom, DRAW.fill, DRAW.line, DRAW.strokeOutline);

  if (concrete) {
    // Разрез по маршу (как Е-Е): бетон ступенями под каркасами ярусов, стойки фасада яруса на одну ступень вниз
    const outline: Array<[number, number]> = [[originX, baseY]];
    for (let level = stepCount; level >= 1; level--) {
      const x = tierStartX(level) + M - T;
      outline.push([outline[outline.length - 1]?.[0] ?? originX, baseY - beamBottom(level)], [x, baseY - beamBottom(level)]);
    }
    outline.push([tierStartX(1) + M - T, baseY]);
    svgParts.push(renderPolygon(outline, DRAW.concrete, DRAW.line, DRAW.strokeThin));
    svgParts.push(renderText(originX + (tierStartX(1) - originX) / 2 + M / 2, baseY - beamBottom(1) / 2 - 10, 'Бетон', { size: 14, anchor: 'middle', fill: DRAW.lineThin }));

    for (let level = 1; level <= stepCount; level++) {
      const x = tierStartX(level) + M - T;
      svgParts.push(post(x, beamBottom(level), level === 1 ? T : beamBottom(level - 1)));
    }
    svgParts.push(renderRect(tierStartX(1) + M - T, baseY - T, T, T, 'url(#steel-hatch)', DRAW.line, DRAW.strokeOutline));
  } else {
    // Стойки от земли: у стены и под фасадной балкой каждого яруса
    svgParts.push(post(originX, beamBottom(stepCount), 0));
    for (let level = stepCount; level >= 1; level--) {
      svgParts.push(post(tierStartX(level) + M - T, beamBottom(level), 0));
    }
  }

  // Каркасы ярусов: торцы задней и передней балок и перемычка между ними
  for (let level = 1; level <= stepCount; level++) {
    const x = tierStartX(level);
    const y = baseY - beamBottom(level) - T;
    svgParts.push(
      renderRect(x, y, M, T, DRAW.fill, DRAW.line, DRAW.strokeOutline),
      renderLine(x + T, y, x + T, y + T, DRAW.line, DRAW.strokeThin),
      renderLine(x + M - T, y, x + M - T, y + T, DRAW.line, DRAW.strokeThin)
    );
  }

  for (let i = 0; i < stepCount; i++) {
    const stepLvl = i + 1;
    const tierFromTop = stepCount - stepLvl;
    const treadY = baseY - (stepLvl * stepHeight);
    const treadX = originX + (tierFromTop * metrics.tierStepRunMm);

    svgParts.push(
      renderRect(
        treadX,
        treadY,
        STEP_TREAD_DEPTH_MM,
        STEP_TREAD_THICKNESS_MM,
        'url(#board-hatch)',
        DRAW.line,
        DRAW.strokeBeam
      )
    );

    svgParts.push(
      renderDimensionLine({
        x1: treadX,
        y1: treadY,
        x2: treadX + STEP_TREAD_DEPTH_MM,
        y2: treadY,
        text: String(STEP_TREAD_DEPTH_MM),
        offset: -20,
        orientation: 'horizontal'
      })
    );
  }

  if (risers.length > 0) {
    for (let i = 0; i < stepCount; i++) {
      const tierIndex = stepCount - 1 - i;
      const riserX = originX + ((tierIndex + 1) * metrics.tierStepRunMm);
      const riserH = (stepHeight - STEP_TREAD_THICKNESS_MM) - RISER_TOP_CLEARANCE_MM;
      const riserY = baseY - ((i + 1) * stepHeight) + STEP_TREAD_THICKNESS_MM + RISER_TOP_CLEARANCE_MM;

      svgParts.push(renderRect(riserX, riserY, RISER_THICKNESS_MM, riserH, DRAW.riser, DRAW.line, DRAW.strokeOutline));
    }
  }

  const levelAxisX = originX + totalDepth + 45;
  const levelSymbolX = levelAxisX + 25;
  svgParts.push(renderLevelAxis(levelAxisX, baseY, stepCount, stepHeight));
  for (let i = 0; i <= stepCount; i++) {
    const lvlY = baseY - (i * stepHeight);
    const valStr = i === 0 ? '0.000' : `+${Math.round(i * stepHeight)}`;
    const lineStartX = i === 0
      ? originX + totalDepth + 5
      : originX + ((stepCount - i) * metrics.tierStepRunMm) + STEP_TREAD_DEPTH_MM + 4;
    svgParts.push(renderLevelMark(lineStartX, lvlY, `Уровень ${i}`, valStr, levelSymbolX));
  }

  svgParts.push(
    renderDimensionLine({
      x1: originX,
      y1: baseY,
      x2: originX,
      y2: baseY - totalHeight,
      text: String(Math.round(totalHeight)),
      offset: -75,
      orientation: 'vertical',
      textSide: 'start'
    }),
    renderDimensionLine({
      x1: originX,
      y1: topTreadY,
      x2: originX,
      y2: topTreadY + STEP_TREAD_THICKNESS_MM,
      text: String(STEP_TREAD_THICKNESS_MM),
      offset: -35,
      orientation: 'vertical',
      textSide: 'start'
    }),
    renderDimensionLine({
      x1: originX,
      y1: topTreadY + STEP_TREAD_THICKNESS_MM,
      x2: originX,
      y2: topTreadY + stepHeight,
      text: String(Math.round(stepHeight - STEP_TREAD_THICKNESS_MM)),
      offset: -35,
      orientation: 'vertical',
      textSide: 'start'
    })
  );

  for (let r = 0; r < stepCount; r++) {
    const x1 = originX + (r * STEP_FRAME_MODULE_DEPTH_MM) + PROFILE_TUBE_SIZE_MM;
    const x2 = x1 + STEP_FRAME_CLEAR_SPAN_MM;

    svgParts.push(
      renderDimensionLine({
        x1,
        y1: baseY,
        x2,
        y2: baseY,
        text: String(STEP_FRAME_CLEAR_SPAN_MM),
        offset: 35,
        orientation: 'horizontal',
        textSide: 'end'
      })
    );
  }

  svgParts.push(
    renderDimensionLine({
      x1: originX,
      y1: baseY,
      x2: originX + STEP_FRAME_MODULE_DEPTH_MM,
      y2: baseY,
      text: String(STEP_FRAME_MODULE_DEPTH_MM),
      offset: 65,
      orientation: 'horizontal',
      textSide: 'end'
    }),
    renderDimensionLine({
      x1: originX,
      y1: baseY,
      x2: originX + totalDepth,
      y2: baseY,
      text: String(Math.round(totalDepth)),
      offset: 95,
      orientation: 'horizontal',
      textSide: 'end'
    })
  );

  const topNoseX = originX + metrics.tierStepRunMm + (risers.length > 0 ? RISER_THICKNESS_MM : 0);
  svgParts.push(
    renderDimensionLine({
      x1: topNoseX,
      y1: topTreadY + STEP_TREAD_THICKNESS_MM,
      x2: originX + STEP_TREAD_DEPTH_MM,
      y2: topTreadY + STEP_TREAD_THICKNESS_MM,
      text: String(STEP_NOSE_OVERHANG_MM),
      offset: 16,
      orientation: 'horizontal',
      textSide: 'end'
    })
  );

  svgParts.push(
    renderSectionCutMark({ x: originX, y: topTreadY - 45, dir: 'right', label: 'А', barSide: -1 }),
    renderSectionCutMark({ x: originX, y: baseY + 28, dir: 'right', label: 'А', barSide: 1 })
  );

  // Горизонтальные секущие плоскости: по одной на каждый ярус каркаса (план каркаса яруса на листе «Каркасы по уровням»)
  // и Б-Б у основания (план стоек)
  const beamMidY = (level: number): number =>
    baseY - (level * stepHeight) + STEP_TREAD_THICKNESS_MM + PROFILE_TUBE_SIZE_MM / 2;
  const leftCutX = originX - 105;

  const planCuts: Array<{ label: string; y: number; rightX: number }> = [];
  for (let level = stepCount; level >= 1; level--) {
    planCuts.push({
      label: getLevelSectionLetter(level),
      y: beamMidY(level),
      // справа метка встаёт у края проступи своего яруса
      rightX: originX + ((stepCount - level) * metrics.tierStepRunMm) + STEP_TREAD_DEPTH_MM + 14
    });
  }
  planCuts.push({ label: 'Б', y: baseY - 30, rightX: originX + totalDepth + 12 });

  planCuts.forEach(({ label, y, rightX }) => {
    svgParts.push(renderSectionCutMark({ x: leftCutX, y, dir: 'down', label, barSide: -1 }));
    svgParts.push(renderSectionCutMark({ x: rightX, y, dir: 'down', label, barSide: 1 }));
  });

  svgParts.push('</svg>');
  return svgParts.join('\n');
}


