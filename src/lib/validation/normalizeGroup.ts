const VOWELS: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };

export function normalizeGroup(rawGroup: string): string {
  return rawGroup
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('es')
    .replace(/[áéíóúü]/g, (letter) => VOWELS[letter] ?? letter)
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
