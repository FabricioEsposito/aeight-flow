
-- 1. Add new roles to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rh_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rh_analyst';
