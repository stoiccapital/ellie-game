// Ellie Money House save/load worker.
// GET  /save/:id  → returns the saved JSON blob (or 404)
// PUT  /save/:id  → stores the JSON body under that id
//
// Storage: Cloudflare KV namespace bound as SAVES.
// Identity: an opaque UUID generated per browser (anonymous).

export interface Env {
  SAVES: KVNamespace;
}

const ALLOWED_ORIGINS = ['*'];
const ID_RE = /^[a-f0-9-]{10,64}$/i;

function cors(res: Response, origin: string): Response {
  const headers = new Headers(res.headers);
  headers.set('access-control-allow-origin', ALLOWED_ORIGINS.includes('*') ? '*' : origin);
  headers.set('access-control-allow-methods', 'GET, PUT, OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
  headers.set('access-control-max-age', '86400');
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin') ?? '*';
    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), origin);

    const url = new URL(req.url);
    const match = url.pathname.match(/^\/save\/([^/]+)$/);
    if (!match) return cors(new Response('not found', { status: 404 }), origin);

    const id = match[1];
    if (!ID_RE.test(id)) return cors(new Response('bad id', { status: 400 }), origin);

    if (req.method === 'GET') {
      const data = await env.SAVES.get(id);
      if (data === null) return cors(new Response('null', { status: 404, headers: { 'content-type': 'application/json' } }), origin);
      return cors(new Response(data, { status: 200, headers: { 'content-type': 'application/json' } }), origin);
    }

    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > 128 * 1024) return cors(new Response('too large', { status: 413 }), origin);
      try {
        JSON.parse(text);
      } catch {
        return cors(new Response('bad json', { status: 400 }), origin);
      }
      await env.SAVES.put(id, text);
      return cors(new Response('ok', { status: 200 }), origin);
    }

    return cors(new Response('method not allowed', { status: 405 }), origin);
  },
};
