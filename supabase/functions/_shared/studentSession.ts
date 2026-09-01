type RandomBytes = (length: number) => Uint8Array;

function secureRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`session:${token}`),
  );
  return hex(digest);
}

export async function createStudentSessionSecrets(randomBytes: RandomBytes = secureRandomBytes) {
  const token = base64Url(randomBytes(32));
  const clientSubmissionKey = base64Url(randomBytes(24));
  return { token, tokenHash: await hashSessionToken(token), clientSubmissionKey };
}
