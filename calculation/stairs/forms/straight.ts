import { riserHeightOf } from '../module';
import { buildSideCladding } from '../boards/side-cladding';
import { calcJoistSpacing, calcTransverseSpacing } from '../frame/spacing';
import type { BoxElement, FormLayout, StairModule, TransverseSpacing } from '../types';
import type { FormContext } from './form-context';

function buildTreads(c: FormContext): BoxElement[] {
  const { m, stepCount, stepHeight } = c;
  return Array.from({ length: stepCount }, (_, i) => {
    const zBack = (stepCount - 1 - i) * m.moduleDepth;
    return {
      id: `tread-${i + 1}`,
      x: 0,
      y: (i + 1) * stepHeight - m.treadThickness / 2,
      z: zBack + m.treadDepth / 2,
      width: c.widthMm,
      height: m.treadThickness,
      depth: m.treadDepth
    };
  });
}

function buildRisers(c: FormContext, frameWidthMm: number): BoxElement[] {
  const { m, stepCount, stepHeight } = c;
  const h = riserHeightOf(m, stepHeight);
  return Array.from({ length: stepCount }, (_, i) => ({
    id: `riser-${i + 1}`,
    x: 0,
    y: i * stepHeight + h / 2,
    z: (stepCount - i) * m.moduleDepth + m.boardThickness / 2,
    width: frameWidthMm,
    height: h,
    depth: m.boardThickness
  }));
}

function buildFrame(m: StairModule, stepCount: number, stepHeight: number, spacing: TransverseSpacing, postOffsets: number[]): BoxElement[] {
  const T = m.tube;
  const tubes: BoxElement[] = [];
  const halfWidth = spacing.frameWidthMm / 2;
  const columnX = (offset: number): number => -halfWidth + offset + T / 2;

  // опоры
  const rowsZ = [T / 2, ...Array.from({ length: stepCount }, (_, r) => (r + 1) * m.moduleDepth - T / 2)];
  rowsZ.forEach((z, r) => {
    const level = r <= 1 ? stepCount : stepCount - r + 1;
    const height = level * stepHeight - m.treadThickness - T;
    postOffsets.forEach((offset) => {
      const pIdx = spacing.postXOffsets.indexOf(offset);
      if (pIdx < 0) return;
      tubes.push({ id: `post-r${r}-p${pIdx + 1}`, x: columnX(offset), y: height / 2, z, width: T, height, depth: T });
    });
  });

  for (let level = 1; level <= stepCount; level++) {
    const beamY = level * stepHeight - m.treadThickness - T / 2;
    const zRear = (stepCount - level) * m.moduleDepth;
    const zFront = zRear + m.moduleDepth;
    const beam = (id: string, z: number): BoxElement => ({
      id,
      x: 0,
      y: beamY,
      z,
      width: spacing.frameWidthMm,
      height: T,
      depth: T
    });
    tubes.push(beam(`beam-front-lvl${level}`, zFront - T / 2), beam(`beam-rear-lvl${level}`, zRear + T / 2));
    spacing.postXOffsets.forEach((offset, pIdx) => {
      tubes.push({
        id: `stringer-lvl${level}-p${pIdx + 1}`,
        x: columnX(offset),
        y: beamY,
        z: (zRear + zFront) / 2,
        width: T,
        height: T,
        depth: m.clearSpan
      });
    });
  }
  return tubes;
}

export function buildStraight(c: FormContext): FormLayout {
  const { m, stepCount, stepHeight } = c;
  const frameWidthMm = Math.max(m.tube * 2, c.widthMm - 2 * m.boardThickness);
  const postSpacing = calcTransverseSpacing(frameWidthMm, m.tube, m.postPitch);
  const spacing = calcJoistSpacing(postSpacing, m.maxJoistPitch, m.tube);
  const sideX = c.widthMm / 2 - m.boardThickness / 2;

  return {
    totalDepth: stepCount * m.moduleDepth + m.frontOverhang,
    treads: buildTreads(c),
    risers: c.hasRisers ? buildRisers(c, frameWidthMm) : [],
    cladding: c.hasSideCladding
      ? [
          ...buildSideCladding(m, stepCount, stepHeight, -sideX, 'cladding-left'),
          ...buildSideCladding(m, stepCount, stepHeight, sideX, 'cladding-right')
        ]
      : [],
    frameTubes: buildFrame(m, stepCount, stepHeight, spacing, postSpacing.postXOffsets),
    spacing
  };
}
