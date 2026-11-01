import type { StairLayoutResult, StepNodeMetrics } from '@/types/stairs';

export interface StairStrategyOptions {
  hasRisers: boolean;
  hasSideCladding: boolean;
}

export interface StairCalculationContext {
  widthMm: number;
  heightMm: number;
  stepCount: number;
  stepHeight: number;
  metrics: StepNodeMetrics;
  options: StairStrategyOptions;
}

export type StrategyLayout = Omit<StairLayoutResult, 'fasteners' | 'fastenerPoints'>;

export interface StairLayoutStrategy {
  calculate(context: StairCalculationContext): StrategyLayout;
}