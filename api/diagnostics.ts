import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Serverless function to accept diagnostic payloads and store them in Supabase
// Requires two environment variables in Vercel (Project Settings -> Environment Variables):
// SUPABASE_URL (e.g. https://projectid.supabase.co)
// SUPABASE_SERVICE_ROLE_KEY (service role key from Supabase > Settings > API)
// Also requires a shared secret VERCEL_DIAG_SECRET that the client must provide when posting.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secret = req.headers['x-diag-secret'] || req.query['secret'];
  const expected = process.env.VERCEL_DIAG_SECRET;
  if (!expected) {
    res.status(500).json({ error: 'Server misconfigured: missing VERCEL_DIAG_SECRET' });
    return;
  }

  if (!secret || secret !== expected) {
    res.status(401).json({ error: 'Unauthorized - missing or invalid secret' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    return;
  }

  const payload = req.body?.payload ?? req.body;
  const origin = req.body?.origin ?? req.headers['x-origin'] ?? req.headers['referer'] ?? null;
  const user = req.body?.user ?? null;

  try {
    // Insert into diagnostics table via PostgREST
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/diagnostics`;
    const body = JSON.stringify([{ payload, origin, user }]);

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=representation',
      },
      body,
    });

    const text = await r.text();
    if (!r.ok) {
      res.status(502).json({ error: 'Failed to store diagnostics', status: r.status, body: text });
      return;
    }

    res.status(200).json({ ok: true, stored: true, result: text });
  } catch (e) {
    res.status(500).json({ error: 'Exception while storing diagnostics', message: (e as any)?.message });
  }
}
