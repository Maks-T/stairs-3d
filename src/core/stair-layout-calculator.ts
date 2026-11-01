import type { StairType } from '@/constants/stairs-config';
import type { StairLayoutResult, SupportMode } from '@/types/stairs';
import { applyConcreteBase, tubesTotalLengthMm } from './concrete-base';
import { buildFastenerPoints, summarizeFasteners } from './fasteners-calculator';
import { calculateStepNodeMetrics } from './nodes/step-node-calculator';
import { planSteps } from './step-planner';
import { stairStrategyRegistry } from './strategies/stair-strategy.registry';

export function calculateStairLayout(
  widthMm: number,
  heightMm: number,
  options: {
    stairType?: StairType;
    hasRisers?: boolean;
    hasSideCladding?: boolean;
    supportMode?: SupportMode;
  } = {}
): StairLayoutResult {
  const { stairType = 'straight', hasRisers = true, hasSideCladding = true, supportMode = 'posts' } = options;
  const stepPlan = planSteps(heightMm, hasRisers);
  const { stepCount, stepHeightMm: stepHeight } = stepPlan;

  const layout = stairStrategyRegistry.get(stairType).calculate({
    widthMm,
    heightMm,
    stepCount,
    stepHeight,
    metrics: calculateStepNodeMetrics(),
    options: { hasRisers, hasSideCladding }
  });

  const frameTubes = supportMode === 'concrete' ? applyConcreteBase(layout.frameTubes, stepCount, stepHeight) : layout.frameTubes;
  const fastenerPoints = buildFastenerPoints(frameTubes, layout.treads, layout.risers, layout.cladding);

  return {
    ...layout,
    frameTubes,
    stepPlan,
    supportMode,
    fastenerPoints,
    fasteners: summarizeFasteners(fastenerPoints),
    totalPipeLengthM: Number((tubesTotalLengthMm(frameTubes) / 1000).toFixed(2))
  };
}
