import { isBaseRail, isPost, tubeOutline } from '../lib/plan-geometry';
import type { BoxElement, StairModule } from '../types';

const EPS = 1;

export interface ConcreteLayer {
  tier: number;
  minX: number;
  maxX: number;
  maxZ: number;
  // верх бетона = низ балок яруса
  topY: number;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < EPS;

// коробка яруса на бетоне
export function concreteLayers(m: StairModule, tubes: BoxElement[], stepCount: number, stepHeight: number): ConcreteLayer[] {
  const frame = tubes.filter((t) => !isPost(t) && !isBaseRail(t));
  const tierOf = (t: BoxElement): number => Math.round((t.y + m.tube / 2 + m.treadThickness) / stepHeight);
  const layers: ConcreteLayer[] = [];
  for (let tier = 1; tier <= stepCount; tier++) {
    const pts = frame.filter((t) => tierOf(t) >= tier).flatMap(tubeOutline);
    if (!pts.length) continue;
    layers.push({
      tier,
      minX: Math.min(...pts.map((p) => p[0])),
      maxX: Math.max(...pts.map((p) => p[0])),
      maxZ: Math.max(...pts.map((p) => p[1])),
      topY: tier * stepHeight - m.treadThickness - m.tube
    });
  }
  return layers;
}

// бетон: стойки на гранях коробок, на ступень вниз
export function applyConcreteBase(m: StairModule, tubes: BoxElement[], stepCount: number, stepHeight: number): BoxElement[] {
  const T = m.tube;
  const frame = tubes.filter((t) => !isPost(t));
  const layers = concreteLayers(m, frame, stepCount, stepHeight);
  const layer = (tier: number): ConcreteLayer | undefined => layers.find((l) => l.tier === tier);
  const onFace = (tier: number, x: number, z: number): boolean => {
    const box = layer(tier);
    return !!box && (near(x, box.minX + T / 2) || near(x, box.maxX - T / 2) || near(z, box.maxZ - T / 2));
  };

  const posts: BoxElement[] = [];
  tubes.filter(isPost).forEach((post) => {
    const top = post.y + post.height / 2;
    const owner = Math.round((top + T + m.treadThickness) / stepHeight);
    if (!onFace(owner, post.x, post.z)) return;
    let lowest = owner;
    while (lowest > 1 && onFace(lowest - 1, post.x, post.z)) lowest--;
    const bottom = lowest === 1 ? T : (layer(lowest - 1)?.topY ?? T);
    const height = top - bottom;
    if (height <= 1) return;
    posts.push({ ...post, id: `post-c${posts.length + 1}`, y: bottom + height / 2, height });
  });

  const base = layer(1);
  const rails: BoxElement[] = [];
  if (base) {
    const sideDepth = base.maxZ - T;
    rails.push({
      id: 'rail-front',
      x: (base.minX + base.maxX) / 2,
      y: T / 2,
      z: base.maxZ - T / 2,
      width: base.maxX - base.minX,
      height: T,
      depth: T
    });
    [base.minX + T / 2, base.maxX - T / 2].forEach((x, i) => {
      rails.push({ id: `rail-side-${i + 1}`, x, y: T / 2, z: sideDepth / 2, width: T, height: T, depth: sideDepth });
    });
  }

  return [...frame, ...posts, ...rails];
}
