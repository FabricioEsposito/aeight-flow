-- Allow RH roles to update financial rows only when they belong to employee-benefit contracts
CREATE POLICY "RH can update employee benefit contas_pagar"
ON public.contas_pagar
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'rh_manager'::public.app_role, 'rh_analyst'::public.app_role])
  AND EXISTS (
    SELECT 1
    FROM public.parcelas_contrato pc
    JOIN public.contratos c ON c.id = pc.contrato_id
    WHERE pc.id = contas_pagar.parcela_id
      AND c.is_beneficio_funcionario = true
  )
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'rh_manager'::public.app_role, 'rh_analyst'::public.app_role])
  AND EXISTS (
    SELECT 1
    FROM public.parcelas_contrato pc
    JOIN public.contratos c ON c.id = pc.contrato_id
    WHERE pc.id = contas_pagar.parcela_id
      AND c.is_beneficio_funcionario = true
  )
);

CREATE POLICY "RH can update employee benefit parcelas"
ON public.parcelas_contrato
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'rh_manager'::public.app_role, 'rh_analyst'::public.app_role])
  AND EXISTS (
    SELECT 1
    FROM public.contratos c
    WHERE c.id = parcelas_contrato.contrato_id
      AND c.is_beneficio_funcionario = true
  )
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'rh_manager'::public.app_role, 'rh_analyst'::public.app_role])
  AND EXISTS (
    SELECT 1
    FROM public.contratos c
    WHERE c.id = parcelas_contrato.contrato_id
      AND c.is_beneficio_funcionario = true
  )
);

CREATE POLICY "RH can update employee benefit controls"
ON public.controle_beneficios
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'rh_manager'::public.app_role, 'rh_analyst'::public.app_role])
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'rh_manager'::public.app_role, 'rh_analyst'::public.app_role])
);

-- Repair the currently broken Geremed parcela 05 links to the latest files already uploaded by RH
UPDATE public.contas_pagar
SET
  link_nf = 'https://epgifclglrrgzpguqbde.supabase.co/storage/v1/object/public/faturamento-docs/beneficios/1c87a094-ee1c-454b-85d8-bf211751295a/0d5b6325-f412-4cb9-9117-fe9fd53816d6/nf-1778090820889.pdf?v=1778090833241',
  link_boleto = 'https://epgifclglrrgzpguqbde.supabase.co/storage/v1/object/public/faturamento-docs/beneficios/1c87a094-ee1c-454b-85d8-bf211751295a/0d5b6325-f412-4cb9-9117-fe9fd53816d6/boleto-1778090833339.pdf?v=1778090837947'
WHERE id = '8bba1a6f-61bc-4be1-bc67-624e7a87e436';