export const ATLAS_TEXTURE_PATH = './textures/wood_atlas.jpg';

export const ATLAS_UV_MAP: Record<number, { name: string; uv: [number, number, number, number] }> = {
  0: { name: 'Honey Teak', uv: [0.0, 0.0, 0.25, 0.25] },
  1: { name: 'Dark Chocolate', uv: [0.25, 0.0, 0.5, 0.25] },
  2: { name: 'Light Oak', uv: [0.5, 0.0, 0.75, 0.25] },
  3: { name: 'Classic Teak', uv: [0.75, 0.0, 1.0, 0.25] },
  4: { name: 'Ash Gray', uv: [0.0, 0.25, 0.25, 0.5] },
  5: { name: 'Charcoal', uv: [0.25, 0.25, 0.5, 0.5] },
  6: { name: 'Silver Gray', uv: [0.5, 0.25, 0.75, 0.5] },
  7: { name: 'Graphite Velvet', uv: [0.75, 0.25, 1.0, 0.5] },
  8: { name: 'Mahogany', uv: [0.0, 0.5, 0.25, 0.75] },
  9: { name: 'Walnut', uv: [0.25, 0.5, 0.5, 0.75] },
  10: { name: 'Cedar', uv: [0.5, 0.5, 0.75, 0.75] },
  11: { name: 'Driftwood', uv: [0.75, 0.5, 1.0, 0.75] },
  12: { name: 'Light Gray Matte', uv: [0.0, 0.75, 0.25, 1.0] }
};

// носик ступени
export const TREAD_NOSE = {
  LIP_HEIGHT_MM: 10,
  RADIUS_MM: 4,
  LIP_THICKNESS_MM: 20
} as const;

// саморезы
export const SCREW_LOOK = {
  TREAD_SHAFT_LENGTH_MM: 50,
  TREAD_SHAFT_RADIUS_MM: 2.4,
  TREAD_HEAD_RADIUS_MM: 4.8,
  TREAD_HEAD_HEIGHT_MM: 1.6,
  BOARD_SHAFT_LENGTH_MM: 32,
  BOARD_SHAFT_RADIUS_MM: 2.1,
  BOARD_HEAD_RADIUS_MM: 4.2,
  BOARD_HEAD_HEIGHT_MM: 1.4,
  TIP_LENGTH_MM: 3.5,
  // цвет самореза
  COLOR: 0x9f1239,
  METALNESS: 0.55,
  ROUGHNESS: 0.3,
  EMISSIVE_INTENSITY: 0.18
} as const;
