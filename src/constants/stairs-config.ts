
// Нормативы РФ: СП 59.13330.2020, СП 118.13330.2022, СП 55.13330.2016, ГОСТ 23120-2016
// Нормативы РБ: СН 3.02.01-2019, ТКП 45-3.02-318
export const STAIRS_NORMS = {
  TARGET_STEP_HEIGHT: 150, // СП 59.13330 п. 6.1.8, СН 3.02.01 п. 5.3 (эталон уличного крыльца)
  MIN_STEP_HEIGHT: 120, // СП 59.13330 п. 6.1.8, ТКП 45-3.02-318 п. 5.2 (нижний предел)
  MAX_STEP_HEIGHT: 170, // СП 118.13330 п. 6.11 (верхний предел для улицы + лимит доски 145 мм)
  MIN_STEP_DEPTH: 280, // СП 118.13330 п. 6.11 (минимальная опора стопы)
  MAX_STEP_DEPTH: 350, // СП 118.13330 п. 6.11 (максимальная глубина шага)
  MIN_STAIR_WIDTH: 900, // СП 55.13330 п. 8.2, СН 3.02.01 п. 5.3.8 (мин. ширина марша ИЖС)
  MAX_STRINGER_STEP: 400, // ГОСТ 23120-2016, СТО НОСТРОЙ (макс. шаг лаг под композит 25 мм)
  MAX_NOSE_OVERHANG: 20, // СП 59.13330 п. 6.1.8 (свес носика не более 15-20 мм)
  DRAINAGE_GAP: 3, // СП 29.13330 п. 5.25 (дренажный зазор от застоя воды)
  BLONDEL_MIN: 600, // СП 118.13330 п. 6.11 (формула шага 2h + b)
  BLONDEL_MAX: 640 // СП 118.13330 п. 6.11
} as const;

export const STAIR_TYPES = {
  STRAIGHT: 'straight',
  CORNER_LEFT: 'corner-left',
  CORNER_RIGHT: 'corner-right',
  CORNER_DOUBLE: 'corner-double'
} as const;

export type StairType = typeof STAIR_TYPES[keyof typeof STAIR_TYPES];

// Константы геометрии угловых сопряжений под 45 градусов
export const CORNER_CONFIG: {
  MITER_ANGLE_DEG: number;
  DIAGONAL_CORNER_OFFSET_MM: number;
  SCREW_MITER_OFFSET_MM: number;
  MIN_CORNER_JOIST_OFFSET_MM: number;
  MAX_TRAPEZOID_SPAN_MM: number;
  TARGET_TRAPEZOID_SPAN_MM: number;
  DIAGONAL_CLEAR_GAP_MM: number;
} = {
  MITER_ANGLE_DEG: 45,
  DIAGONAL_CORNER_OFFSET_MM: 30, // Смещение торца диагонали от вершины для провара
  SCREW_MITER_OFFSET_MM: 41.21, // Перпендикуляр от линии шва до оси крепежа
  MIN_CORNER_JOIST_OFFSET_MM: 100, // Отступ первой прямой поперечины от угла
  MAX_TRAPEZOID_SPAN_MM: 400, // Предельный пролет по нормативам
  TARGET_TRAPEZOID_SPAN_MM: 320, // Целевой шаг поперечин
  DIAGONAL_CLEAR_GAP_MM: 42.43 // Зазор между параллельными диагоналями (30 * sqrt(2))
};

// Геометрия ступени. Значения по умолчанию соответствуют CM 305; при выборе ступени/профиля в каталоге
// их пересчитывает applyFrameGeometry() (живые привязки ES-модулей: все потребители видят новые значения).
export let STEP_TREAD_DEPTH_MM = 305;
export let STEP_TREAD_THICKNESS_MM = 25;
export const STEP_NOSE_OVERHANG_MM = 20; // СП 59.13330 п. 6.1.8
export const STEP_NOSE_LIP_HEIGHT_MM = 10;
export const STEP_NOSE_RADIUS_MM = 4; // СП 118.13330 п. 6.11 (радиус скругления ребра проступи)
export const REAR_OVERHANG_MM = 0;

