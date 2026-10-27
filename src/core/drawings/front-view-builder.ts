import type { StairLayoutResult } from '@/types/stairs';
import {
  PROFILE_TUBE_SIZE_MM,
  STEP_TREAD_THICKNESS_MM,
  RISER_THICKNESS_MM
} from '@/constants/stairs-config';
import {
  createSvgDefs,
  createSvgHeader,
  renderDimensionLine,
  renderLevelAxis,
  renderLevelMark,
  renderLine,
  renderRect,
  renderTitle
} from './svg-primitives';

export function generateFrontViewSvg(layout: StairLayoutResult): string {
  const { totalWidth, totalHeight, stepHeight, stepCount, spacing, cladding } = layout;
  const frameWidth = spacing.frameWidthMm;

  const margin = { top: 85, right: 155, bottom: 95, left: 85 };
  const width = totalWidth + margin.left + margin.right;
  const height = totalHeight + margin.top + margin.bottom;

  const svgParts: string[] = [
    createSvgHeader(width, height, `0 0 ${width} ${height}`),
    createSvgDefs(),
    renderTitle(margin.left + totalWidth / 2, 35, 'Разрез А-А', 'middle')
  ];

  const treadOriginX = margin.left;
  const treadOverhang = (totalWidth - frameWidth) / 2;
  const frameOriginX = treadOriginX + treadOverhang;
  const baseY = margin.top + totalHeight;

  svgParts.push(renderLine(treadOriginX - 30, baseY, treadOriginX + totalWidth + 30, baseY, '#94a3b8', 1.5));

  // Вертикальные стойки по пролетам (чистый каркас)
  spacing.postXOffsets.forEach((xOff) => {
    const postX = frameOriginX + xOff;
    const postH = totalHeight - STEP_TREAD_THICKNESS_MM - PROFILE_TUBE_SIZE_MM;
    const postY = baseY - totalHeight + STEP_TREAD_THICKNESS_MM + PROFILE_TUBE_SIZE_MM;

    svgParts.push(renderRect(postX, postY, PROFILE_TUBE_SIZE_MM, postH, '#ffffff', '#0f172a', 1.4));
  });

  // Поперечные балки каркаса ярусов
  for (let s = 1; s <= stepCount; s++) {
    const beamY = baseY - (s * stepHeight) + STEP_TREAD_THICKNESS_MM;
    svgParts.push(
      renderRect(frameOriginX, beamY, frameWidth, PROFILE_TUBE_SIZE_MM, '#f8fafc', '#0f172a', 1.4)
    );
  }

  // Торцы боковой обшивки МПК (11 мм) слева и справа
  if (cladding.length > 0) {
    const sideH = totalHeight - STEP_TREAD_THICKNESS_MM;
    const sideY = baseY - totalHeight + STEP_TREAD_THICKNESS_MM;

    svgParts.push(
      renderRect(treadOriginX, sideY, RISER_THICKNESS_MM, sideH, '#e2e8f0', '#0f172a', 1.2)
    );
    svgParts.push(
      renderRect(treadOriginX + totalWidth - RISER_THICKNESS_MM, sideY, RISER_THICKNESS_MM, sideH, '#e2e8f0', '#0f172a', 1.2)
    );
  }

  // Доска верхней проступи
  const topTreadY = baseY - totalHeight;
  svgParts.push(
    renderRect(
      treadOriginX,
      topTreadY,
      totalWidth,
      STEP_TREAD_THICKNESS_MM,
      'url(#board-hatch)',
      '#1e293b',
      1.5
    )
  );

  // Размер полной ширины настила сверху
  svgParts.push(
    renderDimensionLine({
      x1: treadOriginX,
      y1: topTreadY,
      x2: treadOriginX + totalWidth,
      y2: topTreadY,
      text: String(totalWidth),
      offset: -25,
      orientation: 'horizontal'
    })
  );

  // Размер ширины каркаса снизу
  svgParts.push(
    renderDimensionLine({
      x1: frameOriginX,
      y1: baseY,
      x2: frameOriginX + frameWidth,
      y2: baseY,
      text: String(Math.round(frameWidth)),
      offset: 55,
      orientation: 'horizontal',
      textSide: 'end'
    })
  );

  // Размеры между стойками в свету
  for (let i = 0; i < spacing.spans.length; i++) {
    const span = spacing.spans[i] ?? 0;
    const x1 = frameOriginX + (spacing.postXOffsets[i] ?? 0) + PROFILE_TUBE_SIZE_MM;
    const x2 = x1 + span;

    svgParts.push(
      renderDimensionLine({
        x1,
        y1: baseY,
        x2,
        y2: baseY,
        text: String(span),
        offset: 25,
        orientation: 'horizontal',
        textSide: 'end'
      })
    );
  }

  // Высотные отметки справа: линия уровня от торца настила к общей оси
  const levelAxisX = treadOriginX + totalWidth + 45;
  const levelSymbolX = levelAxisX + 25;
  svgParts.push(renderLevelAxis(levelAxisX, baseY, stepCount, stepHeight));
  for (let i = 0; i <= stepCount; i++) {
    const lvlY = baseY - (i * stepHeight);
    const valStr = i === 0 ? '0.000' : `+${Math.round(i * stepHeight)}`;
    svgParts.push(
      renderLevelMark(treadOriginX + totalWidth + 5, lvlY, `Уровень ${i}`, valStr, levelSymbolX)
    );
  }

  // Размер полной высоты слева
  svgParts.push(
    renderDimensionLine({
      x1: treadOriginX,
      y1: baseY,
      x2: treadOriginX,
      y2: topTreadY,
      text: String(Math.round(totalHeight)),
      offset: -45,
      orientation: 'vertical',
      textSide: 'start'
    })
  );

  svgParts.push('</svg>');
  return svgParts.join('\n');
}
