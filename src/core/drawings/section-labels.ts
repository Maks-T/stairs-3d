/**
 * Буквы секущих плоскостей для планов каркаса по ярусам.
 * А-А (разрез по ширине) и Б-Б (план стоек) заняты, поэтому ярусы снизу вверх: В, Г, Д, Е, Ж, И, К, Л, М, Н
 * (по ГОСТ 2.305 не используются Ё, З, Й, О, Х, Ц, Ч, Щ, Ъ, Ы, Ь). Хватает на 10 ступеней (максимум проекта).
 */
const LEVEL_LETTERS = ['В', 'Г', 'Д', 'Е', 'Ж', 'И', 'К', 'Л', 'М', 'Н'] as const;

/** Буква сечения для плана каркаса яруса `level` (1 — нижний) */
export function getLevelSectionLetter(level: number): string {
  return LEVEL_LETTERS[level - 1] ?? String(level);
}

/** Обозначение сечения вида «В-В» */
export function getLevelSectionName(level: number): string {
  const letter = getLevelSectionLetter(level);
  return `${letter}-${letter}`;
}
