-- Add new roles to app_role enum (separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'commercial_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'salesperson';