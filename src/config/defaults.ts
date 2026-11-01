import { DEFAULT_CLADDING_ID, DEFAULT_PROFILE_ID, DEFAULT_TREAD_ID } from '@/catalog/stairs-catalog';
import type { StairUserParams } from '@/types/app';

export const DEFAULT_PARAMS: StairUserParams = {
  stairType: 'straight',
  width: 1500,
  height: 300,
  viewMode: 'solid',
  hasRisers: true,
  hasSideCladding: true,
  showFasteners: false,
  atlasIndex: 0,
  background: 'white',
  profileId: DEFAULT_PROFILE_ID,
  treadId: DEFAULT_TREAD_ID,
  claddingId: DEFAULT_CLADDING_ID,
  postPitchMm: 400,
  supportMode: 'posts'
};
