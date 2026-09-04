export const MAX_READING_PASTE_WORDS = 40;

export type ReadingPasteResult =
  { ok: true; text: string } | { ok: false; reason: 'not_in_reading' | 'too_long' };

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const OUTER_QUOTES = [
  ['“', '”'],
  ['«', '»'],
  ['"', '"'],
  ["'", "'"],
] as const;

function normalizeForSourceMatch(text: string) {
  return text.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function removeOuterQuotes(text: string) {
  const trimmed = text.trim();
  const quotePair = OUTER_QUOTES.find(
    ([opening, closing]) => trimmed.startsWith(opening) && trimmed.endsWith(closing),
  );
  return quotePair ? trimmed.slice(quotePair[0].length, -quotePair[1].length).trim() : trimmed;
}

function countWords(text: string) {
  return text.match(WORD_PATTERN)?.length ?? 0;
}

export function prepareReadingPaste(
  clipboardText: string,
  readingText: string,
): ReadingPasteResult {
  const fragment = removeOuterQuotes(clipboardText);
  if (countWords(fragment) > MAX_READING_PASTE_WORDS) {
    return { ok: false, reason: 'too_long' };
  }

  const normalizedFragment = normalizeForSourceMatch(fragment);
  const normalizedReading = normalizeForSourceMatch(readingText);
  if (!normalizedFragment || !normalizedReading.includes(normalizedFragment)) {
    return { ok: false, reason: 'not_in_reading' };
  }

  return { ok: true, text: `“${fragment}”` };
}
