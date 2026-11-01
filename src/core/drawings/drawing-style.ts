/**
 * Единый стиль всех чертежей: цвета, толщины линий и шрифты.
 * Все построители (вид сбоку, разрез, план стоек, каркасы по уровням) берут значения только отсюда.
 */
export const DRAW = {
  line: '#0f172a',
  lineThin: '#334155',
  fill: '#ffffff',
  riser: '#cbd5e1',
  cladding: '#e2e8f0',
  ground: '#64748b',
  concrete: '#e7e5e4',
  hatch: '#94a3b8',

  // Ступени в плане (светло-жёлтая заливка как на эталонных чертежах)
  treadFill: '#fbf3c4',
  treadStroke: '#a8a252',

  // Каркас под настилом (едва заметный пунктир)
  beamFaint: '#a16207',
  beamFaintOpacity: 0.55,

  dim: '#0284c7',
  dimText: '#0369a1',
  dimExt: '#94a3b8',
  levelValue: '#dc2626',

  strokeBeam: 1.6,
  strokeOutline: 1.4,
  strokeThin: 1,
  strokeDim: 1.2,
  strokeExt: 0.8,

  fontMono: "Consolas, 'Courier New', monospace",
  fontSans: "'Segoe UI', Arial, sans-serif",
  titleSize: 16,
  subtitleSize: 13,
  dimSize: 12,
  noteSize: 11,

  titleY: 32
} as const;
