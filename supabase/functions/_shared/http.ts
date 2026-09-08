import { hasOnlyKeys, isPlainRecord, unicodeLength } from './inputLimits.ts';

export function corsHeaders(origin: string | null, allowedOrigins: readonly string[]) {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function handlePreflight(
  request: Request,
  allowedOrigins: readonly string[],
): Response | null {
  if (request.method !== 'OPTIONS') return null;
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('Origin'), allowedOrigins),
  });
}

export function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  allowedOrigins: readonly string[],
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin, allowedOrigins),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export class RequestBodyError extends Error {
  constructor(
    public readonly status: 400 | 413,
    public readonly code: 'invalid_body' | 'body_too_large',
  ) {
    super(code);
  }
}

async function readTextWithinLimit(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // El rechazo 413 no depende de que el origen acepte la cancelación.
        }
        throw new RequestBodyError(413, 'body_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function readJsonObject(
  request: Request,
  options: { maxBytes: number; allowedFields: readonly string[] },
) {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > options.maxBytes) {
    throw new RequestBodyError(413, 'body_too_large');
  }
  const raw = await readTextWithinLimit(request, options.maxBytes);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new RequestBodyError(400, 'invalid_body');
  }
  if (!isPlainRecord(value) || !hasOnlyKeys(value, options.allowedFields)) {
    throw new RequestBodyError(400, 'invalid_body');
  }
  return value;
}

export function invalidBody(): RequestBodyError {
  return new RequestBodyError(400, 'invalid_body');
}

export function requireBoundedText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') throw invalidBody();
  const trimmed = value.trim();
  if (!trimmed || unicodeLength(trimmed) > maximum) throw invalidBody();
  return trimmed;
}

export function requireVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw invalidBody();
  return value;
}
