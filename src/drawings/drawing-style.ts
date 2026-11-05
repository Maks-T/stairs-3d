// Оформление чертежей лестницы: цвета слоёв и размеры аннотаций (мм на бумаге).
export const DRAW = {
  line: '#0f172a',
  lineThin: '#334155',
  fill: '#ffffff',
  riser: '#cbd5e1',
  cladding: '#e2e8f0',
  ground: '#64748b',
  concrete: '#e7e5e4',
  hatch: '#94a3b8',

  treadFill: '#fbf3c4',
  treadStroke: '#a8a252',

  beamFaint: '#a16207',
  beamFaintOpacity: 0.55,

  dim: '#0284c7',
  dimText: '#0369a1',
  levelValue: '#dc2626',
  fastener: '#b91c1c'
} as const;

/** Размеры на бумаге, мм. В единицы модели переводятся по масштабу документа (`StairDrawing.a`). */
export const PAPER = {
  title: 5,
  subtitle: 3.5,
  dim: 2.5,
  note: 2.5,
  // шаг между параллельными размерными линиями
  dimStep: 7,
  // первая размерная линия от объекта
  dimFirst: 8
} as const;

/** Масштаб чертежей по умолчанию. */
export const DEFAULT_DRAWING_SCALE = '1:10';
