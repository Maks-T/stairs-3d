import { createStairModule } from './module';
import { planSteps } from './plan-steps';
import { buildStraight } from './forms/straight';
import { buildCornerSingle } from './forms/corner-single';
import { buildCornerDouble } from './forms/corner-double';
import { applyConcreteBase } from './frame/concrete-base';
import { buildFastenerPoints, summarizeFasteners } from './fasteners';
import { calcStairParts } from './parts';
import { tubeLengthMm } from './lib/plan-geometry';
import type { FormContext } from './forms/form-context';
import type { FormLayout, StairInput, StairLayoutResult, StairType } from './types';

const FORMS: Record<StairType, (c: FormContext) => FormLayout> = {
  straight: buildStraight,
  'corner-left': (c) => buildCornerSingle(c, 'left'),
  'corner-right': (c) => buildCornerSingle(c, 'right'),
  'corner-double': buildCornerDouble
};

export function calcStairLayout(input: StairInput): StairLayoutResult {
  const m = createStairModule(input.spec, input.postPitchMm);
  const stepPlan = planSteps(m, input.heightMm, input.hasRisers);
  const { stepCount, stepHeightMm: stepHeight } = stepPlan;

  const form = FORMS[input.stairType]({
    m,
    widthMm: input.widthMm,
    stepCount,
    stepHeight,
    hasRisers: input.hasRisers,
    hasSideCladding: input.hasSideCladding
  });
  const frameTubes = input.supportMode === 'concrete' ? applyConcreteBase(m, form.frameTubes, stepCount, stepHeight) : form.frameTubes;
  const layout: FormLayout = { ...form, frameTubes };
  const fastenerPoints = buildFastenerPoints(m, layout);

  return {
    ...layout,
    stairType: input.stairType,
    supportMode: input.supportMode,
    module: m,
    stepPlan,
    stepCount,
    stepHeight,
    totalWidth: input.widthMm,
    totalHeight: input.heightMm,
    totalPipeLengthM: Number((frameTubes.reduce((s, t) => s + tubeLengthMm(t), 0) / 1000).toFixed(2)),
    fastenerPoints,
    fasteners: summarizeFasteners(fastenerPoints),
    parts: calcStairParts(m, layout)
  };
}
