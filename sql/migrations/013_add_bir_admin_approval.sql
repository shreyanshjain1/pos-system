-- 013_add_bir_admin_approval.sql
-- Adds admin approval fields for BIR disclaimer on shops

alter table if exists public.shops
  add column if not exists bir_disclaimer_approved_at timestamptz null,
  add column if not exists bir_disclaimer_approved_by uuid null;

-- Note: Admin approval will be handled via server-side admin APIs using the service_role key.
