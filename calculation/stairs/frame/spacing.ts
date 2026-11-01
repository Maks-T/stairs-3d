import type { TransverseSpacing } from '../types';

// сетка опор
export function calcTransverseSpacing(frameWidthMm: number, postSizeMm: number, maxAxisStepMm: number): TransverseSpacing {
  const numSpans = Math.max(1, Math.ceil((frameWidthMm - postSizeMm) / maxAxisStepMm));
  const totalClear = Math.max(0, frameWidthMm - (numSpans + 1) * postSizeMm);
  const baseSpan = Math.floor(totalClear / numSpans);
  const remainder = totalClear % numSpans;
  const spans = new Array<number>(numSpans).fill(baseSpan);

  let left = 0;
  let right = numSpans - 1;
  let added = 0;
  while (added < remainder) {
    spans[left] = (spans[left] ?? 0) + 1;
    added++;
    if (added < remainder && left !== right) {
      spans[right] = (spans[right] ?? 0) + 1;
      added++;
    }
    left++;
    right--;
  }

  const postXOffsets: number[] = [0];
  let x = 0;
  spans.forEach((span) => {
    x += postSizeMm + span;
    postXOffsets.push(x);
  });

  return { spans, postXOffsets, frameWidthMm, numPosts: numSpans + 1 };
}

// сетка лаг
export function calcJoistSpacing(postSpacing: TransverseSpacing, maxJoistPitchMm: number, postSizeMm: number): TransverseSpacing {
  const offsets: number[] = [];
  const posts = postSpacing.postXOffsets;
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i] ?? 0;
    const b = posts[i + 1] ?? 0;
    const parts = Math.max(1, Math.ceil((b - a) / maxJoistPitchMm));
    for (let k = 0; k < parts; k++) offsets.push(Math.round(a + ((b - a) * k) / parts));
  }
  offsets.push(posts[posts.length - 1] ?? 0);
  const spans = offsets.slice(1).map((x, i) => x - (offsets[i] ?? 0) - postSizeMm);
  return { ...postSpacing, postXOffsets: offsets, spans, numPosts: offsets.length };
}

export function distributeInteriorColumns(fromX: number, toX: number, maxPitchMm: number): number[] {
  const length = Math.abs(toX - fromX);
  if (length <= maxPitchMm) return [];
  const spans = Math.ceil(length / maxPitchMm);
  const step = (toX - fromX) / spans;
  return Array.from({ length: spans - 1 }, (_, k) => fromX + step * (k + 1));
}

export function calcUniformClearSpans(totalClearMm: number, maxSpanMm: number, tubeMm: number): number[] {
  if (totalClearMm <= 0) return [];
  const numSpans = Math.max(1, Math.ceil(totalClearMm / maxSpanMm));
  const numTubes = numSpans - 1;
  const clearSpan = Number((Math.max(0, totalClearMm - numTubes * tubeMm) / numSpans).toFixed(1));
  const offsets: number[] = [];
  let current = 0;
  for (let i = 0; i < numTubes; i++) {
    current += clearSpan + tubeMm / 2;
    offsets.push(Number(current.toFixed(1)));
    current += tubeMm / 2;
  }
  return offsets;
}
