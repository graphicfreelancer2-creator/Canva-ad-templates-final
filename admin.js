const { sb, adminUser, sendPurchase } = require('./_lib');

async function getOrder(id) {
  const r = await sb(`orders?id=eq.${encodeURIComponent(id)}&select=*`);
  const rows = r.ok ? await r.json() : [];
  return rows[0] || null;
}
async function patch(id, data) {
  const r = await sb(`orders?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  const rows = r.ok ? await r.json() : [];
  return rows[0] || null;
}
// Sends Purchase to Meta once. Never sends twice for the same order.
async function fireMeta(o) {
  if (o.meta_status === 'sent') return o;
  const res = await sendPurchase(o);
  return await patch(o.id, res.ok
    ? { meta_status: 'sent', meta_error: null, meta_sent_at: new Date().toISOString() }
    : { meta_status: 'failed', meta_error: res.error });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await adminUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  const { action, id } = b;

  if (action === 'retry_all') {
    const r = await sb(`orders?status=eq.approved&or=(meta_status.is.null,meta_status.eq.failed)&select=*&limit=100`);
    const rows = r.ok ? await r.json() : [];
    let sent = 0;
    for (const o of rows) { const u = await fireMeta(o); if (u && u.meta_status === 'sent') sent++; }
    return res.status(200).json({ ok: true, tried: rows.length, sent });
  }

  if (!id) return res.status(400).json({ error: 'Missing id' });
  let o = await getOrder(id);
  if (!o) return res.status(404).json({ error: 'Order not found' });

  if (action === 'approve') {
    if (o.status !== 'approved') o = await patch(id, { status: 'approved', approved_at: new Date().toISOString() });
    o = await fireMeta(o);
    return res.status(200).json({ ok: true, order: o });
  }
  if (action === 'cancel') {
    o = await patch(id, { status: 'cancelled' });
    return res.status(200).json({ ok: true, order: o });
  }
  if (action === 'retry') {
    if (o.status !== 'approved') return res.status(400).json({ error: 'Order is not approved' });
    o = await fireMeta(o);
    return res.status(200).json({ ok: true, order: o });
  }
  return res.status(400).json({ error: 'Unknown action' });
};
