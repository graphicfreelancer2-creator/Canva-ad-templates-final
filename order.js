const { sb } = require('./_lib');

// Called by the checkout page after the screenshot is uploaded.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  const name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 160);
  const phone = String(b.phone || '').trim().slice(0, 30);
  const proof = String(b.proof_path || '');

  if (name.length < 2) return res.status(400).json({ error: 'Invalid name' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (phone.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Invalid phone' });
  if (!/^[0-9a-f-]{36}\/proof\.[a-z0-9]{1,5}$/i.test(proof)) return res.status(400).json({ error: 'Invalid proof' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
  const row = {
    name, email, phone,
    amount: 999, // price is set on the server, never trusted from the browser
    proof_path: proof,
    fbp: b.fbp ? String(b.fbp).slice(0, 200) : null,
    fbc: b.fbc ? String(b.fbc).slice(0, 300) : null,
    event_id: b.event_id ? String(b.event_id).slice(0, 100) : null,
    source_url: b.source_url ? String(b.source_url).slice(0, 500) : null,
    client_ip: ip,
    user_agent: String(req.headers['user-agent'] || '').slice(0, 400),
  };

  const r = await sb('orders', { method: 'POST', body: JSON.stringify(row) });
  if (!r.ok) return res.status(500).json({ error: 'Could not save order' });
  const out = await r.json();
  return res.status(200).json({ ok: true, id: out[0] && out[0].id });
};
