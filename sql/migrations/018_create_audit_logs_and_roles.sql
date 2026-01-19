-- Migration 018: Create audit_logs and roles tables for Advanced plan features

-- Audit logs for actions like product create/update/delete, checkout, refunds, settings
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  shop_id uuid NULL,
  user_id uuid NULL,
  role text NULL,
  action text NOT NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Simple RBAC mapping per shop
CREATE TABLE IF NOT EXISTS public.user_roles (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, shop_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_id ON public.audit_logs (shop_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

-- Notes:
--  - Run this migration with your usual migration tooling (psql or supabase migrations).
--  - The application will write into `audit_logs` when Advanced features are used.
