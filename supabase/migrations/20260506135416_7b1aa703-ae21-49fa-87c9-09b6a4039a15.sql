DROP POLICY IF EXISTS "Only admins can update contratos_centros_custo" ON public.contratos_centros_custo;
DROP POLICY IF EXISTS "Only admins can delete contratos_centros_custo" ON public.contratos_centros_custo;

CREATE POLICY "RH and finance can update contratos_centros_custo"
ON public.contratos_centros_custo FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'rh_manager'::app_role, 'rh_analyst'::app_role]));

CREATE POLICY "RH and finance can delete contratos_centros_custo"
ON public.contratos_centros_custo FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'rh_manager'::app_role, 'rh_analyst'::app_role]));