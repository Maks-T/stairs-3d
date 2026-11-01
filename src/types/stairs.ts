
import type { StairType } from '@/constants/stairs-config';

/** Чем держится каркас: стойками или бетонным основанием (коробки ярусов) */
export type SupportMode = 'posts' | 'concrete';

export type ViewMode = 'solid' | 'xray' | 'frame';

export type BackgroundType = 'white' | 'park' | 'sky' | 'no';

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
  spec: string;
}

export interface StairUserParams {
  stairType?: StairType;
  width: number;
  height: number;
  viewMode: ViewMode;
  hasRisers: boolean;
  hasSideCladding: boolean;
  showFasteners: boolean;
  atlasIndex: number;
  background: BackgroundType;
  profileId?: string;
  treadId?: string;
  claddingId?: string;
  /** шаг опор между осями, мм */
  postPitchMm?: number;
  supportMode?: SupportMode;
}

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
}

export interface StepNodeMetrics {
  frontOverhangMm: number;
  rearOverhangMm: number;
  tierStepRunMm: number;
  upperFrameDepthMm: number;
  stepClearSpanMm: number;
  sideOverhangMm: number;
}

export interface TransverseSpacing {
  spans: number[];
  postXOffsets: number[];
  frameWidthMm: number;
  numPosts: number;
}

export interface FastenersItemSummary {
  spec: string;
  countRaw: number;
  countWithReserve: number;
  boxesCount: number;
  drillBitDiameterMm: number;
}

export interface FastenersCalculationResult {
  treads: FastenersItemSummary;
  risersAndCladding: FastenersItemSummary;
  breakdown: {
    treadsCount: number;
    risersCount: number;
    sideCladdingCount: number;
  };
  totalScrewsWithReserve: number;
}

export interface SideCladdingPiece {
  tierIndex: number;
  lengthMm: number;
  heightMm: number;
  postsCrossed: number;
}

import type { StepPlan } from '@/core/step-planner';

export interface StairLayoutResult {
  stairType: StairType;
  stepCount: number;
  stepHeight: number;
  visibleRiserHeight: number;
  totalWidth: number;
  totalHeight: number;
  totalDepth: number;
  cladding: BoxElement[];
  treads: BoxElement[];
  risers: BoxElement[];
  frameTubes: BoxElement[];
  spacing: TransverseSpacing;
  metrics: StepNodeMetrics;
  fasteners: FastenersCalculationResult;
  fastenerPoints: FastenerPoint[];
  totalPipeLengthM: number;
  /** подбор числа и высоты ступеней (диапазон, подступенок, предупреждения) */
  stepPlan?: StepPlan;
  supportMode?: SupportMode;
}


