import type { StairLayoutResult } from '@/types/stairs';
import { generateCornerSectionSvg } from './corner-section-builder';

/**
 * Разрез А-А для любого типа лестницы: настоящий разрез по модели у стены (Z = 0), вид от стены.
 * Для прямого марша все ярусы одной ширины, для угловых получается ступенчатый силуэт.
 */
export function generateFrontViewSvg(layout: StairLayoutResult): string {
  return generateCornerSectionSvg(layout);
}
