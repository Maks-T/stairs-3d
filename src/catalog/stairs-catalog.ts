import rawCatalog from './stairs-catalog.json';
import type { StairLayoutResult, StairSpec } from '@calculation/stairs';

export interface ProfileSpec {
  id: string;
  name: string;
  sizeMm: number;
  wallMm: number;
  massKgPerM: number;
  stockLengthMm: number;
  pricePerStock: number;
  limits: { maxWidthMm: number; maxHeightMm: number };
}

export interface TreadSpec {
  id: string;
  name: string;
  thicknessMm: number;
  depthMm: number;
  stockLengthsMm: number[];
  pricePerMeter: number;
  maxJoistPitchMm: number;
}

// доска подступенков и обшивки
export interface CladdingSpec {
  id: string;
  name: string;
  thicknessMm: number;
  widthMm: number;
  stockLengthsMm: number[];
  pricePerMeter: number;
}

export interface CatalogSelection {
  profile: ProfileSpec;
  tread: TreadSpec;
  cladding: CladdingSpec;
}

interface CatalogFile {
  profiles: ProfileSpec[];
  treads: TreadSpec[];
  claddings: CladdingSpec[];
}

export const STAIRS_CATALOG = rawCatalog as unknown as CatalogFile;

export const DEFAULT_PROFILE_ID = 'sq-40x40x2';
export const DEFAULT_TREAD_ID = 'cm-305';
export const DEFAULT_CLADDING_ID = 'mpk-11x145';

// мин. просвет перемычки
const MIN_CLEAR_SPAN_MM = 100;
const MAX_POST_PITCH_MM = 600;

function pick<T extends { id: string }>(items: T[], id: string, label: string): T {
  const found = items.find((item) => item.id === id) ?? items[0];
  if (!found) throw new Error(`Каталог пуст: ${label}`);
  return found;
}

export function resolveSelection(ids: { profileId: string; treadId: string; claddingId: string }): CatalogSelection {
  return {
    profile: pick(STAIRS_CATALOG.profiles, ids.profileId, 'профили'),
    tread: pick(STAIRS_CATALOG.treads, ids.treadId, 'ступени'),
    cladding: pick(STAIRS_CATALOG.claddings, ids.claddingId, 'доски обшивки')
  };
}

export function toStairSpec(s: CatalogSelection): StairSpec {
  return {
    tread: { depthMm: s.tread.depthMm, thicknessMm: s.tread.thicknessMm, maxJoistPitchMm: s.tread.maxJoistPitchMm },
    board: { thicknessMm: s.cladding.thicknessMm, widthMm: s.cladding.widthMm },
    tube: { sizeMm: s.profile.sizeMm }
  };
}

export function checkCatalogSelection(s: CatalogSelection, layout: StairLayoutResult): string[] {
  const warnings: string[] = [];
  const { profile: p, tread } = s;
  const { module: m, totalWidth, totalHeight } = layout;

  if (totalWidth > p.limits.maxWidthMm) {
    warnings.push(`Ширина ${totalWidth} мм больше ориентира для ${p.name} (${p.limits.maxWidthMm} мм): нужен профиль крупнее или расчёт.`);
  }
  if (totalHeight > p.limits.maxHeightMm) {
    warnings.push(`Высота ${totalHeight} мм больше ориентира для ${p.name} (${p.limits.maxHeightMm} мм): нужен профиль крупнее или расчёт.`);
  }
  if (m.clearSpan < MIN_CLEAR_SPAN_MM) {
    warnings.push(`Просвет перемычки ${m.clearSpan} мм слишком мал для ${p.name} на ступени ${tread.depthMm} мм.`);
  }
  if (m.postPitch > MAX_POST_PITCH_MM) {
    warnings.push(`Шаг опор ${m.postPitch} мм велик для балок ${p.name}: проверьте прогиб расчётом.`);
  }
  const maxStock = Math.max(...tread.stockLengthsMm);
  const longest = Math.max(...layout.treads.map((t) => t.width));
  if (longest > maxStock) {
    warnings.push(`Самая длинная ступень ${Math.round(longest)} мм длиннее доски ${maxStock} мм: потребуется стык.`);
  }
  return warnings;
}
