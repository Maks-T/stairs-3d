import type { StairModule } from '../types';

export interface FormContext {
  m: StairModule;
  widthMm: number;
  stepCount: number;
  stepHeight: number;
  hasRisers: boolean;
  hasSideCladding: boolean;
}
