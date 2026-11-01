import type { STAIR_TYPES, SUPPORT_MODES } from './constants';

export type StairType = (typeof STAIR_TYPES)[number];

export type SupportMode = (typeof SUPPORT_MODES)[number];

// товары, мм
export interface StairSpec {
  tread: { depthMm: number; thicknessMm: number; maxJoistPitchMm: number };
  board: { thicknessMm: number; widthMm: number };
  tube: { sizeMm: number };
}

// производные размеры
export interface StairModule {
  tube: number;
  treadDepth: number;
  treadThickness: number;
  boardThickness: number;
  boardWidth: number;
  maxJoistPitch: number;
  postPitch: number;
  frontOverhang: number;
  moduleDepth: number;
  clearSpan: number;
  cornerTargetSpan: number;
  cornerJoistOffset: number;
}

export interface StairInput {
  stairType: StairType;
  widthMm: number;
  heightMm: number;
  hasRisers: boolean;
  hasSideCladding: boolean;
  supportMode: SupportMode;
  postPitchMm: number;
  spec: StairSpec;
}

// x от оси марша, z от стены, y вверх
export interface BoxElement {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationY?: number;
  cutAngleLeftDeg?: number;
  cutAngleRightDeg?: number;
  polygonXZ?: Array<[number, number]>;
  // части одной доски
  partId?: string;
}

export interface StepPlan {
  stepCount: number;
  stepHeightMm: number;
  minStepHeightMm: number;
  maxStepHeightMm: number;
  riserHeightMm: number;
  boardWidthMm: number;
  ripWidthMm: number;
  isValid: boolean;
  warnings: string[];
}

export interface TransverseSpacing {
  spans: number[];
  postXOffsets: number[];
  frameWidthMm: number;
  numPosts: number;
}

export type FastenerPointType = 'tread' | 'riser' | 'cladding';

export interface FastenerPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  type: FastenerPointType;
}

export interface FastenersItemSummary {
  spec: string;
  countRaw: number;
  countWithReserve: number;
  boxesCount: number;
  drillBitDiameterMm: number;
}

export interface FastenersSummary {
  treads: FastenersItemSummary;
  risersAndCladding: FastenersItemSummary;
  breakdown: { treadsCount: number; risersCount: number; sideCladdingCount: number };
  totalScrewsWithReserve: number;
}

export interface CutPart {
  id: string;
  name: string;
  lengthMm: number;
  angleLeftDeg: number;
  angleRightDeg: number;
}

export interface StairParts {
  tubes: CutPart[];
  treads: CutPart[];
  boards: CutPart[];
}

export interface FormLayout {
  totalDepth: number;
  treads: BoxElement[];
  risers: BoxElement[];
  cladding: BoxElement[];
  frameTubes: BoxElement[];
  spacing: TransverseSpacing;
}

export interface StairLayoutResult extends FormLayout {
  stairType: StairType;
  supportMode: SupportMode;
  module: StairModule;
  stepPlan: StepPlan;
  stepCount: number;
  stepHeight: number;
  totalWidth: number;
  totalHeight: number;
  totalPipeLengthM: number;
  fastenerPoints: FastenerPoint[];
  fasteners: FastenersSummary;
  parts: StairParts;
}
