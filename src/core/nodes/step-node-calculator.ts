import {
  STEP_NOSE_OVERHANG_MM,
  REAR_OVERHANG_MM,
  RISER_THICKNESS_MM,
  NOSE_INNER_GAP_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  STEP_FRAME_CLEAR_SPAN_MM
} from '@/constants/stairs-config';
import type { StepNodeMetrics } from '@/types/stairs';

export function calculateStepNodeMetrics(): StepNodeMetrics {
  const frontOverhangMm = RISER_THICKNESS_MM + NOSE_INNER_GAP_MM + STEP_NOSE_OVERHANG_MM;
  const rearOverhangMm = REAR_OVERHANG_MM;
  const upperFrameDepthMm = STEP_FRAME_MODULE_DEPTH_MM;
  const stepClearSpanMm = STEP_FRAME_CLEAR_SPAN_MM;
  const tierStepRunMm = STEP_FRAME_MODULE_DEPTH_MM;

  return {
    frontOverhangMm,
    rearOverhangMm,
    tierStepRunMm,
    upperFrameDepthMm,
    stepClearSpanMm,
    sideOverhangMm: RISER_THICKNESS_MM
  };
}

export function calculateVisibleRiserHeight(stepHeightMm: number, treadThicknessMm: number): number {
  return Math.max(0, stepHeightMm - treadThicknessMm);
}