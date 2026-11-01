import { CORNER } from '../constants';
import { riserHeightOf, tierZBounds } from '../module';
import { buildSideCladding } from '../boards/side-cladding';
import { buildCornerDiagonals, buildPostGrid, buildSideWingFrame, buildXJoistRow } from '../frame/corner-frame';
import { calcTransverseSpacing, distributeInteriorColumns } from '../frame/spacing';
import type { BoxElement, FormLayout } from '../types';
import type { FormContext } from './form-context';

function tierX(c: FormContext, isLeft: boolean, level: number) {
  const half = Math.max(c.m.tube * 2, c.widthMm - 2 * c.m.boardThickness) / 2;
  const expansion = (c.stepCount - level) * c.m.moduleDepth;
  const xCorner = isLeft ? -half - expansion : half + expansion;
  return {
    half,
    xCorner,
    xInner: isLeft ? xCorner + c.m.moduleDepth : xCorner - c.m.moduleDepth,
    straightEnd: isLeft ? half : -half,
    isTop: level === c.stepCount
  };
}

function buildTreads(c: FormContext, isLeft: boolean): BoxElement[] {
  const { m, stepCount, stepHeight } = c;
  const o = m.frontOverhang;
  const treads: BoxElement[] = [];

  for (let level = 1; level <= stepCount; level++) {
    const { xCorner, straightEnd, isTop } = tierX(c, isLeft, level);
    const y = level * stepHeight - m.treadThickness / 2;
    const zNose = tierZBounds(m, level, stepCount).zFront + o;
    // свес со стороны угла
    const frontOuterX = isLeft ? xCorner - o : xCorner + o;
    const straightOuterX = isLeft ? straightEnd + o / 2 : straightEnd - o / 2;

    treads.push({
      id: `tread-front-${level}`,
      x: (frontOuterX + straightOuterX) / 2,
      y,
      z: zNose - m.treadDepth / 2,
      width: Math.abs(straightOuterX - frontOuterX),
      height: m.treadThickness,
      depth: m.treadDepth,
      cutAngleLeftDeg: isLeft && !isTop ? CORNER.MITER_ANGLE_DEG : 0,
      cutAngleRightDeg: !isLeft && !isTop ? CORNER.MITER_ANGLE_DEG : 0
    });

    if (!isTop) {
      treads.push({
        id: `tread-side-${level}`,
        x: isLeft ? xCorner - o + m.treadDepth / 2 : xCorner + o - m.treadDepth / 2,
        y,
        z: zNose / 2,
        width: zNose,
        height: m.treadThickness,
        depth: m.treadDepth,
        rotationY: isLeft ? -Math.PI / 2 : Math.PI / 2,
        cutAngleLeftDeg: !isLeft ? CORNER.MITER_ANGLE_DEG : 0,
        cutAngleRightDeg: isLeft ? CORNER.MITER_ANGLE_DEG : 0
      });
    }
  }
  return treads;
}

function buildRisers(c: FormContext, isLeft: boolean): BoxElement[] {
  const { m, stepCount, stepHeight } = c;
  const b = m.boardThickness;
  const h = riserHeightOf(m, stepHeight);
  const risers: BoxElement[] = [];

  for (let level = 1; level <= stepCount; level++) {
    const { xCorner, straightEnd } = tierX(c, isLeft, level);
    const { zFront, zRear } = tierZBounds(m, level, stepCount);
    const y = (level - 1) * stepHeight + h / 2;
    // фасадный перекрывает угол над боковым
    const frontOuterX = isLeft ? xCorner - b : xCorner + b;

    risers.push(
      {
        id: `riser-front-${level}`,
        x: (frontOuterX + straightEnd) / 2,
        y,
        z: zFront + b / 2,
        width: Math.abs(straightEnd - frontOuterX),
        height: h,
        depth: b
      },
      {
        id: `riser-side-outer-${level}`,
        x: isLeft ? xCorner - b / 2 : xCorner + b / 2,
        y,
        z: zFront / 2,
        width: b,
        height: h,
        depth: zFront
      }
    );

    if (level < stepCount) {
      risers.push({
        id: `riser-side-inner-${level + 1}`,
        x: isLeft ? xCorner + m.moduleDepth - b / 2 : xCorner - m.moduleDepth + b / 2,
        y: level * stepHeight + h / 2,
        z: zRear / 2,
        width: b,
        height: h,
        depth: zRear
      });
    }
  }
  return risers;
}

