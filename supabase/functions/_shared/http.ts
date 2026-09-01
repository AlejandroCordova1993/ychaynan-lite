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
