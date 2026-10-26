export const STEP_TREAD_DEPTH_MM = 305;
export const STEP_TREAD_THICKNESS_MM = 25;
export const STEP_NOSE_OVERHANG_MM = 20;

export const RISER_THICKNESS_MM = 11;
export const RISER_STOCK_HEIGHT_MM = 145;

export const RISER_TOP_CLEARANCE_MM = 3;
export const NOSE_INNER_GAP_MM = 3;
export const DRAINAGE_GAP_MM = 3;

export const PROFILE_TUBE_SIZE_MM = 40;
export const PROFILE_WALL_THICKNESS_MM = 2;
export const MAX_STRINGER_AXIS_STEP_MM = 400;

export const TARGET_STEP_HEIGHT_MM = 150;
export const MIN_STEP_HEIGHT_MM = 120;
export const MAX_STEP_HEIGHT_MM = 180;

export const MIN_STAIR_WIDTH_MM = 800;
export const MAX_STAIR_WIDTH_MM = 3000;
export const MIN_STAIR_HEIGHT_MM = 150;
export const MAX_STAIR_HEIGHT_MM = 1500;

export const CLADDING_OVERHANG_MM = 10; // Свис боковой зашивки за габарит каркаса

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