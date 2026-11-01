import { CORNER } from '../constants';
import { riserHeightOf, tierZBounds } from '../module';
import { buildCornerDiagonals, buildPostGrid, buildSideWingFrame, buildXJoistRow } from '../frame/corner-frame';
import { calcTransverseSpacing, distributeInteriorColumns } from '../frame/spacing';
import type { BoxElement, FormLayout } from '../types';
import type { FormContext } from './form-context';

const SIDES = [
  { dir: -1, isLeft: true, name: 'left', short: 'l' },
  { dir: 1, isLeft: false, name: 'right', short: 'r' }
] as const;

function tierX(c: FormContext, level: number) {
  const half = Math.max(c.m.tube * 4, c.widthMm - 2 * c.m.boardThickness) / 2;
  const expansion = (c.stepCount - level) * c.m.moduleDepth;
  return { half, xLeft: -half - expansion, xRight: half + expansion, isTop: level === c.stepCount };
}

function buildTreads(c: FormContext): BoxElement[] {
  const { m, stepCount, stepHeight } = c;
  const o = m.frontOverhang;
  const treads: BoxElement[] = [];

  for (let level = 1; level <= stepCount; level++) {
    const { xLeft, xRight, isTop } = tierX(c, level);
    const y = level * stepHeight - m.treadThickness / 2;
    const zNose = tierZBounds(m, level, stepCount).zFront + o;
    const miter = isTop ? 0 : CORNER.MITER_ANGLE_DEG;

    treads.push({
      id: `tread-double-front-${level}`,
      x: 0,
      y,
      z: zNose - m.treadDepth / 2,
      width: xRight - xLeft + 2 * o,
      height: m.treadThickness,
      depth: m.treadDepth,
      cutAngleLeftDeg: miter,
      cutAngleRightDeg: miter
    });

    if (isTop) continue;
    SIDES.forEach(({ isLeft, name }) => {
      treads.push({
        id: `tread-double-${name}-${level}`,
        x: isLeft ? xLeft - o + m.treadDepth / 2 : xRight + o - m.treadDepth / 2,
        y,
        z: zNose / 2,
        width: zNose,
        height: m.treadThickness,
        depth: m.treadDepth,
        rotationY: isLeft ? -Math.PI / 2 : Math.PI / 2,
        cutAngleLeftDeg: isLeft ? 0 : CORNER.MITER_ANGLE_DEG,
        cutAngleRightDeg: isLeft ? CORNER.MITER_ANGLE_DEG : 0
      });
    });
  }
  return treads;
}

function buildRisers(c: FormContext): BoxElement[] {
  const { m, stepCount, stepHeight } = c;
  const b = m.boardThickness;
  const h = riserHeightOf(m, stepHeight);
  const risers: BoxElement[] = [];

  for (let level = 1; level <= stepCount; level++) {
    const { xLeft, xRight } = tierX(c, level);
    const { zFront, zRear } = tierZBounds(m, level, stepCount);
    const y = (level - 1) * stepHeight + h / 2;

    // фасадный перекрывает углы над боковыми
    risers.push({
      id: `riser-double-front-${level}`,
      x: 0,
      y,
      z: zFront + b / 2,
      width: Math.max(m.tube, xRight - xLeft) + 2 * b,
      height: h,
      depth: b
    });

    SIDES.forEach(({ isLeft, short }) => {
      risers.push({
        id: `riser-double-side-outer-${short}-${level}`,
        x: isLeft ? xLeft - b / 2 : xRight + b / 2,
        y,
        z: zFront / 2,
        width: b,
        height: h,
        depth: zFront
      });
      if (level < stepCount) {
        risers.push({
          id: `riser-double-side-inner-${short}-${level + 1}`,
          x: isLeft ? xLeft + m.moduleDepth - b / 2 : xRight - m.moduleDepth + b / 2,
          y: level * stepHeight + h / 2,
          z: zRear / 2,
          width: b,
          height: h,
          depth: zRear
        });
      }
    });
  }
  return risers;
}

