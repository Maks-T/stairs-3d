import {
  STEP_TREAD_DEPTH_MM,
  STEP_NOSE_OVERHANG_MM,
  REAR_OVERHANG_MM,
  RISER_THICKNESS_MM,
  NOSE_INNER_GAP_MM,
  PROFILE_TUBE_SIZE_MM
} from '../../constants/stairs-config';
import type { StepNodeMetrics } from '../../types/stairs';

export function calculateStepNodeMetrics(): StepNodeMetrics {
  const frontOverhangMm = RISER_THICKNESS_MM + NOSE_INNER_GAP_MM + STEP_NOSE_OVERHANG_MM;
  const rearOverhangMm = REAR_OVERHANG_MM;
  const upperFrameDepthMm = STEP_TREAD_DEPTH_MM - frontOverhangMm - rearOverhangMm;
  const upperClearSpanMm = upperFrameDepthMm - (2 * PROFILE_TUBE_SIZE_MM);
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