
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'lider_area';

CREATE TABLE IF NOT EXISTS public.grupos_area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  lider_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grupos_area ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view grupos_area" ON public.grupos_area
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert grupos_area" ON public.grupos_area
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can update grupos_area" ON public.grupos_area
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can delete grupos_area" ON public.grupos_area
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER update_grupos_area_updated_at
  BEFORE UPDATE ON public.grupos_area
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.grupos_area (nome) VALUES
  ('Tecnologia'),('Operações'),('People'),('Financeiro'),('Design')
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES public.grupos_area(id) ON DELETE SET NULL;

ALTER TABLE public.solicitacoes_prestador
  ADD COLUMN IF NOT EXISTS aprovador_lider_id uuid,
  ADD COLUMN IF NOT EXISTS data_aprovacao_lider timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao_lider text;

CREATE OR REPLACE FUNCTION public.is_lider_do_solicitante(_user_id uuid, _solicitante_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.grupos_area g ON g.id = p.grupo_id
    WHERE p.id = _solicitante_id
      AND g.lider_user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Lider can view group solicitacoes" ON public.solicitacoes_prestador;
CREATE POLICY "Lider can view group solicitacoes"
  ON public.solicitacoes_prestador FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin')
    OR public.is_lider_do_solicitante(auth.uid(), solicitante_id)
  );

DROP POLICY IF EXISTS "Lider can update group solicitacoes" ON public.solicitacoes_prestador;
CREATE POLICY "Lider can update group solicitacoes"
  ON public.solicitacoes_prestador FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin')
    OR public.is_lider_do_solicitante(auth.uid(), solicitante_id)
  );
