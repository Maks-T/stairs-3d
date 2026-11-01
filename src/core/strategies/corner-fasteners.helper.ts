import {
  FASTENERS_CONFIG,
  STEP_FRAME_CLEAR_SPAN_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM,
  PROFILE_TUBE_SIZE_MM as T
} from '@/constants/stairs-config';
import type { BoxElement, FastenerPoint } from '@/types/stairs';

// Ось крайних балок яруса отстоит от оси поперечины на (271 - 40) / 2 = 115.5 мм:
// это 54 мм от переднего края ступени и 20 мм от заднего (чертёж ВСТГ.001.000 СБ)
const beamAxisOffsetMm = (): number => (STEP_FRAME_MODULE_DEPTH_MM - T) / 2;
// Саморезы по оси диагонали (41.21 мм от линии шва) ставим на этих долях длины диагонали
const DIAGONAL_SCREW_FRACTIONS = [0.25, 0.75] as const;

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1;

function makePoint(id: string, x: number, y: number, z: number): FastenerPoint {
  return {
    id,
    x,
    y,
    z,
    normalX: 0,
    normalY: 1,
    normalZ: 0,
    type: 'tread',
    spec: FASTENERS_CONFIG.TREAD_SCREW_SPEC
  };
}

/**
 * Точки крепления ступеней угловых маршей, выведенные из реального каркаса:
 *  - по 2 самореза на каждую поперечину / торцевую перемычку (над крайними балками);
 *  - по 2 самореза по оси каждой диагонали на угловом стыке 45°.
 */
export function buildCornerTreadFastenerPoints(tubes: BoxElement[]): FastenerPoint[] {
  const points: FastenerPoint[] = [];
  const seen = new Set<string>();

  const add = (id: string, x: number, y: number, z: number): void => {
    const key = `${Math.round(x)}|${Math.round(y)}|${Math.round(z)}`;
    if (seen.has(key)) return;
    seen.add(key);
    points.push(makePoint(id, x, y, z));
  };

  tubes.forEach((tube) => {
    if (!near(tube.height, T)) return;
    const topY = tube.y + T / 2 + STEP_TREAD_THICKNESS_MM;

    if (tube.polygonXZ && tube.polygonXZ.length === 4) {
      const [p1, p2, p3, p4] = tube.polygonXZ as [
        [number, number],
        [number, number],
        [number, number],
        [number, number]
      ];
      const m1: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      const m2: [number, number] = [(p3[0] + p4[0]) / 2, (p3[1] + p4[1]) / 2];
      DIAGONAL_SCREW_FRACTIONS.forEach((t, k) => {
        add(
          `fastener-${tube.id}-${k + 1}`,
          m1[0] + (m2[0] - m1[0]) * t,
          topY,
          m1[1] + (m2[1] - m1[1]) * t
        );
      });
      return;
    }

    if (!/joist|cap/.test(tube.id)) return;

    const spansZ = near(tube.width, T) &&
      (near(tube.depth, STEP_FRAME_CLEAR_SPAN_MM) || near(tube.depth, STEP_FRAME_MODULE_DEPTH_MM));
    const spansX = near(tube.depth, T) && near(tube.width, STEP_FRAME_CLEAR_SPAN_MM);

    if (spansZ) {
      add(`fastener-${tube.id}-rear`, tube.x, topY, tube.z - beamAxisOffsetMm());
      add(`fastener-${tube.id}-front`, tube.x, topY, tube.z + beamAxisOffsetMm());
    } else if (spansX) {
      add(`fastener-${tube.id}-a`, tube.x - beamAxisOffsetMm(), topY, tube.z);
      add(`fastener-${tube.id}-b`, tube.x + beamAxisOffsetMm(), topY, tube.z);
    }
  });

  return points;
}
