import type { StairLayoutResult } from '@/types/stairs';
import {
  STEP_NOSE_OVERHANG_MM,
  RISER_THICKNESS_MM,
  PROFILE_TUBE_SIZE_MM,
  FASTENERS_CONFIG,
  CORNER_CONFIG
} from '@/constants/stairs-config';
import {
  createSvgDefs,
  createSvgHeader,
  renderDimensionLine,
  renderRect,
  renderTitle
} from './svg-primitives';

export function generateCornerDetailsSvg(layout: StairLayoutResult): string {
  const width = 1100;
  const height = 750;

  const svgParts: string[] = [
    createSvgHeader(width, height, `0 0 ${width} ${height}`),
    createSvgDefs(),
    renderTitle(40, 35, 'Узлы сопряжений и схемы расстановки крепежа (по ГОСТ 23118 / ВСТГ.001.000 СБ)')
  ];

  // Узел 1: Свес ступени, подступенок и точка крепления саморезом
  const u1X = 60;
  const u1Y = 70;
  svgParts.push(
    renderRect(u1X, u1Y, 440, 260, '#ffffff', '#cbd5e1', 1),
    renderTitle(u1X + 16, u1Y + 28, 'Узел 1 — Носик ступени CM 305 и подступенок 11 мм'),
    renderRect(u1X + 50, u1Y + 90, 40, 40, '#f1f5f9', '#0f172a', 1.5), // труба 40х40
    renderRect(u1X + 50, u1Y + 65, 305, 25, 'url(#board-hatch)', '#0f172a', 1.5), // ступень 25 мм
    renderRect(u1X + 38, u1Y + 90, RISER_THICKNESS_MM, 120, '#cbd5e1', '#0f172a', 1.2), // подступенок 11 мм
    `<circle cx="${u1X + 104}" cy="${u1Y + 77}" r="4" fill="#dc2626" />`, // саморез 4.8х50
    `<text x="${u1X + 115}" y="${u1Y + 81}" font-size="11" font-weight="600" fill="#dc2626" font-family="sans-serif">Саморез 4.8×50 Torx</text>`
  );

  svgParts.push(
    renderDimensionLine({
      x1: u1X + 38,
      y1: u1Y + 65,
      x2: u1X + 50,
      y2: u1Y + 65,
      text: String(RISER_THICKNESS_MM),
      offset: -18,
      orientation: 'horizontal'
    }),
    renderDimensionLine({
      x1: u1X + 38 + RISER_THICKNESS_MM,
      y1: u1Y + 90,
      x2: u1X + 50 + STEP_NOSE_OVERHANG_MM,
      y2: u1Y + 90,
      text: String(STEP_NOSE_OVERHANG_MM),
      offset: 25,
      orientation: 'horizontal',
      textSide: 'end'
    })
  );

  // Узел 2: Угловой стык 45° и сдвоенные диагонали каркаса
  const u2X = 550;
  const u2Y = 70;
  svgParts.push(
    renderRect(u2X, u2Y, 490, 260, '#ffffff', '#cbd5e1', 1),
    renderTitle(u2X + 16, u2Y + 28, 'Узел 2 — Сдвоенные диагональные лаги 45° и зазор шва'),
    // Параллельные трубы 40х40
    `<line x1="${u2X + 70}" y1="${u2Y + 200}" x2="${u2X + 260}" y2="${u2Y + 80}" stroke="#7c3aed" stroke-width="24" stroke-linecap="square" />`,
    `<line x1="${u2X + 120}" y1="${u2Y + 230}" x2="${u2X + 310}" y2="${u2Y + 110}" stroke="#7c3aed" stroke-width="24" stroke-linecap="square" />`,
    // Линия чистового шва доски 45°
    `<line x1="${u2X + 50}" y1="${u2Y + 240}" x2="${u2X + 330}" y2="${u2Y + 60}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="6 3" />`,
    `<circle cx="${u2X + 175}" cy="${u2Y + 135}" r="4" fill="#dc2626" />`,
    `<circle cx="${u2X + 205}" cy="${u2Y + 175}" r="4" fill="#dc2626" />`,
    `<text x="${u2X + 220}" y="${u2Y + 155}" font-size="11" font-weight="700" fill="#7c3aed" font-family="monospace">Зазор 42.43 мм</text>`,
    `<text x="${u2X + 220}" y="${u2Y + 172}" font-size="11" font-weight="600" fill="#475569" font-family="monospace">Отступ 41.21 мм по оси</text>`,
    `<text x="${u2X + 220}" y="${u2Y + 190}" font-size="11" font-weight="600" fill="#0284c7" font-family="monospace">Смещение 30 мм от угла</text>`
  );

  // Блок технических требований по чертежу ВСТГ.001.000 СБ
  const tX = 60;
  const tY = 360;
  const reqLines = [
    'ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ К ИЗГОТОВЛЕНИЮ И МОНТАЖУ (ВСТГ.001.000 СБ):',
    `1. Каркас: профильная труба ${PROFILE_TUBE_SIZE_MM}×${PROFILE_TUBE_SIZE_MM}×2 мм (ГОСТ 8639-82). Сварные швы зачистить заподлицо.`,
    `2. Диагональные лаги 45° сместить от вершин углов на ${CORNER_CONFIG.DIAGONAL_CORNER_OFFSET_MM} мм для провара корневого шва.`,
    `3. Чистый зазор между параллельными диагональными трубами составляет ровно 42.43 мм (под крепеж 41-42 мм от оси).`,
    `4. Ступени CM 305 крепить саморезами ${FASTENERS_CONFIG.TREAD_SCREW_SPEC} (предварительное засверливание Ø${FASTENERS_CONFIG.TREAD_DRILL_BIT_MM} мм).`,
    `5. Подступенки и обшивку крепить саморезами ${FASTENERS_CONFIG.CLADDING_SCREW_SPEC} (засверливание Ø${FASTENERS_CONFIG.CLADDING_DRILL_BIT_MM} мм).`,
    '6. В угловом стыке ступеней (45°) соблюдать температурный зазор 2-3 мм.',
    '7. Предельные отклонения линейных размеров металлокаркаса — не более ±2 мм (ГОСТ 23118-2019, класс точности 2).',
    `8. Текущая конфигурация: ${layout.stairType}, ступеней: ${layout.stepCount}, высота шага: ${Math.round(layout.stepHeight)} мм.`
  ];

  svgParts.push(
    renderRect(tX, tY, 980, 320, '#f8fafc', '#94a3b8', 1),
    `<g font-family="sans-serif" font-size="12" fill="#0f172a">`
  );

  reqLines.forEach((line, idx) => {
    const yPos = tY + 34 + idx * 28;
    const isHeading = idx === 0;
    svgParts.push(
      `<text x="${tX + 24}" y="${yPos}" font-weight="${isHeading ? '800' : '500'}" fill="${isHeading ? '#0369a1' : '#334155'}">${line}</text>`
    );
  });

  svgParts.push('</g>');
  svgParts.push('</svg>');
  return svgParts.join('\n');
}