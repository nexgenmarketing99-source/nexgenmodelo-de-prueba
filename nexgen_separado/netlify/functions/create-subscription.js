const { sb } = require('./_supabase');

const plans = {
  'Básico': 19500,
  'Profesional': 29000,
  'Premium': 42000
};

exports.handler = async (event) => {
  let stage = 'validación inicial';
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { name, email, plan } = JSON.parse(event.body || '{}');
    if (!name || !email || !plans[plan]) return { statusCode: 400, body: JSON.stringify({ error: 'Nombre, email y plan son obligatorios.' }) };
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN en Netlify.');

    stage = 'conexión con Supabase (guardar cliente)';
    const externalReference = `NX-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const customer = await sb('nexgen_customers', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ name, email, plan, amount: plans[plan], status: 'pending', payment_status: 'pending', external_reference: externalReference })
    });

    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://nexgennmarketing.netlify.app';
    const mpBody = {
      reason: `NexgenMarketing - Plan ${plan}`,
      external_reference: externalReference,
      payer_email: email,
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: plans[plan], currency_id: 'ARS' },
      back_url: `${baseUrl}/?subscription=return`
    };

    stage = 'conexión con Mercado Pago (crear suscripción)';
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(mpBody)
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) {
      await sb(`nexgen_customers?external_reference=eq.${encodeURIComponent(externalReference)}`, { method: 'DELETE' });
      return { statusCode: mpRes.status, body: JSON.stringify({ error: mp.message || 'Mercado Pago rechazó la creación de la suscripción.', details: mp }) };
    }

    stage = 'actualización del cliente en Supabase';
    const customerId = customer?.[0]?.id;
    if (customerId) {
      await sb(`nexgen_customers?id=eq.${encodeURIComponent(customerId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ mercadopago_subscription_id: String(mp.id), mp_status: mp.status || 'pending', next_payment_date: mp.next_payment_date || null, checkout_url: mp.init_point || null })
      });
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, checkout_url: mp.init_point, subscription_id: mp.id, external_reference: externalReference }) };
  } catch (e) {
    console.error(`[create-subscription] Etapa: ${stage}`, e);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message || 'Error interno.', stage }) };
  }
};
