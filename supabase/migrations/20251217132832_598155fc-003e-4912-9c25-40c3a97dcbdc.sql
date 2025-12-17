-- Create function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Add column to track if commission was already added to contas_pagar
ALTER TABLE public.solicitacoes_comissao 
ADD COLUMN IF NOT EXISTS conta_pagar_gerada boolean DEFAULT false;

-- Update RLS policy for solicitacoes_comissao
DROP POLICY IF EXISTS "Users can view their own commission requests or admins can view" ON public.solicitacoes_comissao;

CREATE POLICY "Role-based commission request viewing"
ON public.solicitacoes_comissao
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'finance_manager'::app_role)
  OR has_role(auth.uid(), 'commercial_manager'::app_role)
  OR auth.uid() = solicitante_id
);

-- Update RLS for vendedores
DROP POLICY IF EXISTS "Authenticated users can view vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Only admins can update vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Only admins can delete vendedores" ON public.vendedores;

CREATE POLICY "Authenticated users can view vendedores"
ON public.vendedores FOR SELECT USING (true);

CREATE POLICY "Commercial and admin roles can update vendedores"
ON public.vendedores FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin', 'finance_manager', 'commercial_manager']::app_role[]));

CREATE POLICY "Commercial and admin roles can delete vendedores"
ON public.vendedores FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin', 'finance_manager', 'commercial_manager']::app_role[]));

-- Update commission approval policy
DROP POLICY IF EXISTS "Only admins can update commission requests" ON public.solicitacoes_comissao;

CREATE POLICY "Managers can update commission requests"
ON public.solicitacoes_comissao FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin', 'finance_manager', 'commercial_manager']::app_role[]));

-- Allow user_roles to be viewed by users checking their own role
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own role or admins view all"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));