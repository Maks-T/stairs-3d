import type { StairLayoutResult } from '@/types/stairs';
import {
  PROFILE_TUBE_SIZE_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  STEP_FRAME_CLEAR_SPAN_MM
} from '@/constants/stairs-config';
import {
  createSvgDefs,
  createSvgHeader,
  renderDimensionLine,
  renderRect,
  renderTitle
} from './svg-primitives';

interface PlanViewMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const PLAN_MARGIN: PlanViewMargin = {
  top: 75,
  right: 110,
  bottom: 90,
  left: 95
};

export function generatePlanViewSvg(layout: StairLayoutResult): string {
  const { totalWidth, totalDepth, stepCount, spacing } = layout;
  const frameWidth = spacing.frameWidthMm;

  const width = totalWidth + PLAN_MARGIN.left + PLAN_MARGIN.right;
  const height = totalDepth + PLAN_MARGIN.top + PLAN_MARGIN.bottom;
  const treadOriginX = PLAN_MARGIN.left;
  const treadOverhang = (totalWidth - frameWidth) / 2;
  const frameOriginX = treadOriginX + treadOverhang;
  const originY = PLAN_MARGIN.top;

  const svgParts: string[] = [
    createSvgHeader(width, height, `0 0 ${width} ${height}`),
    createSvgDefs(),
    renderTitle(PLAN_MARGIN.left, 35, 'Схема расположения стоек (сечение Б-Б)'),
    renderRect(frameOriginX, originY, frameWidth, totalDepth, 'none', '#64748b', 1.2)
  ];

  // Координаты Y рядов стоек
  const rowYList: number[] = [originY];
  for (let r = 1; r <= stepCount; r++) {
    rowYList.push(originY + (r * STEP_FRAME_MODULE_DEPTH_MM) - PROFILE_TUBE_SIZE_MM);
  }

  // Продольные перемычки между рядами стоек (191 мм в свету)
  for (let r = 0; r < rowYList.length - 1; r++) {
    const yStart = (rowYList[r] ?? originY) + PROFILE_TUBE_SIZE_MM;
    const yEnd = rowYList[r + 1] ?? yStart;
    const spanH = Math.max(0, yEnd - yStart);

    spacing.postXOffsets.forEach((xOff: number) => {
      const postX = frameOriginX + xOff;
      svgParts.push(renderRect(postX, yStart, PROFILE_TUBE_SIZE_MM, spanH, '#f8fafc', '#94a3b8', 1.0));
    });
  }

  // Отрисовка стоек 40х40 в узлах сетки
  rowYList.forEach((rY: number) => {
    spacing.postXOffsets.forEach((xOff: number) => {
      const postX = frameOriginX + xOff;
      svgParts.push(renderRect(postX, rY, PROFILE_TUBE_SIZE_MM, PROFILE_TUBE_SIZE_MM, '#e2e8f0', '#0f172a', 1.5));
    });
  });

  // Размер ширины каркаса сверху
  svgParts.push(
    renderDimensionLine({
      x1: frameOriginX,
      y1: originY,
      x2: frameOriginX + frameWidth,
      y2: originY,
      text: String(Math.round(frameWidth)),
      offset: -25,
      orientation: 'horizontal'
    })
  );

  // Размеры между стойками в свету снизу
  for (let i = 0; i < spacing.spans.length; i++) {
    const span = spacing.spans[i] ?? 0;
    const x1 = frameOriginX + (spacing.postXOffsets[i] ?? 0) + PROFILE_TUBE_SIZE_MM;
    const x2 = x1 + span;

    svgParts.push(
      renderDimensionLine({
        x1,
        y1: originY + totalDepth,
        x2,
        y2: originY + totalDepth,
        text: String(span),
        offset: 25,
        orientation: 'horizontal',
        textSide: 'end'
      })
    );
  }

  // Полная глубина слева
  svgParts.push(
    renderDimensionLine({
      x1: treadOriginX,
      y1: originY,
      x2: treadOriginX,
      y2: originY + totalDepth,
      text: String(Math.round(totalDepth)),
      offset: -45,
      orientation: 'vertical',
      textSide: 'start'
    })
  );

  // Пролеты перемычек 191 мм по глубине справа
  for (let r = 0; r < stepCount; r++) {
    const y1 = originY + (r * STEP_FRAME_MODULE_DEPTH_MM) + PROFILE_TUBE_SIZE_MM;
    const y2 = y1 + STEP_FRAME_CLEAR_SPAN_MM;

    svgParts.push(
      renderDimensionLine({
        x1: frameOriginX + frameWidth,
        y1,
        x2: frameOriginX + frameWidth,
        y2,
        text: String(STEP_FRAME_CLEAR_SPAN_MM),
        offset: 35,
        orientation: 'vertical',
        textSide: 'end'
      })
    );
  }

  // Модуль шага яруса 271 мм справа
  svgParts.push(
    renderDimensionLine({
      x1: frameOriginX + frameWidth,
      y1: originY,
      x2: frameOriginX + frameWidth,
      y2: originY + STEP_FRAME_MODULE_DEPTH_MM,
      text: String(STEP_FRAME_MODULE_DEPTH_MM),
      offset: 60,
      orientation: 'vertical',
      textSide: 'end'
    })
  );

  svgParts.push('</svg>');
  return svgParts.join('\n');
}