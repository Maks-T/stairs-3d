import { STAIRS_NORMS, STEP_NODE } from './constants';
import type { StairModule, StepPlan } from './types';

const EPS = 0.01;

// равные ступени в пределах норм, подступенок не шире доски
export function planSteps(m: StairModule, heightMm: number, hasRisers: boolean): StepPlan {
  const boardLimit = hasRisers
    ? m.boardWidth + m.treadThickness + STEP_NODE.RISER_TOP_CLEARANCE_MM
    : Number.POSITIVE_INFINITY;
  const minStep = STAIRS_NORMS.MIN_STEP_HEIGHT;
  const maxStep = Math.min(STAIRS_NORMS.MAX_STEP_HEIGHT, boardLimit);

  const maxCount = Math.max(1, Math.ceil(heightMm / minStep) + 1);
  let best: { n: number; h: number; violation: number } | null = null;

  for (let n = 1; n <= maxCount; n++) {
    const h = heightMm / n;
    const violation = Math.max(minStep - h, h - maxStep, 0);
    const isValid = violation <= EPS;
    const isBetter = ((): boolean => {
      if (!best) return true;
      const bestValid = best.violation <= EPS;
      if (isValid !== bestValid) return isValid;
      if (!isValid) return violation < best.violation;
      return Math.abs(h - STAIRS_NORMS.TARGET_STEP_HEIGHT) < Math.abs(best.h - STAIRS_NORMS.TARGET_STEP_HEIGHT) - EPS;
    })();
    if (isBetter) best = { n, h, violation };
  }

  const chosen = best ?? { n: 1, h: heightMm, violation: 0 };
  const stepHeightMm = chosen.h;
  const isValid = chosen.violation <= EPS;
  const riserHeightMm = hasRisers
    ? Math.max(0, stepHeightMm - m.treadThickness - STEP_NODE.RISER_TOP_CLEARANCE_MM)
    : 0;
  const ripWidthMm = hasRisers ? Math.max(0, m.boardWidth - riserHeightMm) : 0;

  const warnings: string[] = [];
  const fmt = (v: number): string => String(Math.round(v * 10) / 10);

  if (!isValid) {
    const reason = stepHeightMm > maxStep
      ? `выше предела ${fmt(maxStep)} мм` +
        (boardLimit < STAIRS_NORMS.MAX_STEP_HEIGHT ? ` (предел сужен шириной доски ${m.boardWidth} мм)` : '')
      : `ниже минимума ${fmt(minStep)} мм`;
    warnings.push(
      `Высоту ${fmt(heightMm)} мм нельзя разделить на равные ступени ${fmt(minStep)}-${fmt(maxStep)} мм: ` +
        `ближайший вариант ${chosen.n} ступ. по ${fmt(stepHeightMm)} мм, ${reason}.`
    );
  }

  // 2h + b
  const blondel = 2 * stepHeightMm + m.treadDepth;
  if (isValid && (blondel < STAIRS_NORMS.BLONDEL_MIN || blondel > STAIRS_NORMS.BLONDEL_MAX)) {
    warnings.push(
      `Удобство шага: 2h + b = ${Math.round(blondel)} мм при норме ${STAIRS_NORMS.BLONDEL_MIN}-${STAIRS_NORMS.BLONDEL_MAX} мм.`
    );
  }

  return {
    stepCount: chosen.n,
    stepHeightMm,
    minStepHeightMm: minStep,
    maxStepHeightMm: maxStep,
    riserHeightMm,
    boardWidthMm: m.boardWidth,
    ripWidthMm,
    isValid,
    warnings
  };
}
