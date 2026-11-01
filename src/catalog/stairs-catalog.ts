import rawCatalog from './stairs-catalog.json';
import { applyFrameGeometry, POST_PITCH_MM, STEP_FRAME_CLEAR_SPAN_MM } from '@/constants/stairs-config';
import type { StairLayoutResult } from '@/types/stairs';

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

/** Доска подступенков и боковой зашивки (заборная доска) */
export interface CladdingSpec {
  id: string;
  name: string;
  thicknessMm: number;
  widthMm: number;
  stockLengthsMm: number[];
  pricePerMeter: number;
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

/** Минимальный просвет перемычки, при котором ещё можно варить и красить каркас */
const MIN_CLEAR_SPAN_MM = 100;

let activeProfile: ProfileSpec = findProfile(DEFAULT_PROFILE_ID);
let activeTread: TreadSpec = findTread(DEFAULT_TREAD_ID);
let activeCladding: CladdingSpec = findCladding(DEFAULT_CLADDING_ID);

function findProfile(id: string): ProfileSpec {
  const found = STAIRS_CATALOG.profiles.find((p) => p.id === id) ?? STAIRS_CATALOG.profiles[0];
  if (!found) throw new Error('Каталог профилей пуст');
  return found;
}

function findTread(id: string): TreadSpec {
  const found = STAIRS_CATALOG.treads.find((t) => t.id === id) ?? STAIRS_CATALOG.treads[0];
  if (!found) throw new Error('Каталог ступеней пуст');
  return found;
}

function findCladding(id: string): CladdingSpec {
  const found = STAIRS_CATALOG.claddings.find((c) => c.id === id) ?? STAIRS_CATALOG.claddings[0];
  if (!found) throw new Error('Каталог досок зашивки пуст');
  return found;
}

export function getActiveCladding(): CladdingSpec {
  return activeCladding;
}

export function getActiveProfile(): ProfileSpec {
  return activeProfile;
}

export function getActiveTread(): TreadSpec {
  return activeTread;
}

/** Делает выбранные профиль и ступень активными и пересчитывает геометрию каркаса. Вызывать перед расчётом раскладки. */
export function applyCatalogSelection(profileId: string, treadId: string, claddingId: string = DEFAULT_CLADDING_ID, postPitchMm?: number): void {
  activeProfile = findProfile(profileId);
  activeTread = findTread(treadId);
  activeCladding = findCladding(claddingId);
  applyFrameGeometry({
    profileSizeMm: activeProfile.sizeMm,
    profileWallMm: activeProfile.wallMm,
    treadDepthMm: activeTread.depthMm,
    treadThicknessMm: activeTread.thicknessMm,
    maxJoistPitchMm: activeTread.maxJoistPitchMm,
    claddingThicknessMm: activeCladding.thicknessMm,
    claddingWidthMm: activeCladding.widthMm,
    postPitchMm
  });
}

/** Предупреждения по выбранным профилю и ступени для текущих размеров лестницы (не блокируют расчёт) */
export function checkCatalogSelection(widthMm: number, heightMm: number, layout?: StairLayoutResult): string[] {
  const warnings: string[] = [];
  const p = activeProfile;

  if (widthMm > p.limits.maxWidthMm) {
    warnings.push(`Ширина ${widthMm} мм больше ориентира для ${p.name} (${p.limits.maxWidthMm} мм): нужен профиль крупнее или расчёт.`);
  }
  if (heightMm > p.limits.maxHeightMm) {
    warnings.push(`Высота ${heightMm} мм больше ориентира для ${p.name} (${p.limits.maxHeightMm} мм): нужен профиль крупнее или расчёт.`);
  }
  if (STEP_FRAME_CLEAR_SPAN_MM < MIN_CLEAR_SPAN_MM) {
    warnings.push(`Просвет перемычки ${STEP_FRAME_CLEAR_SPAN_MM} мм слишком мал для ${p.name} на ступени ${activeTread.depthMm} мм.`);
  }
  if (POST_PITCH_MM > 600) {
    warnings.push(`Шаг опор ${POST_PITCH_MM} мм велик для балок ${p.name}: проверьте прогиб расчётом.`);
  }
  if (layout) {
    const maxStock = Math.max(...activeTread.stockLengthsMm);
    const longest = Math.max(...layout.treads.map((t) => t.width));
    if (longest > maxStock) {
      warnings.push(`Самая длинная ступень ${Math.round(longest)} мм длиннее доски ${maxStock} мм: потребуется стык.`);
    }
  }
  return warnings;
}
