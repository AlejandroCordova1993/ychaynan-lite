const ACCENTED_VOWELS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
};

export function normalizeName(rawName: string): string {
  let value = rawName.normalize('NFC').trim();
  value = value.toLocaleLowerCase('es');
  value = value.replace(/[áéíóú]/g, (match) => ACCENTED_VOWELS[match] ?? match);
  value = value.replace(/ü/g, 'u');
  value = value.replace(/[-']/g, ' ');
  value = value.replace(/[.,]/g, '');
  value = value.replace(/\s+/g, ' ').trim();
  return value;
}

export function namesMatch(candidate: string, registered: string): boolean {
  return normalizeName(candidate) === normalizeName(registered);
}

export function containsInvalidNameCharacters(rawName: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[0-9\x00-\x1F\x7F]/.test(rawName);
}
