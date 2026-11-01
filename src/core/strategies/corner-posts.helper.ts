import {
  POST_PITCH_MM,
  PROFILE_TUBE_SIZE_MM as T
} from '@/constants/stairs-config';
import type { BoxElement } from '@/types/stairs';
import { createPost } from './corner-frame.helper';

const TOLERANCE_MM = 0.6;

/**
 * Внутренние колонки опор между двумя крайними: равномерно, шаг между осями не больше maxPitchMm.
 * Крайние колонки в результат не входят.
 */
export function distributeInteriorColumns(
  fromX: number,
  toX: number,
  maxPitchMm: number = POST_PITCH_MM
): number[] {
  const length = Math.abs(toX - fromX);
  if (length <= maxPitchMm) return [];
  const spans = Math.ceil(length / maxPitchMm);
  const step = (toX - fromX) / spans;
  const result: number[] = [];
  for (let k = 1; k < spans; k++) result.push(fromX + step * k);
  return result;
}

/**
 * Опоры на общей сетке (колонки × ряды): независимо от поперечин.
 * Ряды лежат на осях передних балок ярусов и у стены, колонки общие для всех рядов.
 * Опора ставится только там, где в плане есть балка, и доходит до её нижней грани.
 */
export function buildPostGrid(tubes: BoxElement[], columnsX: number[], rowsZ: number[]): BoxElement[] {
  const supports = tubes.filter((t) => !t.polygonXZ && t.height <= T + 0.5);
  const columns = [...columnsX].sort((a, b) => a - b).filter((x, i, arr) => i === 0 || x - (arr[i - 1] ?? x) > 1);
  const posts: BoxElement[] = [];

  rowsZ.forEach((z, rowIdx) => {
    columns.forEach((x, colIdx) => {
      const covering = supports.filter((t) =>
        Math.abs(x - t.x) <= t.width / 2 + TOLERANCE_MM && Math.abs(z - t.z) <= t.depth / 2 + TOLERANCE_MM
      );
      if (covering.length === 0) return;
      // если над точкой оказалось несколько балок, опора доходит до самой низкой
      const beam = covering.reduce((low, t) => (t.y < low.y ? t : low));
      const height = beam.y - T / 2;
      if (height <= 1) return;
      posts.push(createPost(`post-grid-c${colIdx + 1}-r${rowIdx + 1}`, x, height / 2, z, height));
    });
  });

  return posts;
}
