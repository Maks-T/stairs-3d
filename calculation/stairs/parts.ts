import { isBaseRail, isPost, tubeLengthMm } from './lib/plan-geometry';
import type { BoxElement, CutPart, FormLayout, StairModule, StairParts } from './types';

const round = (v: number): number => Math.round(v);

function tubeName(m: StairModule, tube: BoxElement, length: number): string {
  if (isBaseRail(tube)) return `Нижняя обвязка ${length} мм`;
  if (tube.polygonXZ) return `Диагональ ${length} мм`;
  if (isPost(tube)) return `Стойка ${length} мм`;
  if (length === round(m.clearSpan)) return `Перемычка ${length} мм`;
  return `Балка ${length} мм`;
}

function part(id: string, name: string, lengthMm: number, angleLeftDeg = 0, angleRightDeg = 0): CutPart {
  return { id, name, lengthMm, angleLeftDeg, angleRightDeg };
}

function boardLength(b: BoxElement): number {
  return round(Math.max(b.width, b.depth));
}

function claddingParts(cladding: BoxElement[]): CutPart[] {
  const groups = new Map<string, BoxElement[]>();
  cladding.forEach((b) => {
    const key = b.partId ?? b.id;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  });
  return [...groups.entries()].map(([id, pieces]) => {
    const alongZ = pieces.every((b) => b.depth >= b.width);
    const lo = Math.min(...pieces.map((b) => (alongZ ? b.z - b.depth / 2 : b.x - b.width / 2)));
    const hi = Math.max(...pieces.map((b) => (alongZ ? b.z + b.depth / 2 : b.x + b.width / 2)));
    const length = round(hi - lo);
    return part(id, `Боковая доска ${length} мм`, length);
  });
}

export function calcStairParts(m: StairModule, layout: FormLayout): StairParts {
  const tubes = layout.frameTubes.map((t) => {
    const length = round(tubeLengthMm(t));
    return part(t.id, tubeName(m, t, length), length, t.cutAngleLeftDeg, t.cutAngleRightDeg);
  });
  const treads = layout.treads.map((t) => {
    const length = round(t.width);
    return part(t.id, `Ступень ${length} мм`, length, t.cutAngleLeftDeg, t.cutAngleRightDeg);
  });
  const boards = [
    ...claddingParts(layout.cladding),
    ...layout.risers.map((r) => part(r.id, `Подступенок ${boardLength(r)} мм`, boardLength(r)))
  ];
  return { tubes, treads, boards };
}

// одинаковые заготовки: длина и кол-во
export function groupParts(parts: CutPart[]): Array<{ lengthMm: number; count: number }> {
  const counts = new Map<number, number>();
  parts.forEach((p) => counts.set(p.lengthMm, (counts.get(p.lengthMm) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([lengthMm, count]) => ({ lengthMm, count }));
}
