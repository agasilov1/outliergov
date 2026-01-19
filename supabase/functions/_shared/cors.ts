// Shared CORS configuration for all edge functions
// SECURITY: Explicit allowlist only - no wildcard subdomains
const ALLOWED_ORIGINS = [
  // Production
  'https://outliergov.lovable.app',
  // Preview
  'https://id-preview--0fa4c705-4ab4-400f-af92-ba03453bf019.lovable.app',
  // Legacy (if still in use)
  'https://0fa4c705-4ab4-400f-af92-ba03453bf019.lovableproject.com',
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Strict allowlist check - no wildcard matching
  const isAllowed = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin);
  const origin = isAllowed ? requestOrigin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ingest-token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

export function handleCorsPreflightSafe(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, { headers: getCorsHeaders(origin) });
  }
  return null;
}
