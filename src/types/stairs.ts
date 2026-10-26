export type ViewMode = 'solid' | 'xray' | 'frame' | 'no-cladding';

export type BackgroundType = 'white' | 'park' | 'sky' | 'no';

export interface StairUserParams {
  width: number;
  height: number;
  viewMode: ViewMode;
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
  upperClearSpanMm: number;
  lowerClearSpanMm: number;
}

export interface TransverseSpacing {
  spans: number[];
  postXOffsets: number[];
  frameWidthMm: number;
  numPosts: number;
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
  totalPipeLengthM: number;
}