// Shared CORS configuration for all edge functions
const ALLOWED_ORIGINS = [
  'https://0fa4c705-4ab4-400f-af92-ba03453bf019.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if origin is in allowed list or is a lovableproject.com subdomain
  const isAllowed = requestOrigin && (
    ALLOWED_ORIGINS.includes(requestOrigin) || 
    requestOrigin.endsWith('.lovableproject.com')
  );
  
  const origin = isAllowed ? requestOrigin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
