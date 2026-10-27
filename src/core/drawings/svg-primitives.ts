import type { DimensionLineOptions } from '@/types/drawings';

export function createSvgHeader(width: number, height: number, viewBox: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" style="display:block;width:100%;height:100%;">`;
}

export function createSvgDefs(): string {
  return `
    <defs>
      <pattern id="board-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" stroke-width="1.0" />
      </pattern>
      <pattern id="cladding-hatch" width="12" height="12" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="12" stroke="#e2e8f0" stroke-width="1" />
      </pattern>
      <marker id="arrow-start" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
        <polygon points="8 0.5, 0 3, 8 5.5" fill="#0284c7" />
      </marker>
      <marker id="arrow-end" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0.5, 8 3, 0 5.5" fill="#0284c7" />
      </marker>
    </defs>
  `;
}

export function renderRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill = '#ffffff',
  stroke = '#1e293b',
  strokeWidth = 1.5
): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

export function renderLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke = '#64748b',
  strokeWidth = 1,
  dashArray?: string
): string {
  const dash = dashArray ? `stroke-dasharray="${dashArray}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" ${dash} />`;
}

export function renderDimensionLine(opts: DimensionLineOptions): string {
  const {
    x1, y1, x2, y2, text, offset = 0, orientation = 'horizontal', textSide = 'start'
  } = opts;

  if (orientation === 'horizontal') {
    const lineY = y1 + offset;
    const textY = textSide === 'start' ? lineY - 5 : lineY + 14;
    const textX = (x1 + x2) / 2;
    return `
      <g class="dim-line">
        <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${lineY + (offset > 0 ? 5 : -5)}" stroke="#94a3b8" stroke-width="0.8" />
        <line x1="${x2}" y1="${y2}" x2="${x2}" y2="${lineY + (offset > 0 ? 5 : -5)}" stroke="#94a3b8" stroke-width="0.8" />
        <line x1="${x1}" y1="${lineY}" x2="${x2}" y2="${lineY}" stroke="#0284c7" stroke-width="1.2" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <text x="${textX}" y="${textY}" text-anchor="middle" font-size="11" font-weight="600" fill="#0369a1" font-family="monospace">${text}</text>
      </g>
    `;
  }

  const lineX = x1 + offset;
  const textX = textSide === 'start' ? lineX - 6 : lineX + 6;
  const textY = (y1 + y2) / 2 + 4;
  const anchor = textSide === 'start' ? 'end' : 'start';
  return `
    <g class="dim-line">
      <line x1="${x1}" y1="${y1}" x2="${lineX + (offset > 0 ? 5 : -5)}" y2="${y1}" stroke="#94a3b8" stroke-width="0.8" />
      <line x1="${x2}" y1="${y2}" x2="${lineX + (offset > 0 ? 5 : -5)}" y2="${y2}" stroke="#94a3b8" stroke-width="0.8" />
      <line x1="${lineX}" y1="${y1}" x2="${lineX}" y2="${y2}" stroke="#0284c7" stroke-width="1.2" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
      <text x="${textX}" y="${textY}" text-anchor="${anchor}" font-size="11" font-weight="600" fill="#0369a1" font-family="monospace">${text}</text>
    </g>
  `;
}

/**
 * Высотная отметка: штрихпунктирная линия уровня доходит до острия треугольника,
 * полка с отметкой (+450) над ней, название уровня под ней.
 * x       — начало линии уровня (кромка проступи)
 * symbolX — x острия треугольника (одинаков для всех уровней)
 */
export function renderLevelMark(x: number, y: number, label: string, elevationVal: string, symbolX: number): string {
  return `
    <g class="level-mark">
      <line x1="${x}" y1="${y}" x2="${symbolX}" y2="${y}" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="10 3 2 3" />
      <polygon points="${symbolX - 5},${y - 8} ${symbolX + 5},${y - 8} ${symbolX},${y}" fill="#0284c7" />
      <line x1="${symbolX - 5}" y1="${y - 8}" x2="${symbolX + 62}" y2="${y - 8}" stroke="#0284c7" stroke-width="1.2" />
      <text x="${symbolX + 7}" y="${y - 11}" font-size="10" font-weight="700" fill="#dc2626" font-family="monospace">${elevationVal}</text>
      <text x="${symbolX + 7}" y="${y + 14}" font-size="10" font-weight="600" fill="#0369a1" font-family="sans-serif">${label}</text>
    </g>
  `;
}

