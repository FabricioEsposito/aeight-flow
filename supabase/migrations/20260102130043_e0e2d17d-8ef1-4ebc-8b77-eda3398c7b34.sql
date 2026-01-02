-- Drop the existing restrictive UPDATE policy on contas_receber
DROP POLICY IF EXISTS "Only admins can update contas_receber" ON public.contas_receber;

-- Create new UPDATE policy that allows finance roles (admin, finance_manager, finance_analyst)
CREATE POLICY "Finance roles can update contas_receber" 
ON public.contas_receber
FOR UPDATE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin', 'finance_manager', 'finance_analyst']::app_role[])
);