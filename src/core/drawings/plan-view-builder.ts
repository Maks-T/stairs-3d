import type { StairLayoutResult } from '@/types/stairs';
import { PROFILE_TUBE_SIZE_MM } from '@/constants/stairs-config';
import {
  createSvgDefs,
  createSvgHeader,
  renderDimensionLine,
  renderRect,
  renderTitle
} from './svg-primitives';

export function generatePlanViewSvg(layout: StairLayoutResult): string {
  const { totalWidth, totalDepth, stepCount, spacing, metrics } = layout;
  const frameWidth = spacing.frameWidthMm;

  const margin = { top: 75, right: 110, bottom: 90, left: 95 };
  const width = totalWidth + margin.left + margin.right;
  const height = totalDepth + margin.top + margin.bottom;

  const svgParts: string[] = [
    createSvgHeader(width, height, `0 0 ${width} ${height}`),
    createSvgDefs(),
    renderTitle(margin.left, 35, 'Схема расположения стоек (сечение Б-Б)')
  ];

  const treadOriginX = margin.left;
  const treadOverhang = (totalWidth - frameWidth) / 2;
  const frameOriginX = treadOriginX + treadOverhang;
  const originY = margin.top;

  svgParts.push(
    renderRect(frameOriginX, originY, frameWidth, totalDepth, 'none', '#64748b', 1.2)
  );

  const rowYList: number[] = [originY];
  const firstRowY = originY + PROFILE_TUBE_SIZE_MM + metrics.upperClearSpanMm;
  rowYList.push(firstRowY);
  for (let r = 2; r <= stepCount; r++) {
    const nextY = firstRowY + ((r - 1) * (PROFILE_TUBE_SIZE_MM + metrics.lowerClearSpanMm));
    rowYList.push(nextY);
  }

  for (let r = 0; r < rowYList.length - 1; r++) {
    const yStart = (rowYList[r] ?? originY) + PROFILE_TUBE_SIZE_MM;
    const yEnd = rowYList[r + 1] ?? yStart;
    const spanH = Math.max(0, yEnd - yStart);
    spacing.postXOffsets.forEach((xOff) => {
      const postX = frameOriginX + xOff;
      svgParts.push(renderRect(postX, yStart, PROFILE_TUBE_SIZE_MM, spanH, '#f8fafc', '#94a3b8', 1.0));
    });
  }

  rowYList.forEach((rY) => {
    spacing.postXOffsets.forEach((xOff) => {
      const postX = frameOriginX + xOff;
      svgParts.push(renderRect(postX, rY, PROFILE_TUBE_SIZE_MM, PROFILE_TUBE_SIZE_MM, '#e2e8f0', '#0f172a', 1.5));
    });
  });

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

  for (let r = 0; r < rowYList.length - 1; r++) {
    const y1 = (rowYList[r] ?? originY) + PROFILE_TUBE_SIZE_MM;
    const y2 = rowYList[r + 1] ?? y1;
    const spanVal = r === 0 ? metrics.upperClearSpanMm : metrics.lowerClearSpanMm;

    svgParts.push(
      renderDimensionLine({
        x1: frameOriginX + frameWidth,
        y1,
        x2: frameOriginX + frameWidth,
        y2,
        text: String(spanVal),
        offset: 35,
        orientation: 'vertical',
        textSide: 'end'
      })
    );
  }

  svgParts.push(
    renderDimensionLine({
      x1: frameOriginX + frameWidth,
      y1: originY,
      x2: frameOriginX + frameWidth,
      y2: originY + metrics.tierStepRunMm,
      text: String(metrics.tierStepRunMm),
      offset: 60,
      orientation: 'vertical',
      textSide: 'end'
    })
  );

  svgParts.push('</svg>');
  return svgParts.join('\n');
}