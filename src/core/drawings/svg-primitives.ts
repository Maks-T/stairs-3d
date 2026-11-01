import type { DimensionLineOptions } from '@/types/drawings';
import { DRAW } from './drawing-style';

export function createSvgHeader(width: number, height: number, viewBox: string): string {
  // Размер задаётся атрибутами в «миллиметрах чертежа»: масштаб и скроллинг управляются просмотрщиком
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" style="display:block;">`;
}

export function createSvgDefs(): string {
  return `
    <defs>
      <pattern id="board-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="8" stroke="${DRAW.hatch}" stroke-width="1.0" />
      </pattern>
      <pattern id="steel-hatch" width="5" height="5" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="5" stroke="${DRAW.lineThin}" stroke-width="0.8" />
      </pattern>
      <pattern id="cladding-hatch" width="12" height="12" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="12" stroke="${DRAW.cladding}" stroke-width="1" />
      </pattern>
      <marker id="arrow-start" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
        <polygon points="8 0.5, 0 3, 8 5.5" fill="${DRAW.dim}" />
      </marker>
      <marker id="arrow-end" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0.5, 8 3, 0 5.5" fill="${DRAW.dim}" />
      </marker>
    </defs>
  `;
}

export function renderRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string = DRAW.fill,
  stroke: string = DRAW.line,
  strokeWidth: number = DRAW.strokeBeam,
  extra = ''
): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${extra}/>`;
}

export function renderPolygon(
  points: Array<[number, number]>,
  fill: string = DRAW.fill,
  stroke: string = DRAW.line,
  strokeWidth: number = DRAW.strokeBeam,
  extra = ''
): string {
  const pts = points.map(([x, y]) => `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="miter" ${extra} />`;
}

export function renderLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string = DRAW.ground,
  strokeWidth: number = DRAW.strokeThin,
  dashArray?: string
): string {
  const dash = dashArray ? `stroke-dasharray="${dashArray}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" ${dash} />`;
}

export function renderText(
  x: number,
  y: number,
  text: string,
  opts: {
    size?: number;
    anchor?: 'start' | 'middle' | 'end';
    fill?: string;
    weight?: number | string;
    mono?: boolean;
  } = {}
): string {
  const { size = DRAW.noteSize, anchor = 'start', fill = DRAW.line, weight = 600, mono = false } = opts;
  const family = mono ? DRAW.fontMono : DRAW.fontSans;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="${family}">${text}</text>`;
}

export function renderDimensionLine(opts: DimensionLineOptions): string {
  const {
    x1, y1, x2, y2, text, offset = 0, orientation = 'horizontal', textSide = 'start'
  } = opts;
  const txt = (x: number, y: number, anchor: string): string =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${DRAW.dimSize}" font-weight="600" fill="${DRAW.dimText}" font-family="${DRAW.fontMono}">${text}</text>`;
  const ext = `stroke="${DRAW.dimExt}" stroke-width="${DRAW.strokeExt}"`;
  const dimLine = `stroke="${DRAW.dim}" stroke-width="${DRAW.strokeDim}" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)"`;

  if (orientation === 'horizontal') {
    const lineY = y1 + offset;
    const textY = textSide === 'start' ? lineY - 5 : lineY + 15;
    const textX = (x1 + x2) / 2;
    return `
      <g class="dim-line">
        <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${lineY + (offset > 0 ? 5 : -5)}" ${ext} />
        <line x1="${x2}" y1="${y2}" x2="${x2}" y2="${lineY + (offset > 0 ? 5 : -5)}" ${ext} />
        <line x1="${x1}" y1="${lineY}" x2="${x2}" y2="${lineY}" ${dimLine} />
        ${txt(textX, textY, 'middle')}
      </g>
    `;
  }

  const lineX = x1 + offset;
  const textX = textSide === 'start' ? lineX - 6 : lineX + 6;
  const textY = (y1 + y2) / 2 + 4;
  const anchor = textSide === 'start' ? 'end' : 'start';
  return `
    <g class="dim-line">
      <line x1="${x1}" y1="${y1}" x2="${lineX + (offset > 0 ? 5 : -5)}" y2="${y1}" ${ext} />
      <line x1="${x2}" y1="${y2}" x2="${lineX + (offset > 0 ? 5 : -5)}" y2="${y2}" ${ext} />
      <line x1="${lineX}" y1="${y1}" x2="${lineX}" y2="${y2}" ${dimLine} />
      ${txt(textX, textY, anchor)}
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
      <line x1="${x}" y1="${y}" x2="${symbolX}" y2="${y}" stroke="${DRAW.dim}" stroke-width="${DRAW.strokeExt}" stroke-dasharray="10 3 2 3" />
      <polygon points="${symbolX - 5},${y - 8} ${symbolX + 5},${y - 8} ${symbolX},${y}" fill="${DRAW.dim}" />
      <line x1="${symbolX - 5}" y1="${y - 8}" x2="${symbolX + 62}" y2="${y - 8}" stroke="${DRAW.dim}" stroke-width="${DRAW.strokeDim}" />
      <text x="${symbolX + 7}" y="${y - 11}" font-size="${DRAW.noteSize}" font-weight="700" fill="${DRAW.levelValue}" font-family="${DRAW.fontMono}">${elevationVal}</text>
      <text x="${symbolX + 7}" y="${y + 15}" font-size="${DRAW.noteSize}" font-weight="600" fill="${DRAW.dimText}" font-family="${DRAW.fontSans}">${label}</text>
    </g>
  `;
}

/**
 * Вертикальная ось отметок с размерами между уровнями (150, 150, ...).
 * axisX — x оси; уровни считаются от baseY вверх с шагом stepHeight.
 */
export function renderLevelAxis(axisX: number, baseY: number, stepCount: number, stepHeight: number): string {
  const parts: string[] = [
    `<line x1="${axisX}" y1="${baseY}" x2="${axisX}" y2="${baseY - stepCount * stepHeight}" stroke="${DRAW.dim}" stroke-width="${DRAW.strokeExt}" stroke-dasharray="10 3 2 3" />`
  ];
  for (let i = 0; i < stepCount; i++) {
    const yLow = baseY - i * stepHeight;
    const yHigh = baseY - (i + 1) * stepHeight;
    const yMid = (yLow + yHigh) / 2;
    parts.push(
      `<line x1="${axisX}" y1="${yLow}" x2="${axisX}" y2="${yHigh}" stroke="${DRAW.dim}" stroke-width="${DRAW.strokeDim}" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />`,
      `<text transform="translate(${axisX - 5} ${yMid}) rotate(-90)" text-anchor="middle" font-size="${DRAW.dimSize}" font-weight="600" fill="${DRAW.dimText}" font-family="${DRAW.fontMono}">${Math.round(stepHeight)}</text>`
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
      <line x1="${barStart.x}" y1="${barStart.y}" x2="${barEnd.x}" y2="${barEnd.y}" stroke="${DRAW.line}" stroke-width="3" />
      <line x1="${tail.x}" y1="${tail.y}" x2="${headBase.x}" y2="${headBase.y}" stroke="${DRAW.line}" stroke-width="1.4" />
      <polygon points="${head}" fill="${DRAW.line}" />
      <text x="${labelX}" y="${labelY}" font-size="${DRAW.subtitleSize}" font-weight="800" fill="${DRAW.line}" text-anchor="middle" font-family="${DRAW.fontSans}">${label}</text>
    </g>
  `;
}

export function renderTitle(x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end' = 'middle'): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${DRAW.titleSize}" font-weight="700" fill="${DRAW.line}" font-family="${DRAW.fontSans}">${text}</text>`;
}
