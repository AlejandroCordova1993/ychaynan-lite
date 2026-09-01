const VOWELS: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };

function foldVowels(value: string): string {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('es')
    .replace(/[áéíóúü]/g, (letter) => VOWELS[letter] ?? letter);
}

export function normalizeStudentName(value: string): string {
  return foldVowels(value).trim().replace(/[-']/g, ' ').replace(/[.,]/g, '').replace(/\s+/g, ' ');
}

export function normalizeStudentGroup(value: string): string {
  return foldVowels(value)
    .trim()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ');
}