function buildFrame(c: FormContext, isLeft: boolean): BoxElement[] {
  const { m, stepCount, stepHeight } = c;
  const T = m.tube;
  const tubes: BoxElement[] = [];

  for (let level = 1; level <= stepCount; level++) {
    const { xCorner, xInner, straightEnd, isTop } = tierX(c, isLeft, level);
    const beamY = level * stepHeight - m.treadThickness - T / 2;
    const { zFront, zRear } = tierZBounds(m, level, stepCount);
    const straightSideX = isLeft ? straightEnd - T / 2 : straightEnd + T / 2;
    const cornerXPos = isLeft ? xCorner + T / 2 : xCorner - T / 2;
    const beamX = (id: string, x0: number, x1: number, z: number): BoxElement => ({
      id,
      x: (x0 + x1) / 2,
      y: beamY,
      z,
      width: Math.abs(x1 - x0),
      height: T,
      depth: T
    });
    const cap = (id: string, x: number, depth: number): BoxElement => ({
      id,
      x,
      y: beamY,
      z: (zFront + zRear) / 2,
      width: T,
      height: T,
      depth
    });

    if (isTop) {
      tubes.push(
        beamX(`beam-front-lvl${level}`, xCorner, straightEnd, zFront - T / 2),
        beamX(`beam-rear-lvl${level}`, xCorner, straightEnd, zRear + T / 2),
        cap(`beam-straight-end-cap-lvl${level}`, straightSideX, m.clearSpan),
        cap(`beam-top-end-cap-lvl${level}`, cornerXPos, m.clearSpan),
        ...buildXJoistRow(m, {
          idPrefix: `joist-lvl${level}`,
          fromX: cornerXPos,
          toX: straightSideX,
          zFront,
          zRear,
          beamY,
          includeStart: false,
          includeEnd: false
        })
      );
      continue;
    }

    const prefix = `beam-${isLeft ? 'l' : 'r'}-lvl${level}`;
    const wing = { idPrefix: prefix, isLeft, xOuter: xCorner, xInner, zFront, zRear, beamY };
    tubes.push(...buildSideWingFrame(m, wing), ...buildCornerDiagonals(m, { ...wing, idPrefix: `${prefix}-diag` }));

    // фасадная балка
    const frontX0 = isLeft ? cornerXPos + T / 2 : straightSideX + T / 2;
    const frontX1 = isLeft ? straightSideX - T / 2 : cornerXPos - T / 2;
    tubes.push({ ...beamX(`beam-front-lvl${level}`, frontX0, frontX1, zFront - T / 2), width: Math.max(T, frontX1 - frontX0) });

    // задняя балка
    const rearX0 = isLeft ? xInner : straightSideX + T / 2;
    const rearX1 = isLeft ? straightSideX - T / 2 : xInner;
    if (rearX1 - rearX0 > 0) tubes.push(beamX(`beam-rear-lvl${level}`, rearX0, rearX1, zRear + T / 2));

    tubes.push(
      cap(`beam-straight-end-cap-lvl${level}`, straightSideX, m.moduleDepth),
      ...buildXJoistRow(m, {
        idPrefix: `joist-lvl${level}`,
        fromX: isLeft ? xInner + m.cornerJoistOffset : xInner - m.cornerJoistOffset,
        toX: straightSideX + (isLeft ? -T : T),
        zFront,
        zRear,
        beamY,
        includeStart: true,
        includeEnd: false
      })
    );
  }

  // опоры
  const rowsZ = [T / 2];
  const wingColumns: number[] = [];
  for (let level = 1; level <= stepCount; level++) {
    const { xCorner } = tierX(c, isLeft, level);
    rowsZ.push(tierZBounds(m, level, stepCount).zFront - T / 2);
    wingColumns.push(isLeft ? xCorner + T / 2 : xCorner - T / 2);
  }
  const { half } = tierX(c, isLeft, stepCount);
  const landingColumn = isLeft ? -half + T / 2 : half - T / 2;
  const straightColumn = isLeft ? half - T / 2 : -half + T / 2;
  tubes.push(
    ...buildPostGrid(
      m,
      tubes,
      [...wingColumns, straightColumn, ...distributeInteriorColumns(landingColumn, straightColumn, m.postPitch)],
      rowsZ
    )
  );
  return tubes;
}

export function buildCornerSingle(c: FormContext, side: 'left' | 'right'): FormLayout {
  const { m, stepCount, stepHeight } = c;
  const isLeft = side === 'left';
  const { half } = tierX(c, isLeft, stepCount);
  const bottomFrameWidth = 2 * half + (stepCount - 1) * m.moduleDepth;
  const straightX = isLeft ? half + m.boardThickness / 2 : -half - m.boardThickness / 2;

  return {
    totalDepth: stepCount * m.moduleDepth + m.frontOverhang,
    treads: buildTreads(c, isLeft),
    risers: c.hasRisers ? buildRisers(c, isLeft) : [],
    cladding: c.hasSideCladding ? buildSideCladding(m, stepCount, stepHeight, straightX, 'cladding-straight') : [],
    frameTubes: buildFrame(c, isLeft),
    spacing: calcTransverseSpacing(bottomFrameWidth, m.tube, m.cornerTargetSpan)
  };
}
