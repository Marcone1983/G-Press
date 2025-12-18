export const config = {
  runtime: 'edge',
};

export default function handler(req: Request) {
  return new Response(JSON.stringify({
    ok: true,
    timestamp: Date.now(),
    message: 'G-Press API is running!'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
