// буквы сечений ярусов, ГОСТ 2.305
const LEVEL_LETTERS = ['В', 'Г', 'Д', 'Е', 'Ж', 'И', 'К', 'Л', 'М', 'Н'] as const;

export function getLevelSectionLetter(level: number): string {
  return LEVEL_LETTERS[level - 1] ?? String(level);
}

export function getLevelSectionName(level: number): string {
  const letter = getLevelSectionLetter(level);
  return `${letter}-${letter}`;
}
