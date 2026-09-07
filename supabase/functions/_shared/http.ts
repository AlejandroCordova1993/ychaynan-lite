import { hasOnlyKeys, isPlainRecord } from './inputLimits.ts';

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

export async function readJsonObject(
  request: Request,
  options: { maxBytes: number; allowedFields: readonly string[] },
) {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > options.maxBytes) {
    throw new RequestBodyError(413, 'body_too_large');
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > options.maxBytes) {
    throw new RequestBodyError(413, 'body_too_large');
  }
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
