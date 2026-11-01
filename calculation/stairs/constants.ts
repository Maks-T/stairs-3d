// СП 59.13330, СП 118.13330, СП 55.13330, ГОСТ 23120, СН 3.02.01, ТКП 45-3.02-318
export const STAIRS_NORMS = {
  TARGET_STEP_HEIGHT: 150,
  MIN_STEP_HEIGHT: 120,
  MAX_STEP_HEIGHT: 170,
  MIN_STAIR_WIDTH: 900,
  MAX_STAIR_WIDTH: 3000,
  MAX_STAIR_HEIGHT: 1500,
  BLONDEL_MIN: 600,
  BLONDEL_MAX: 640
} as const;

export const STAIR_TYPES = ['straight', 'corner-left', 'corner-right', 'corner-double'] as const;

export const SUPPORT_MODES = ['posts', 'concrete'] as const;

// узел носика: свес, зазор под носиком
export const STEP_NODE = {
  NOSE_OVERHANG_MM: 20,
  NOSE_INNER_GAP_MM: 3,
  RISER_TOP_CLEARANCE_MM: 3
} as const;

// угловой стык 45°
export const CORNER = {
  MITER_ANGLE_DEG: 45,
  DIAGONAL_OFFSET_MM: 30,
  SCREW_MITER_OFFSET_MM: 41.21,
  MIN_JOIST_OFFSET_MM: 100,
  TARGET_SPAN_MM: 320
} as const;

// саморезы
export const FASTENERS = {
  TREAD_FROM_NOSE_MM: 54,
  TREAD_FROM_BACK_MM: 20,
  BOARD_EDGE_MM: 25,
  RESERVE_FACTOR: 1.1,
  PACKAGE_SIZE: 100,
  TREAD_SPEC: '4.8×50 потай Torx со сверлом',
  BOARD_SPEC: '4.2×32 потай Torx в цвет ДПК',
  TREAD_DRILL_MM: 4,
  BOARD_DRILL_MM: 3.5
} as const;

export const SAW_KERF_MM = 3;
