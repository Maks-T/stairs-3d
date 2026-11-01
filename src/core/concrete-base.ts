import { STEP_TREAD_THICKNESS_MM, PROFILE_TUBE_SIZE_MM as T } from '@/constants/stairs-config';
import type { BoxElement } from '@/types/stairs';
import { isPost, tubeLengthMm, tubeOutline } from './drawings/plan-geometry';

const EPS = 1;

export interface ConcreteLayer {
  tier: number;
  minX: number;
  maxX: number;
  maxZ: number;
  /** верх бетона яруса: низ балок его каркаса */
  topY: number;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < EPS;

/**
 * Каркас на бетонном основании (ВСТГ.001.000 СБ, «На бетонном основании»).
 * Горизонтальные каркасы ярусов те же, что на опорах, и лежат на бетоне.
 * Стойки берутся из той же сетки опор, но остаются только на видимых гранях коробок ярусов:
 * фасад яруса и его боковые торцы. У стены стоек нет, кроме угловых.
 * Стойка яруса опускается на одну ступень, до низа балок нижнего яруса (на бетон).
 * Если грань продолжается и у нижних ярусов (общий боковой торец), стойка идёт дальше вниз.
 * Стойки нижнего яруса стоят на нижней обвязке по земле: фасад и боковые торцы до стены.
 */
const tierOfTop = (topOfBeamMm: number, stepHeightMm: number): number =>
  Math.round((topOfBeamMm + STEP_TREAD_THICKNESS_MM) / stepHeightMm);

const beamBottomOf = (tier: number, stepHeightMm: number): number =>
  tier * stepHeightMm - STEP_TREAD_THICKNESS_MM - T;

/**
 * Коробки ярусов на бетоне: ярус `tier` вместе со всеми ярусами выше занимает в плане прямоугольник
 * от стены до фасада яруса. Бетон в нём залит до низа балок каркаса яруса.
 */
export function concreteLayers(tubes: BoxElement[], stepCount: number, stepHeightMm: number): ConcreteLayer[] {
  const frame = tubes.filter((t) => !isPost(t) && !t.id.startsWith('rail-'));
  const layers: ConcreteLayer[] = [];
  for (let tier = 1; tier <= stepCount; tier++) {
    const pts = frame.filter((t) => tierOfTop(t.y + T / 2, stepHeightMm) >= tier).flatMap(tubeOutline);
    if (!pts.length) continue;
    layers.push({
      tier,
      minX: Math.min(...pts.map((p) => p[0])),
      maxX: Math.max(...pts.map((p) => p[0])),
      maxZ: Math.max(...pts.map((p) => p[1])),
      topY: beamBottomOf(tier, stepHeightMm)
    });
  }
  return layers;
}

export function applyConcreteBase(tubes: BoxElement[], stepCount: number, stepHeightMm: number): BoxElement[] {
  const frame = tubes.filter((t) => !isPost(t));
  const gridPosts = tubes.filter(isPost);
  const tierOf = (topOfBeamMm: number): number => tierOfTop(topOfBeamMm, stepHeightMm);
  const beamBottom = (tier: number): number => beamBottomOf(tier, stepHeightMm);
  const layerList = concreteLayers(frame, stepCount, stepHeightMm);
  const layers = (tier: number): ConcreteLayer | undefined => layerList.find((l) => l.tier === tier);

  const onFace = (tier: number, x: number, z: number): boolean => {
    const box = layers(tier);
    if (!box) return false;
    return near(x, box.minX + T / 2) || near(x, box.maxX - T / 2) || near(z, box.maxZ - T / 2);
  };

  const posts: BoxElement[] = [];
  gridPosts.forEach((post) => {
    const top = post.y + post.height / 2;
    const owner = tierOf(top + T);
    if (!onFace(owner, post.x, post.z)) return;
    let lowest = owner;
    while (lowest > 1 && onFace(lowest - 1, post.x, post.z)) lowest--;
    const bottom = lowest === 1 ? T : beamBottom(lowest - 1);
    const height = top - bottom;
    if (height <= 1) return;
    posts.push({ ...post, id: `post-c${posts.length + 1}`, y: bottom + height / 2, height });
  });

  const base = layers(1);
  const rails: BoxElement[] = [];
  if (base) {
    const width = base.maxX - base.minX;
    const sideDepth = base.maxZ - T;
    rails.push({ id: 'rail-front', x: (base.minX + base.maxX) / 2, y: T / 2, z: base.maxZ - T / 2, width, height: T, depth: T });
    [base.minX + T / 2, base.maxX - T / 2].forEach((x, i) => {
      rails.push({ id: `rail-side-${i + 1}`, x, y: T / 2, z: sideDepth / 2, width: T, height: T, depth: sideDepth });
    });
  }

  return [...frame, ...posts, ...rails];
}

export function tubesTotalLengthMm(tubes: BoxElement[]): number {
  return tubes.reduce((sum, t) => sum + tubeLengthMm(t), 0);
}
