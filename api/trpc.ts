export const config = {
  runtime: 'edge',
};

// Simple tRPC-like endpoint for basic operations
// Full tRPC requires Node.js runtime which has import path issues
// This is a simplified REST endpoint for AI generation

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Parse the URL to get the procedure name
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/trpc/', '').replace('/api/trpc', '');

  // Health check
  if (path === '' || path === 'health') {
    return new Response(JSON.stringify({
      ok: true,
      message: 'tRPC endpoint is running',
      timestamp: Date.now(),
    }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    error: 'Procedure not found',
    path,
    hint: 'Use /api/ai/generate for article generation',
  }), { 
    status: 404, 
    headers: corsHeaders 
  });
}
