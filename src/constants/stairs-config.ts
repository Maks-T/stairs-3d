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

// Геометрия ступени CM 305
export const STEP_TREAD_DEPTH_MM = 305;
export const STEP_TREAD_THICKNESS_MM = 25;
export const STEP_NOSE_OVERHANG_MM = 20; // СП 59.13330 п. 6.1.8
export const STEP_NOSE_LIP_HEIGHT_MM = 10;
export const STEP_NOSE_RADIUS_MM = 4; // СП 118.13330 п. 6.11 (радиус скругления ребра проступи)
export const REAR_OVERHANG_MM = 0;

// Геометрия подступенков и доски обшивки 11х145
export const RISER_THICKNESS_MM = 11;
export const RISER_STOCK_HEIGHT_MM = 145;
export const RISER_TOP_CLEARANCE_MM = 3; // СП 29.13330 п. 5.25
export const NOSE_INNER_GAP_MM = 3;
export const DRAINAGE_GAP_MM = 0;

export const CLADDING_STOCK_LENGTH_MM = 3000;
export const CLADDING_SAW_KERF_MM = 3;

// Профильная труба каркаса
export const PROFILE_TUBE_SIZE_MM = 40;
export const PROFILE_WALL_THICKNESS_MM = 2;
export const MAX_STRINGER_AXIS_STEP_MM = 400; // ГОСТ 23120-2016

// Унифицированный модуль металлокаркаса ступеней
export const STEP_FRAME_MODULE_DEPTH_MM = 271; // Габарит ячейки каркаса ступени
export const STEP_FRAME_CLEAR_SPAN_MM = 191; // 271 - 40 - 40 (единый размер перемычек)
export const TREAD_SIDE_OVERHANG_MM = 11; // Боковой свес ступени над каркасом под доску 11 мм

// Диапазоны параметров
export const TARGET_STEP_HEIGHT_MM = STAIRS_NORMS.TARGET_STEP_HEIGHT;
export const MIN_STEP_HEIGHT_MM = STAIRS_NORMS.MIN_STEP_HEIGHT;
export const MAX_STEP_HEIGHT_MM = STAIRS_NORMS.MAX_STEP_HEIGHT;

export const MIN_STAIR_WIDTH_MM = STAIRS_NORMS.MIN_STAIR_WIDTH;
export const MAX_STAIR_WIDTH_MM = 3000;
export const MIN_STAIR_HEIGHT_MM = 150;
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