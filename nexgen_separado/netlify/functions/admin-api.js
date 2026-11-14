const crypto = require('crypto');
const { sb } = require('./_supabase');
function validToken(token) {
  try {
    const [raw, sig] = String(token || '').split('.');
    if (!raw || !sig) return false;
    const secret = process.env.ADMIN_SESSION_SECRET || 'nexgen-admin-session-2026-private-signing-key';
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const p = JSON.parse(Buffer.from(raw, 'base64url').toString());
    return p.exp > Date.now();
  } catch { return false; }
}
exports.handler = async (event) => {
  if (!validToken(event.headers.authorization?.replace(/^Bearer\s+/i,''))) return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado.' }) };
  try {
    if (event.httpMethod === 'GET') {
      const data = await sb('nexgen_customers?select=*&order=created_at.desc');
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
    }
    if (event.httpMethod === 'POST') {
      const d = JSON.parse(event.body || '{}');
      const data = await sb('nexgen_customers', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(d) });
      return { statusCode: 200, headers:{'Content-Type':'application/json'}, body:JSON.stringify(data?.[0] || data) };
    }
    if (event.httpMethod === 'PATCH') {
      const d = JSON.parse(event.body || '{}');
      if (!d.id) return { statusCode:400, body:JSON.stringify({error:'Falta id'}) };
      delete d.id;
      const data = await sb(`nexgen_customers?id=eq.${encodeURIComponent(event.body ? JSON.parse(event.body).id : '')}`, { method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify(d) });
      return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify(data?.[0] || data) };
    }
    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) return { statusCode:400, body:JSON.stringify({error:'Falta id'}) };
      await sb(`nexgen_customers?id=eq.${encodeURIComponent(id)}`, { method:'DELETE' });
      return { statusCode:204, body:'' };
    }
    return { statusCode:405, body:'Method Not Allowed' };
  } catch (e) { console.error(e); return { statusCode:500, body:JSON.stringify({error:e.message}) }; }
};