/**
 * Вертикальная ось отметок с размерами между уровнями (150, 150, ...).
 * axisX — x оси; уровни считаются от baseY вверх с шагом stepHeight.
 */
export function renderLevelAxis(axisX: number, baseY: number, stepCount: number, stepHeight: number): string {
  const parts: string[] = [
    `<line x1="${axisX}" y1="${baseY}" x2="${axisX}" y2="${baseY - stepCount * stepHeight}" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="10 3 2 3" />`
  ];
  for (let i = 0; i < stepCount; i++) {
    const yLow = baseY - i * stepHeight;
    const yHigh = baseY - (i + 1) * stepHeight;
    const yMid = (yLow + yHigh) / 2;
    parts.push(
      `<line x1="${axisX}" y1="${yLow}" x2="${axisX}" y2="${yHigh}" stroke="#0284c7" stroke-width="1.2" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />`,
      `<text transform="translate(${axisX - 5} ${yMid}) rotate(-90)" text-anchor="middle" font-size="11" font-weight="600" fill="#0369a1" font-family="monospace">${Math.round(stepHeight)}</text>`
    );
  }
  return `<g class="level-axis">${parts.join('')}</g>`;
}

export interface SectionCutMarkOptions {
  /** Точка на линии разреза, в которую упирается стрелка */
  x: number;
  y: number;
  /** Направление взгляда (куда указывает стрелка) */
  dir: 'up' | 'down' | 'left' | 'right';
  /** Буква разреза */
  label: string;
  /**
   * В какую сторону от стрелки идёт утолщённая линия разреза и где стоит буква:
   * для dir left/right: -1 — вверх, 1 — вниз;
   * для dir up/down:    -1 — влево, 1 — вправо.
   */
  barSide: 1 | -1;
  barLength?: number;
  shaftLength?: number;
}

/**
 * Обозначение секущей плоскости как на эталонных чертежах:
 * толстая разомкнутая линия + перпендикулярная стрелка взгляда, буква рядом со стрелкой.
 */
export function renderSectionCutMark(opts: SectionCutMarkOptions): string {
  const { x, y, dir, label, barSide, barLength = 26, shaftLength = 32 } = opts;
  const vx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
  const vy = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
  // ось утолщённой линии (перпендикулярна взгляду)
  const px = vy !== 0 ? barSide : 0;
  const py = vx !== 0 ? barSide : 0;

  const headLen = 10;
  const headHalf = 3.5;
  const barStart = { x: x - px * 4, y: y - py * 4 };
  const barEnd = { x: x + px * barLength, y: y + py * barLength };
  const tail = { x: x - vx * shaftLength, y: y - vy * shaftLength };
  const headBase = { x: x - vx * headLen, y: y - vy * headLen };

  const head = [
    `${x},${y}`,
    `${headBase.x + px * headHalf},${headBase.y + py * headHalf}`,
    `${headBase.x - px * headHalf},${headBase.y - py * headHalf}`
  ].join(' ');

  const midX = (tail.x + x) / 2;
  const midY = (tail.y + y) / 2;
  const labelX = vx !== 0 ? midX : x + px * 11;
  const labelY = vx !== 0 ? (barSide < 0 ? midY - 6 : midY + 15) : midY + 4;

  return `
    <g class="section-cut">
      <line x1="${barStart.x}" y1="${barStart.y}" x2="${barEnd.x}" y2="${barEnd.y}" stroke="#0f172a" stroke-width="3" />
      <line x1="${tail.x}" y1="${tail.y}" x2="${headBase.x}" y2="${headBase.y}" stroke="#0f172a" stroke-width="1.4" />
      <polygon points="${head}" fill="#0f172a" />
      <text x="${labelX}" y="${labelY}" font-size="13" font-weight="800" fill="#0f172a" text-anchor="middle" font-family="sans-serif">${label}</text>
    </g>
  `;
}

export function renderNodeCircle(cx: number, cy: number, r: number, label: string): string {
  return `
    <g class="node-callout">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="4 2" />
      <text x="${cx}" y="${cy - r - 4}" font-size="11" font-weight="700" fill="#0284c7" text-anchor="middle" font-family="sans-serif">Узел ${label}</text>
    </g>
  `;
}

export function renderTitle(x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end' = 'start'): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="14" font-weight="700" fill="#0f172a" font-family="sans-serif">${text}</text>`;
}
