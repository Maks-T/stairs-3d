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
  width: number;
  height: number;
  viewMode: ViewMode;
  hasRisers: boolean;
  hasSideCladding: boolean;
  showFasteners: boolean;
  atlasIndex: number;
  background: BackgroundType;
}

export interface BoxElement {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
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

export interface StairLayoutResult {
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
}