// Геометрия подступенков и доски обшивки 11х145
export let RISER_THICKNESS_MM = 11;
export let RISER_STOCK_HEIGHT_MM = 145;
export const RISER_TOP_CLEARANCE_MM = 3; // СП 29.13330 п. 5.25
export const NOSE_INNER_GAP_MM = 3;
export const DRAINAGE_GAP_MM = 0;

export const CLADDING_STOCK_LENGTH_MM = 3000;
export const CLADDING_SAW_KERF_MM = 3;

export let PROFILE_TUBE_SIZE_MM = 40;
export let PROFILE_WALL_THICKNESS_MM = 2;
export let POST_PITCH_MM = 400; // шаг опор между осями, задаётся пользователем
export let MAX_STRINGER_AXIS_STEP_MM = 400; // ГОСТ 23120-2016; для выбранной ступени берётся из каталога

// Унифицированный модуль металлокаркаса ступеней
export let STEP_FRAME_MODULE_DEPTH_MM = 271; // Габарит ячейки каркаса ступени: глубина ступени - вынос (34 мм)
export let STEP_FRAME_CLEAR_SPAN_MM = 191; // 271 - 40 - 40 (размер перемычки в свету)
export let TOTAL_FRONT_OVERHANG_MM = 34; // подступенок 11 + зазор 3 + носик 20
export const TREAD_SIDE_OVERHANG_MM = 11; // Боковой свес ступени над каркасом под доску 11 мм

export const TARGET_STEP_HEIGHT_MM = STAIRS_NORMS.TARGET_STEP_HEIGHT;
export const MIN_STEP_HEIGHT_MM = STAIRS_NORMS.MIN_STEP_HEIGHT;
export const MAX_STEP_HEIGHT_MM = STAIRS_NORMS.MAX_STEP_HEIGHT;

export const MIN_STAIR_WIDTH_MM = STAIRS_NORMS.MIN_STAIR_WIDTH;
export const MAX_STAIR_WIDTH_MM = 3000;
export const MIN_STAIR_HEIGHT_MM = MIN_STEP_HEIGHT_MM; // одна ступень минимальной высоты
export const MAX_STAIR_HEIGHT_MM = 1500;

// Нормативы крепления и метизы
export const FASTENERS_CONFIG = {
  SCREWS_PER_STRINGER_TREAD: 2, // 2 самореза на лагу (техкарта монтажа ДПК)
  SCREWS_PER_POST_RISER: 2, // 2 самореза на стойку для доски 11 мм
  SCREWS_PER_POST_CLADDING_TIER: 2, // 2 самореза на стойку на каждый ряд боковины
  HARDWARE_RESERVE_FACTOR: 1.10, // Технологический запас +10%
  BOX_PACKAGE_SIZE: 100, // Кратность упаковок
  TREAD_SCREW_SPEC: '4.8×50 потай Torx со сверлом',
  CLADDING_SCREW_SPEC: '4.2×32 потай Torx в цвет ДПК',
  TREAD_DRILL_BIT_MM: 4.0,
  CLADDING_DRILL_BIT_MM: 3.5
} as const;

export const FASTENERS_GEOMETRY_CONFIG = {
  TREAD_SHAFT_LENGTH_MM: 50,
  TREAD_SHAFT_RADIUS_MM: 2.4,
  TREAD_HEAD_RADIUS_MM: 4.8,
  TREAD_HEAD_HEIGHT_MM: 1.6,
  CLADDING_SHAFT_LENGTH_MM: 32,
  CLADDING_SHAFT_RADIUS_MM: 2.1,
  CLADDING_HEAD_RADIUS_MM: 4.2,
  CLADDING_HEAD_HEIGHT_MM: 1.4,
  TIP_LENGTH_MM: 3.5,
  COLOR: 0xe11d48,
  METALNESS: 0.85,
  ROUGHNESS: 0.25
} as const;

