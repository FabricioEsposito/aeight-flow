
DO $$ BEGIN
  CREATE TYPE public.regime_contrato_enum AS ENUM ('prestador_servico','funcionario');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS regime_contrato public.regime_contrato_enum,
  ADD COLUMN IF NOT EXISTS is_lider_area boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lidera_grupo_id uuid;

-- Migra regime baseado na role atual
UPDATE public.profiles p
SET regime_contrato = 'prestador_servico'
FROM public.user_roles ur
WHERE ur.user_id = p.id AND ur.role = 'prestador_servico' AND p.regime_contrato IS NULL;

UPDATE public.profiles p
SET regime_contrato = 'funcionario'
FROM public.user_roles ur
WHERE ur.user_id = p.id AND ur.role IN ('funcionario','lider_area') AND p.regime_contrato IS NULL;

-- Marca líderes (com base em grupos_area.lider_user_id)
UPDATE public.profiles p
SET is_lider_area = true, lidera_grupo_id = g.id
FROM public.grupos_area g
WHERE g.lider_user_id = p.id;

-- Reatribui roles antigas (prestador/funcionario/lider_area) para 'user'
UPDATE public.user_roles
SET role = 'user'
WHERE role IN ('prestador_servico','funcionario','lider_area');
