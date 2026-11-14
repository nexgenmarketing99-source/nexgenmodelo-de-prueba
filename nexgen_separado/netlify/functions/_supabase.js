const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Falta SUPABASE_SECRET_KEY en las variables de Netlify.');
}

async function sb(path, options = {}) {
  requireSupabase();
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === 'object' ? (data.message || data.hint || JSON.stringify(data)) : String(data));
  return data;
}

module.exports = { sb, requireSupabase };