export const ATLAS_TEXTURE_PATH = './textures/wood_atlas.jpg';

export const ATLAS_UV_MAP: Record<number, { name: string; uv: [number, number, number, number] }> = {
  0: { name: 'Honey Teak', uv: [0.00, 0.00, 0.25, 0.25] },
  1: { name: 'Dark Chocolate', uv: [0.25, 0.00, 0.50, 0.25] },
  2: { name: 'Light Oak', uv: [0.50, 0.00, 0.75, 0.25] },
  3: { name: 'Classic Teak', uv: [0.75, 0.00, 1.00, 0.25] },
  4: { name: 'Ash Gray', uv: [0.00, 0.25, 0.25, 0.50] },
  5: { name: 'Charcoal', uv: [0.25, 0.25, 0.50, 0.50] },
  6: { name: 'Silver Gray', uv: [0.50, 0.25, 0.75, 0.50] },
  7: { name: 'Graphite Velvet', uv: [0.75, 0.25, 1.00, 0.50] },
  8: { name: 'Mahogany', uv: [0.00, 0.50, 0.25, 0.75] },
  9: { name: 'Walnut', uv: [0.25, 0.50, 0.50, 0.75] },
  10: { name: 'Cedar', uv: [0.50, 0.50, 0.75, 0.75] },
  11: { name: 'Driftwood', uv: [0.75, 0.50, 1.00, 0.75] },
  12: { name: 'Light Gray Matte', uv: [0.00, 0.75, 0.25, 1.00] }
};




export interface FrameGeometryInput {
  profileSizeMm: number;
  profileWallMm: number;
  treadDepthMm: number;
  treadThicknessMm: number;
  maxJoistPitchMm: number;
  /** толщина и ширина доски подступенков и боковой зашивки */
  claddingThicknessMm: number;
  claddingWidthMm: number;
  /** шаг опор между осями, мм; по умолчанию как шаг лаг ступени */
  postPitchMm?: number;
}

/**
 * Пересчитывает все производные размеры каркаса под выбранные профиль и ступень.
 * Единственное место, где меняются `export let` значения выше.
 */
export function applyFrameGeometry(g: FrameGeometryInput): void {
  PROFILE_TUBE_SIZE_MM = g.profileSizeMm;
  PROFILE_WALL_THICKNESS_MM = g.profileWallMm;
  STEP_TREAD_DEPTH_MM = g.treadDepthMm;
  STEP_TREAD_THICKNESS_MM = g.treadThicknessMm;
  MAX_STRINGER_AXIS_STEP_MM = g.maxJoistPitchMm;
  POST_PITCH_MM = g.postPitchMm ?? g.maxJoistPitchMm;
  RISER_THICKNESS_MM = g.claddingThicknessMm;
  RISER_STOCK_HEIGHT_MM = g.claddingWidthMm;

  TOTAL_FRONT_OVERHANG_MM = RISER_THICKNESS_MM + NOSE_INNER_GAP_MM + STEP_NOSE_OVERHANG_MM;
  STEP_FRAME_MODULE_DEPTH_MM = g.treadDepthMm - TOTAL_FRONT_OVERHANG_MM + REAR_OVERHANG_MM;
  STEP_FRAME_CLEAR_SPAN_MM = STEP_FRAME_MODULE_DEPTH_MM - 2 * g.profileSizeMm;

  CORNER_CONFIG.MAX_TRAPEZOID_SPAN_MM = g.maxJoistPitchMm;
  CORNER_CONFIG.TARGET_TRAPEZOID_SPAN_MM = Math.min(320, g.maxJoistPitchMm - 80);
  // Первая поперечина должна стоять за парой диагоналей: 35 мм запас + ширина диагонали по оси - сечение + половина трубы
  const clearOfDiagonals = Math.ceil(35 + g.profileSizeMm * (Math.SQRT2 - 0.5));
  CORNER_CONFIG.MIN_CORNER_JOIST_OFFSET_MM = Math.max(100, clearOfDiagonals);
}
