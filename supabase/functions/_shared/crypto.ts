const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type RandomBytes = (length: number) => Uint8Array;

function secureRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generateAccessCode(randomBytes: RandomBytes = secureRandomBytes): string {
  const bytes = randomBytes(8);
  if (bytes.length !== 8) {
    throw new TypeError('El generador debe entregar exactamente ocho bytes.');
  }

  return Array.from(bytes, (byte) => ACCESS_CODE_ALPHABET[byte & 31]).join('');
}

export async function hashAccessCode(code: string, pepper: string): Promise<string> {
  if (!pepper) {
    throw new TypeError('ACCESS_CODE_PEPPER es obligatorio.');
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`code:${code.replaceAll('-', '').trim().toUpperCase()}`),
  );
  return toHex(signature);
}
