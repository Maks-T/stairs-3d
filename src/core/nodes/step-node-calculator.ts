import {
  STEP_TREAD_DEPTH_MM,
  STEP_NOSE_OVERHANG_MM,
  RISER_THICKNESS_MM,
  NOSE_INNER_GAP_MM,
  PROFILE_TUBE_SIZE_MM
} from '../../constants/stairs-config';
import type { StepNodeMetrics } from '../../types/stairs';

/**
 * Калькулятор геометрических узлов ступени:
 * Узел 1: носик 20 мм + зазор 3 мм + подступенок 11 мм = вылет 34 мм
 * Узел 2: свес сзади 11 мм под толщину заднего подступенка
 */
export function calculateStepNodeMetrics(): StepNodeMetrics {
  const frontOverhangMm = RISER_THICKNESS_MM + NOSE_INNER_GAP_MM + STEP_NOSE_OVERHANG_MM;
  const rearOverhangMm = RISER_THICKNESS_MM;

  const upperFrameDepthMm = STEP_TREAD_DEPTH_MM - frontOverhangMm - rearOverhangMm;
  const upperClearSpanMm = upperFrameDepthMm - (2 * PROFILE_TUBE_SIZE_MM);

  // Шаг смещения яруса каркаса по глубине
  const tierStepRunMm = STEP_TREAD_DEPTH_MM - frontOverhangMm;
  const lowerClearSpanMm = tierStepRunMm - PROFILE_TUBE_SIZE_MM;

  return {
    frontOverhangMm,
    rearOverhangMm,
    tierStepRunMm,
    upperFrameDepthMm,
    upperClearSpanMm,
    lowerClearSpanMm
  };
}

export function calculateVisibleRiserHeight(stepHeightMm: number, treadThicknessMm: number): number {
  return Math.max(0, stepHeightMm - treadThicknessMm);
}