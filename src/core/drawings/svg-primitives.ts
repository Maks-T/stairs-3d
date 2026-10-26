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

export function renderLevelMark(x: number, y: number, label: string, elevationVal: string, endX: number): string {
  const x0 = endX + 8;
  return `
    <g class="level-mark">
      <line x1="${x}" y1="${y}" x2="${endX}" y2="${y}" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="5 3" />
      <polygon points="${x0 - 5},${y - 7} ${x0 + 5},${y - 7} ${x0},${y}" fill="#0284c7" />
      <line x1="${x0 - 5}" y1="${y - 7}" x2="${x0 + 58}" y2="${y - 7}" stroke="#0284c7" stroke-width="1.2" />
      <text x="${x0 + 7}" y="${y - 10}" font-size="10" font-weight="700" fill="#dc2626" font-family="monospace">${elevationVal}</text>
      <text x="${x0 + 7}" y="${y + 13}" font-size="10" font-weight="600" fill="#0369a1" font-family="sans-serif">${label}</text>
    </g>
  `;
}

export function renderSectionCutMark(x1: number, y1: number, x2: number, y2: number, label: string, dir: 'up' | 'down' | 'left' | 'right'): string {
  const arrowSize = 6;
  let arrowPoints = '';
  let labelX = x1;
  let labelY = y1;

  if (dir === 'right') {
    arrowPoints = `${x1 + 1},${y1 - arrowSize / 2} ${x1 + 8},${y1} ${x1 + 1},${y1 + arrowSize / 2}`;
    labelX = x1 - 10;
    labelY = y1 + 4;
  } else if (dir === 'left') {
    arrowPoints = `${x1 - 1},${y1 - arrowSize / 2} ${x1 - 8},${y1} ${x1 - 1},${y1 + arrowSize / 2}`;
    labelX = x1 + 10;
    labelY = y1 + 4;
  } else if (dir === 'down') {
    arrowPoints = `${x1 - arrowSize / 2},${y1 + 1} ${x1},${y1 + 8} ${x1 + arrowSize / 2},${y1 + 1}`;
    labelX = x1;
    labelY = y1 - 8;
  } else {
    arrowPoints = `${x1 - arrowSize / 2},${y1 - 1} ${x1},${y1 - 8} ${x1 + arrowSize / 2},${y1 - 1}`;
    labelX = x1;
    labelY = y1 + 16;
  }

  return `
    <g class="section-cut">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0f172a" stroke-width="3" />
      <polygon points="${arrowPoints}" fill="#0f172a" />
      <text x="${labelX}" y="${labelY}" font-size="12" font-weight="800" fill="#0f172a" text-anchor="middle" font-family="sans-serif">${label}</text>
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

export function renderTitle(x: number, y: number, text: string): string {
  return `<text x="${x}" y="${y}" font-size="14" font-weight="700" fill="#0f172a" font-family="sans-serif">${text}</text>`;
}