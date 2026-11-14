create extension if not exists pgcrypto;

create table if not exists public.nexgen_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  plan text not null check (plan in ('Básico','Profesional','Premium')),
  amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  mp_status text,
  external_reference text unique,
  mercadopago_subscription_id text,
  checkout_url text,
  next_payment_date timestamptz,
  last_payment_id text,
  last_payment_date timestamptz,
  created_at timestamptz not null default now()
);

alter table public.nexgen_customers enable row level security;

-- El backend de Netlify usa SUPABASE_SECRET_KEY y no depende de estas políticas.
-- No habilitamos acceso público a la tabla.

create index if not exists nexgen_customers_email_idx on public.nexgen_customers(email);
create index if not exists nexgen_customers_status_idx on public.nexgen_customers(status);