function buildFrame(c: FormContext): BoxElement[] {
  const { m, stepCount, stepHeight } = c;
  const T = m.tube;
  const tubes: BoxElement[] = [];

  for (let level = 1; level <= stepCount; level++) {
    const { half, xLeft, xRight, isTop } = tierX(c, level);
    const beamY = level * stepHeight - m.treadThickness - T / 2;
    const { zFront, zRear } = tierZBounds(m, level, stepCount);
    const xInnerLeft = xLeft + m.moduleDepth;
    const xInnerRight = xRight - m.moduleDepth;
    const beamX = (id: string, width: number, z: number): BoxElement => ({
      id,
      x: 0,
      y: beamY,
      z,
      width,
      height: T,
      depth: T
    });

    if (isTop) {
      const width = Math.max(T, xRight - xLeft);
      tubes.push(beamX(`beam-double-front-lvl${level}`, width, zFront - T / 2), beamX(`beam-double-rear-lvl${level}`, width, zRear + T / 2));
      [-half + T / 2, half - T / 2].forEach((x, i) => {
        tubes.push({
          id: `beam-top-landing-cap-${i === 0 ? 'l' : 'r'}`,
          x,
          y: beamY,
          z: (zFront + zRear) / 2,
          width: T,
          height: T,
          depth: m.clearSpan
        });
      });
      tubes.push(
        ...buildXJoistRow(m, {
          idPrefix: `joist-double-lvl${level}`,
          fromX: -half + T / 2,
          toX: half - T / 2,
          zFront,
          zRear,
          beamY,
          includeStart: false,
          includeEnd: false
        })
      );
      continue;
    }

    tubes.push(beamX(`beam-double-front-lvl${level}`, xRight - xLeft - 2 * T, zFront - T / 2));
    if (xInnerRight - xInnerLeft > 0) {
      tubes.push(beamX(`beam-double-rear-lvl${level}`, xInnerRight - xInnerLeft, zRear + T / 2));
    }

    SIDES.forEach(({ isLeft, short }) => {
      const prefix = `beam-double-${short}-lvl${level}`;
      const wing = {
        idPrefix: prefix,
        isLeft,
        xOuter: isLeft ? xLeft : xRight,
        xInner: isLeft ? xInnerLeft : xInnerRight,
        zFront,
        zRear,
        beamY
      };
      tubes.push(...buildSideWingFrame(m, wing), ...buildCornerDiagonals(m, { ...wing, idPrefix: `${prefix}-diag` }));
    });

    const joistFromX = xInnerLeft + m.cornerJoistOffset;
    const joistToX = xInnerRight - m.cornerJoistOffset;
    if (joistToX - joistFromX > T) {
      tubes.push(
        ...buildXJoistRow(m, {
          idPrefix: `joist-double-lvl${level}`,
          fromX: joistFromX,
          toX: joistToX,
          zFront,
          zRear,
          beamY,
          includeStart: true,
          includeEnd: true
        })
      );
    }
  }

  const rowsZ = [T / 2];
  const wingColumns: number[] = [];
  for (let level = 1; level <= stepCount; level++) {
    const { xLeft, xRight } = tierX(c, level);
    rowsZ.push(tierZBounds(m, level, stepCount).zFront - T / 2);
    wingColumns.push(xLeft + T / 2, xRight - T / 2);
  }
  const { half } = tierX(c, stepCount);
  tubes.push(
    ...buildPostGrid(m, tubes, [...wingColumns, ...distributeInteriorColumns(-half + T / 2, half - T / 2, m.postPitch)], rowsZ)
  );
  return tubes;
}

export function buildCornerDouble(c: FormContext): FormLayout {
  const { m, stepCount } = c;
  const { half } = tierX(c, stepCount);
  return {
    totalDepth: stepCount * m.moduleDepth + m.frontOverhang,
    treads: buildTreads(c),
    risers: c.hasRisers ? buildRisers(c) : [],
    cladding: [],
    frameTubes: buildFrame(c),
    spacing: calcTransverseSpacing(2 * half + 2 * (stepCount - 1) * m.moduleDepth, m.tube, m.cornerTargetSpan)
  };
}
