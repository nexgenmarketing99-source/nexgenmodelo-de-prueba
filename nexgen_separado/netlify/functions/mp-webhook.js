const { sb } = require('./_supabase');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') return { statusCode:405, body:'Method Not Allowed' };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const type = body.type || event.queryStringParameters?.type;
    const id = body.data?.id || event.queryStringParameters?.['data.id'] || body.id;
    if (!id) return { statusCode:200, body:'ok' };
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN.');
    let data;
    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, { headers:{Authorization:`Bearer ${token}`} });
      data = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(data));
      const ref = data.external_reference;
      if (ref) await sb(`nexgen_customers?external_reference=eq.${encodeURIComponent(ref)}`, {method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({mp_status:data.status,next_payment_date:data.next_payment_date||null,status:data.status==='authorized'?'active':'pending',payment_status:data.status==='authorized'?'paid':'pending',mercadopago_subscription_id:String(data.id)})});
    } else if (type === 'subscription_authorized_payment') {
      const r = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(id)}`, { headers:{Authorization:`Bearer ${token}`} });
      data = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(data));
      const ref = data.external_reference;
      if (ref) await sb(`nexgen_customers?external_reference=eq.${encodeURIComponent(ref)}`, {method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({payment_status:'paid',last_payment_id:String(data.id),last_payment_date:new Date().toISOString()})});
    }
    return { statusCode:200, body:'ok' };
  } catch (e) { console.error(e); return { statusCode:200, body:'received' }; }
};
