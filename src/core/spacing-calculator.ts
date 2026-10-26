import type { TransverseSpacing } from '../types/stairs';

export function calculateTransverseSpacing(
  frameWidthMm: number,
  postSizeMm: number,
  maxAxisStepMm: number
): TransverseSpacing {
  const numSpans = Math.max(1, Math.ceil((frameWidthMm - postSizeMm) / maxAxisStepMm));
  const numPosts = numSpans + 1;
  const totalPostsWidth = numPosts * postSizeMm;
  const totalClear = Math.max(0, frameWidthMm - totalPostsWidth);

  const baseSpan = Math.floor(totalClear / numSpans);
  const remainder = totalClear % numSpans;

  const spans = new Array<number>(numSpans).fill(baseSpan);

  let left = 0;
  let right = numSpans - 1;
  let added = 0;

  while (added < remainder) {
    const leftVal = spans[left];
    if (leftVal !== undefined) spans[left] = leftVal + 1;
    added++;

    if (added < remainder && left !== right) {
      const rightVal = spans[right];
      if (rightVal !== undefined) spans[right] = rightVal + 1;
      added++;
    }
    left++;
    right--;
  }

  const postXOffsets: number[] = [0];
  let currentX = 0;
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (span === undefined) continue;
    currentX += postSizeMm + span;
    postXOffsets.push(currentX);
  }

  return { spans, postXOffsets, frameWidthMm, numPosts };
}