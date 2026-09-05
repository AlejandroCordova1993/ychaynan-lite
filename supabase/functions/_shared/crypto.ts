const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECOVERABLE_CODE_CONTEXT = 'recoverable-code:v1';

type RandomBytes = (length: number) => Uint8Array;

function secureRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function signWithPepper(message: string, pepper: string): Promise<ArrayBuffer> {
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
  return crypto.subtle.sign('HMAC', key, encoder.encode(message));
}

export function generateAccessCode(randomBytes: RandomBytes = secureRandomBytes): string {
  const bytes = randomBytes(8);
  if (bytes.length !== 8) {
    throw new TypeError('El generador debe entregar exactamente ocho bytes.');
  }

  return Array.from(bytes, (byte) => ACCESS_CODE_ALPHABET[byte & 31]).join('');
}

export async function hashAccessCode(code: string, pepper: string): Promise<string> {
  return toHex(await signWithPepper(`code:${code.replace(/-/g, '').trim().toUpperCase()}`, pepper));
}

/**
 * Reconstruye el código vigente de un acceso sin almacenarlo en texto claro.
 * El secreto nunca sale de la Edge Function y la generación permite invalidar
 * el código anterior con solo incrementar un entero.
 */
export async function deriveRecoverableAccessCode(
  pepper: string,
  assessmentId: string,
  studentId: string,
  generation: number,
): Promise<string> {
  if (!Number.isInteger(generation) || generation < 1) {
    throw new RangeError('La generación recuperable debe ser un entero mayor o igual a uno.');
  }

  const signature = await signWithPepper(
    `${RECOVERABLE_CODE_CONTEXT}:${assessmentId}:${studentId}:${generation}`,
    pepper,
  );

  // Cinco bytes entregan exactamente ocho grupos de cinco bits, uno por carácter.
  const bytes = new Uint8Array(signature).slice(0, 5);
  const characters: string[] = [];
  let buffer = 0;
  let pendingBits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    pendingBits += 8;
    while (pendingBits >= 5) {
      pendingBits -= 5;
      characters.push(ACCESS_CODE_ALPHABET[(buffer >>> pendingBits) & 31]);
    }
  }
  return characters.join('');
}
