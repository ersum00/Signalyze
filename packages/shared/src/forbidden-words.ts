import list from '../forbidden-words.json';

export interface ForbiddenEntry {
  pattern: string;
  word: boolean;
  lang: string;
}

export interface ForbiddenMatch {
  entry: ForbiddenEntry;
  match: string;
  index: number;
  line: number;
  column: number;
}

/** Unicode-aware "letter, digit or underscore" class used for word boundaries. */
const WORD_CHAR = '[\\p{L}\\p{N}_]';

export const FORBIDDEN_ENTRIES: readonly ForbiddenEntry[] = (list as { entries: ForbiddenEntry[] })
  .entries;

export function compileForbiddenPattern(entry: ForbiddenEntry): RegExp {
  const tail = entry.word ? `(?!${WORD_CHAR})` : '';
  return new RegExp(`(?<!${WORD_CHAR})(?:${entry.pattern})${tail}`, 'giu');
}

const COMPILED: readonly { entry: ForbiddenEntry; regex: RegExp }[] = FORBIDDEN_ENTRIES.map(
  (entry) => ({ entry, regex: compileForbiddenPattern(entry) }),
);

function lineAndColumn(text: string, index: number): { line: number; column: number } {
  let line = 1;
  let lastBreak = -1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      lastBreak = i;
    }
  }
  return { line, column: index - lastBreak };
}

/** Returns every forbidden-word occurrence in `text`, ordered by position. */
export function findForbiddenWords(text: string): ForbiddenMatch[] {
  const matches: ForbiddenMatch[] = [];
  for (const { entry, regex } of COMPILED) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const { line, column } = lineAndColumn(text, m.index);
      matches.push({ entry, match: m[0], index: m.index, line, column });
      if (m[0].length === 0) regex.lastIndex += 1;
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

export function containsForbiddenWords(text: string): boolean {
  return COMPILED.some(({ regex }) => {
    regex.lastIndex = 0;
    return regex.test(text);
  });
}
