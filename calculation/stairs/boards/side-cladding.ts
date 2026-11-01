import type { BoxElement, StairModule } from '../types';

// обшивка досками снизу вверх с подрезкой по профилю
export function buildSideCladding(
  m: StairModule,
  stepCount: number,
  stepHeight: number,
  x: number,
  idPrefix: string
): BoxElement[] {
  const levels = Array.from({ length: stepCount }, (_, i) => {
    const level = i + 1;
    return {
      top: level * stepHeight - m.treadThickness,
      length: (stepCount - level + 1) * m.moduleDepth + m.boardThickness
    };
  });
  const faceTop = levels[stepCount - 1]?.top ?? 0;
  const result: BoxElement[] = [];

  for (let k = 0; k * m.boardWidth < faceTop - 0.5; k++) {
    const y0 = k * m.boardWidth;
    const y1 = Math.min(y0 + m.boardWidth, faceTop);
    const partId = `${idPrefix}-b${k + 1}`;

    const segments: Array<{ z0: number; z1: number; h: number }> = [];
    let z0 = 0;
    for (let i = stepCount - 1; i >= 0; i--) {
      const lv = levels[i];
      if (!lv) continue;
      const h = Math.min(y1, lv.top) - y0;
      if (h <= 0.5) break;
      const last = segments[segments.length - 1];
      if (last && Math.abs(last.h - h) < 0.01) last.z1 = lv.length;
      else segments.push({ z0, z1: lv.length, h });
      z0 = lv.length;
    }

    segments.forEach((s, j) => {
      result.push({
        id: `${partId}-${j + 1}`,
        partId,
        x,
        y: y0 + s.h / 2,
        z: (s.z0 + s.z1) / 2,
        width: m.boardThickness,
        height: s.h,
        depth: s.z1 - s.z0
      });
    });
  }
  return result;
}
