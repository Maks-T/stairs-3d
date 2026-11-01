import {
  CORNER_CONFIG,
  STEP_FRAME_CLEAR_SPAN_MM,
  PROFILE_TUBE_SIZE_MM as T
} from '@/constants/stairs-config';
import type { BoxElement } from '@/types/stairs';
import { calculateCornerDiagonalPair, calculateUniformClearSpans } from './corner-geometry.helper';


export function createPost(id: string, x: number, y: number, z: number, height: number): BoxElement {
  return { id, x, y, z, width: T, height, depth: T };
}

export function calculateJoistPitch(distanceBetweenCentersMm: number): { count: number; pitchMm: number } {
  if (distanceBetweenCentersMm <= 0) return { count: 1, pitchMm: 0 };
  const maxPitch = CORNER_CONFIG.TARGET_TRAPEZOID_SPAN_MM + T;
  const count = Math.max(1, Math.ceil(distanceBetweenCentersMm / maxPitch));
  return { count, pitchMm: distanceBetweenCentersMm / count };
}

export interface XJoistRowParams {
  idPrefix: string;
  fromX: number;
  toX: number;
  zFront: number;
  zRear: number;
  beamY: number;
  includeStartJoist: boolean;
  includeEndJoist: boolean;
}

export function buildXJoistRow(p: XJoistRowParams): BoxElement[] {
  const result: BoxElement[] = [];
  const zMid = (p.zFront + p.zRear) / 2;
  const distance = Math.abs(p.toX - p.fromX);
  const dir = p.toX >= p.fromX ? 1 : -1;

  const addJoist = (id: string, x: number): void => {
    result.push({
      id,
      x,
      y: p.beamY,
      z: zMid,
      width: T,
      height: T,
      depth: STEP_FRAME_CLEAR_SPAN_MM
    });
  };

  if (p.includeStartJoist) addJoist(`${p.idPrefix}-start`, p.fromX);

  if (distance > T) {
    const { count, pitchMm } = calculateJoistPitch(distance);
    for (let k = 1; k < count; k++) {
      addJoist(`${p.idPrefix}-s${k}`, p.fromX + dir * pitchMm * k);
    }
  }

  if (p.includeEndJoist) addJoist(`${p.idPrefix}-end`, p.toX);

  return result;
}

export interface CornerDiagonalsParams {
  idPrefix: string;
  isLeft: boolean;
  xOuter: number;
  xInner: number;
  zFront: number;
  zRear: number;
  beamY: number;
}

export function buildCornerDiagonals(p: CornerDiagonalsParams): BoxElement[] {
  const specs = calculateCornerDiagonalPair({
    isLeft: p.isLeft,
    xOuter: p.xOuter,
    xInner: p.xInner,
    zFront: p.zFront,
    zRear: p.zRear
  });
  return specs.map((spec) => ({
    id: `${p.idPrefix}-${spec.idSuffix}`,
    x: spec.x,
    y: p.beamY,
    z: spec.z,
    width: T,
    height: T,
    depth: spec.lengthMm,
    rotationY: spec.rotationY,
    cutAngleLeftDeg: spec.cutAngleLeftDeg,
    cutAngleRightDeg: spec.cutAngleRightDeg,
    polygonXZ: spec.polygonXZ
  }));
}

export interface SideWingParams {
  idPrefix: string;
  isLeft: boolean;
  xOuter: number;
  xInner: number;
  zFront: number;
  zRear: number;
  beamY: number;
}

export function buildSideWingFrame(p: SideWingParams): BoxElement[] {
  const result: BoxElement[] = [];
  const outerX = p.isLeft ? p.xOuter + T / 2 : p.xOuter - T / 2;
  const innerX = p.isLeft ? p.xInner - T / 2 : p.xInner + T / 2;
  const cornerSpanX = (outerX + innerX) / 2;

  // Внешняя продольная балка крыла от стены до фасадного угла
  result.push({
    id: `${p.idPrefix}-outer`,
    x: outerX,
    y: p.beamY,
    z: p.zFront / 2,
    width: T,
    height: T,
    depth: p.zFront
  });

  // Внутренняя продольная балка крыла от стены до наружной грани задней балки яруса (Z = zRear + T),
  // чтобы угол внутренней балки и задней балки был замкнут без выемки
  if (p.zRear > T) {
    const innerDepth = p.zRear + T;
    result.push({
      id: `${p.idPrefix}-inner`,
      x: innerX,
      y: p.beamY,
      z: innerDepth / 2,
      width: T,
      height: T,
      depth: innerDepth
    });
  }

  // Задняя замыкающая перемычка крыла у стены
  result.push({
    id: `${p.idPrefix}-wall-cap`,
    x: cornerSpanX,
    y: p.beamY,
    z: T / 2,
    width: STEP_FRAME_CLEAR_SPAN_MM,
    height: T,
    depth: T
  });


  // Промежуточные поперечины на длинных участках крыльев
  const straightWingSpan = p.zRear - T;
  if (straightWingSpan > CORNER_CONFIG.TARGET_TRAPEZOID_SPAN_MM) {
    const uniform = calculateUniformClearSpans(straightWingSpan, CORNER_CONFIG.TARGET_TRAPEZOID_SPAN_MM, T);
    uniform.tubeCenterOffsetsMm.forEach((offsetMm, k: number) => {
      const curZ = T + offsetMm;
      result.push({
        id: `${p.idPrefix}-joist-s${k + 1}`,
        x: cornerSpanX,
        y: p.beamY,
        z: curZ,
        width: STEP_FRAME_CLEAR_SPAN_MM,
        height: T,
        depth: T
      });
    });
  }

  return result;
}
