-- 012_add_bir_compliance.sql
-- Adds shops fields (if needed), compliance_acceptances table, and RLS policies

-- Create compliance_acceptances table
create table if not exists public.compliance_acceptances (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  accepted_bir_disclaimer boolean not null default true,
  accepted_at timestamptz not null default now(),
  disclaimer_version text not null,
  disclaimer_text text not null,
  ip_address text null,
  user_agent text null
);

-- Optionally add columns to shops for quick flag
alter table if exists public.shops
  add column if not exists bir_disclaimer_accepted_at timestamptz null,
  add column if not exists bir_disclaimer_version text null;

-- Enable RLS and policies
-- Ensure RLS is enabled on shops and compliance_acceptances
alter table if exists public.shops enable row level security;
alter table if exists public.compliance_acceptances enable row level security;

drop policy if exists "shops_owner_select" on public.shops;
create policy "shops_owner_select" on public.shops
  for select using (owner_user_id = auth.uid());
drop policy if exists "shops_owner_insert" on public.shops;
create policy "shops_owner_insert" on public.shops
  for insert with check (owner_user_id = auth.uid());
drop policy if exists "shops_owner_update" on public.shops;
create policy "shops_owner_update" on public.shops
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists "compliance_select_owner" on public.compliance_acceptances;
create policy "compliance_select_owner" on public.compliance_acceptances
  for select using (owner_user_id = auth.uid());
drop policy if exists "compliance_insert_owner" on public.compliance_acceptances;
create policy "compliance_insert_owner" on public.compliance_acceptances
  for insert with check (owner_user_id = auth.uid());

-- Optional: allow users to view their shop acceptance flag via shops policy above
