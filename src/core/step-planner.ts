import {
  MAX_STEP_HEIGHT_MM,
  MIN_STEP_HEIGHT_MM,
  RISER_STOCK_HEIGHT_MM,
  RISER_TOP_CLEARANCE_MM,
  STAIRS_NORMS,
  STEP_TREAD_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM,
  TARGET_STEP_HEIGHT_MM
} from '@/constants/stairs-config';

export interface StepPlan {
  stepCount: number;
  stepHeightMm: number;
  /** допустимый диапазон высоты ступени для текущих норм и доски подступенка */
  minStepHeightMm: number;
  maxStepHeightMm: number;
  /** высота доски подступенка: шаг - толщина ступени - зазор под носиком (0, если подступенков нет) */
  riserHeightMm: number;
  boardWidthMm: number;
  /** сколько доски срезается по ширине, чтобы получить нужный подступенок */
  ripWidthMm: number;
  /** укладывается ли шаг в допустимый диапазон */
  isValid: boolean;
  warnings: string[];
}

const EPS = 0.01;

/**
 * Подбор числа и высоты ступеней для любой высоты крыльца.
 * Ступени одинаковые, высота в пределах норм (MIN..MAX), а подступенок не выше ширины доски:
 * доску нельзя нарастить по ширине (стык на подступенке некрасив и непрочен), поэтому верхний предел
 * сужается до ширины доски + толщина ступени + зазор. Среди допустимых вариантов берётся ближайший к эталонной высоте.
 */
export function planSteps(heightMm: number, hasRisers: boolean): StepPlan {
  const boardLimit = hasRisers
    ? RISER_STOCK_HEIGHT_MM + STEP_TREAD_THICKNESS_MM + RISER_TOP_CLEARANCE_MM
    : Number.POSITIVE_INFINITY;
  const minStep = MIN_STEP_HEIGHT_MM;
  const maxStep = Math.min(MAX_STEP_HEIGHT_MM, boardLimit);

  const maxCount = Math.max(1, Math.ceil(heightMm / Math.max(1, minStep)) + 1);
  let best: { n: number; h: number; violation: number } | null = null;

  for (let n = 1; n <= maxCount; n++) {
    const h = heightMm / n;
    const violation = Math.max(minStep - h, h - maxStep, 0);
    const isValid = violation <= EPS;
    const better = (): boolean => {
      if (!best) return true;
      const bestValid = best.violation <= EPS;
      if (isValid !== bestValid) return isValid;
      if (!isValid) return violation < best.violation;
      return Math.abs(h - TARGET_STEP_HEIGHT_MM) < Math.abs(best.h - TARGET_STEP_HEIGHT_MM) - EPS;
    };
    if (better()) best = { n, h, violation };
  }

  const chosen = best ?? { n: 1, h: heightMm, violation: 0 };
  const stepHeightMm = chosen.h;
  const isValid = chosen.violation <= EPS;
  const riserHeightMm = hasRisers
    ? Math.max(0, stepHeightMm - STEP_TREAD_THICKNESS_MM - RISER_TOP_CLEARANCE_MM)
    : 0;
  const ripWidthMm = hasRisers ? Math.max(0, RISER_STOCK_HEIGHT_MM - riserHeightMm) : 0;

  const warnings: string[] = [];
  const fmt = (v: number): string => String(Math.round(v * 10) / 10);

  if (!isValid) {
    const reason = stepHeightMm > maxStep
      ? `выше предела ${fmt(maxStep)} мм` + (boardLimit < MAX_STEP_HEIGHT_MM
        ? ` (предел сужен шириной доски ${RISER_STOCK_HEIGHT_MM} мм)`
        : '')
      : `ниже минимума ${fmt(minStep)} мм`;
    warnings.push(
      `Высоту ${fmt(heightMm)} мм нельзя разделить на равные ступени ${fmt(minStep)}-${fmt(maxStep)} мм: ` +
      `ближайший вариант ${chosen.n} ступ. по ${fmt(stepHeightMm)} мм, ${reason}.`
    );
  }

  // Формула удобства 2h + b (СП 118.13330 п. 6.11)
  const blondel = 2 * stepHeightMm + STEP_TREAD_DEPTH_MM;
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
    boardWidthMm: RISER_STOCK_HEIGHT_MM,
    ripWidthMm,
    isValid,
    warnings
  };
}
