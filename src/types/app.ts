import type { StairType, SupportMode } from '@calculation/stairs';

export type ViewMode = 'solid' | 'xray' | 'frame';

export type BackgroundType = 'white' | 'park' | 'sky' | 'no';

export interface StairUserParams {
  stairType: StairType;
  width: number;
  height: number;
  viewMode: ViewMode;
  hasRisers: boolean;
  hasSideCladding: boolean;
  showFasteners: boolean;
  atlasIndex: number;
  background: BackgroundType;
  profileId: string;
  treadId: string;
  claddingId: string;
  postPitchMm: number;
  supportMode: SupportMode;
}
