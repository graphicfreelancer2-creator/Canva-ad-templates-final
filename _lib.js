const crypto = require('crypto');
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase REST helper (server only, uses the service role key)
function sb(path, opt = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opt,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opt.headers || {}),
    },
  });
}

// Returns the user only if the bearer token belongs to ADMIN_EMAIL
async function adminUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !process.env.ADMIN_EMAIL) return null;
  const r = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return (u.email || '').toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() ? u : null;
}

const sha = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');

// 03xx... -> 923xx...
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '92' + d.slice(1);
  return d;
}

// Meta Conversions API: send a Purchase event for an approved order
async function sendPurchase(o) {
  const PIXEL = process.env.META_PIXEL_ID;
  const TOKEN = process.env.META_ACCESS_TOKEN;
  const VER = process.env.META_API_VERSION || 'v23.0';
  if (!PIXEL || !TOKEN) return { ok: false, error: 'META_PIXEL_ID or META_ACCESS_TOKEN is missing' };

  const user = {
    em: [sha(o.email.trim().toLowerCase())],
    ph: [sha(normPhone(o.phone))],
    country: [sha('pk')],
    external_id: [sha(o.id)],
  };
  const parts = o.name.trim().toLowerCase().split(/\s+/);
  if (parts[0]) user.fn = [sha(parts[0])];
  if (parts.length > 1) user.ln = [sha(parts.slice(1).join(' '))];
  if (o.fbp) user.fbp = o.fbp;
  if (o.fbc) user.fbc = o.fbc;
  if (o.client_ip) user.client_ip_address = o.client_ip;
  if (o.user_agent) user.client_user_agent = o.user_agent;

  const body = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: 'purchase_' + o.id,
      action_source: 'website',
      event_source_url: o.source_url || process.env.SITE_URL || undefined,
      user_data: user,
      custom_data: {
        currency: 'PKR',
        value: Number(o.amount),
        content_name: '1200+ Canva Ad Templates Bundle',
        content_type: 'product',
        order_id: o.id,
      },
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const r = await fetch(`https://graph.facebook.com/${VER}/${PIXEL}/events?access_token=${encodeURIComponent(TOKEN)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.events_received >= 1) return { ok: true };
    return { ok: false, error: (j.error && j.error.message) || JSON.stringify(j).slice(0, 300) };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 300) };
  }
}

module.exports = { sb, adminUser, sendPurchase };
