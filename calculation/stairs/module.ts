import { CORNER, STEP_NODE } from './constants';
import type { StairModule, StairSpec } from './types';

// модуль яруса: 305 − 34 = 271, в свету 191
export function createStairModule(spec: StairSpec, postPitchMm: number): StairModule {
  const tube = spec.tube.sizeMm;
  const frontOverhang = spec.board.thicknessMm + STEP_NODE.NOSE_INNER_GAP_MM + STEP_NODE.NOSE_OVERHANG_MM;
  const moduleDepth = spec.tread.depthMm - frontOverhang;
  return {
    tube,
    treadDepth: spec.tread.depthMm,
    treadThickness: spec.tread.thicknessMm,
    boardThickness: spec.board.thicknessMm,
    boardWidth: spec.board.widthMm,
    maxJoistPitch: spec.tread.maxJoistPitchMm,
    postPitch: postPitchMm,
    frontOverhang,
    moduleDepth,
    clearSpan: moduleDepth - 2 * tube,
    cornerTargetSpan: Math.min(CORNER.TARGET_SPAN_MM, spec.tread.maxJoistPitchMm - 80),
    // первая поперечина за парой диагоналей
    cornerJoistOffset: Math.max(CORNER.MIN_JOIST_OFFSET_MM, Math.ceil(35 + tube * (Math.SQRT2 - 0.5)))
  };
}

// верх балок яруса
export function beamTopOf(m: StairModule, level: number, stepHeight: number): number {
  return level * stepHeight - m.treadThickness;
}

export function tierZBounds(m: StairModule, level: number, stepCount: number): { zFront: number; zRear: number } {
  const fromTop = stepCount - level;
  return { zFront: (fromTop + 1) * m.moduleDepth, zRear: fromTop * m.moduleDepth };
}

export function riserHeightOf(m: StairModule, stepHeight: number): number {
  return Math.max(0, stepHeight - m.treadThickness - STEP_NODE.RISER_TOP_CLEARANCE_MM);
}
