-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Only admins can update contas_pagar" ON public.contas_pagar;

-- Create new policy that allows finance roles to update contas_pagar
CREATE POLICY "Finance roles can update contas_pagar" 
ON public.contas_pagar 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));