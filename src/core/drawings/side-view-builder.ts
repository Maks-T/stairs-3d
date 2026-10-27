import type { StairLayoutResult } from '@/types/stairs';
import {
  PROFILE_TUBE_SIZE_MM,
  STEP_TREAD_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM,
  STEP_NOSE_OVERHANG_MM,
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
  renderNodeCircle,
  renderRect,
  renderSectionCutMark,
  renderTitle
} from './svg-primitives';

export function generateSideViewSvg(layout: StairLayoutResult): string {
  const { stepCount, stepHeight, totalDepth, totalHeight, metrics, risers } = layout;

  const margin = { top: 110, right: 155, bottom: 120, left: 160 };
  const width = totalDepth + margin.left + margin.right;
  const height = totalHeight + margin.top + margin.bottom;

  const svgParts: string[] = [
    createSvgHeader(width, height, `0 0 ${width} ${height}`),
    createSvgDefs(),
    renderTitle(margin.left + totalDepth / 2, 28, 'Вид сбоку', 'middle')
  ];

  const originX = margin.left;
  const baseY = margin.top + totalHeight;

  svgParts.push(renderLine(originX - 40, baseY, originX + totalDepth + 40, baseY, '#64748b', 1.5));

  const postXPositions: number[] = [originX];
  const firstPostX = originX + PROFILE_TUBE_SIZE_MM + metrics.upperClearSpanMm;
  postXPositions.push(firstPostX);
  for (let r = 2; r <= stepCount; r++) {
    postXPositions.push(firstPostX + ((r - 1) * (PROFILE_TUBE_SIZE_MM + metrics.lowerClearSpanMm)));
  }

  postXPositions.forEach((pX, idx) => {
    const tier = idx <= 1 ? stepCount : stepCount - idx + 1;
    const tierTopY = baseY - (tier * stepHeight) + STEP_TREAD_THICKNESS_MM + PROFILE_TUBE_SIZE_MM;
    const postH = baseY - tierTopY;
    svgParts.push(renderRect(pX, tierTopY, PROFILE_TUBE_SIZE_MM, postH, '#ffffff', '#0f172a', 1.4));
  });

  for (let i = 0; i < stepCount; i++) {
    const stepLvl = i + 1;
    const tierFromTop = stepCount - stepLvl;
    const beamY = baseY - (stepLvl * stepHeight) + STEP_TREAD_THICKNESS_MM;
    const bX1 = postXPositions[tierFromTop] ?? originX;
    const bX2 = (postXPositions[tierFromTop + 1] ?? bX1) + PROFILE_TUBE_SIZE_MM;
    const bW = Math.max(PROFILE_TUBE_SIZE_MM, bX2 - bX1);

    svgParts.push(renderRect(bX1, beamY, bW, PROFILE_TUBE_SIZE_MM, '#ffffff', '#0f172a', 1.4));
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
        '#0f172a',
        1.5
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

      svgParts.push(renderRect(riserX, riserY, RISER_THICKNESS_MM, riserH, '#cbd5e1', '#0f172a', 1.2));
    }
  }

  // Высотные отметки: линия уровня идёт от кромки проступи к общей оси справа
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
    })
  );

  const topTreadY = baseY - totalHeight;
  svgParts.push(
    renderDimensionLine({
      x1: originX,
      y1: topTreadY,
      x2: originX,
      y2: topTreadY + STEP_TREAD_THICKNESS_MM,
      text: String(STEP_TREAD_THICKNESS_MM),
      offset: -35,
      orientation: 'vertical',
      textSide: 'start'
    })
  );

  svgParts.push(
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

  for (let r = 0; r < postXPositions.length - 1; r++) {
    const x1 = (postXPositions[r] ?? originX) + PROFILE_TUBE_SIZE_MM;
    const x2 = postXPositions[r + 1] ?? x1;
    const spanVal = r === 0 ? metrics.upperClearSpanMm : metrics.lowerClearSpanMm;

    svgParts.push(
      renderDimensionLine({
        x1,
        y1: baseY,
        x2,
        y2: baseY,
        text: String(spanVal),
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
      x2: originX + metrics.tierStepRunMm,
      y2: baseY,
      text: String(metrics.tierStepRunMm),
      offset: 65,
      orientation: 'horizontal',
      textSide: 'end'
    })
  );

  svgParts.push(
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

  // Разрез А-А: вертикальная секущая плоскость по левому торцу, взгляд слева направо
  svgParts.push(renderSectionCutMark({ x: originX, y: topTreadY - 45, dir: 'right', label: 'А', barSide: -1 }));
  svgParts.push(renderSectionCutMark({ x: originX, y: baseY + 28, dir: 'right', label: 'А', barSide: 1 }));

  // Горизонтальные сечения (взгляд сверху вниз). Марки выносятся за контур с обеих сторон.
  const beamMidY = (level: number): number =>
    baseY - (level * stepHeight) + STEP_TREAD_THICKNESS_MM + PROFILE_TUBE_SIZE_MM / 2;
  const leftCutX = originX - 105;
  const rightCutX = originX + totalDepth + 12;
  const planCuts: Array<{ label: string; y: number }> = [
    { label: 'Д', y: beamMidY(stepCount) },      // верхняя балка каркаса
    ...(stepCount >= 2 ? [{ label: 'В', y: beamMidY(stepCount - 1) }] : []), // балка второго яруса
    { label: 'Б', y: baseY - 30 }                // стойки у основания
  ];
  planCuts.forEach(({ label, y }) => {
    svgParts.push(renderSectionCutMark({ x: leftCutX, y, dir: 'down', label, barSide: -1 }));
    svgParts.push(renderSectionCutMark({ x: rightCutX, y, dir: 'down', label, barSide: 1 }));
  });

  svgParts.push(renderNodeCircle(originX + STEP_TREAD_DEPTH_MM - 10, topTreadY + 12, 18, '1'));
  svgParts.push(renderNodeCircle(originX + 10, topTreadY + 12, 16, '2'));

  svgParts.push('</svg>');
  return svgParts.join('\n');
}
