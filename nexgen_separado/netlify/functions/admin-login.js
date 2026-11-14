const crypto = require('crypto');
function sign(payload) {
  const secret = process.env.ADMIN_SESSION_SECRET || 'nexgen-admin-session-2026-private-signing-key';
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('base64url');
  return `${raw}.${sig}`;
}
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { user, password } = JSON.parse(event.body || '{}');
    const okUser = 'admin';
    const okPass = 'nexgen2026';
    if (!okPass) return { statusCode: 500, body: JSON.stringify({ error: 'Falta configurar ADMIN_PASSWORD en Netlify.' }) };
    if (user !== okUser || password !== okPass) return { statusCode: 401, body: JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }) };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: sign({ u: user, exp: Date.now() + 1000*60*60*8 }) }) };
  } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Solicitud inválida.' }) }; }
};
