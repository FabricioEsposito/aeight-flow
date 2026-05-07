CREATE POLICY "Approvers can view profiles for solicitations"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_manager'::app_role, 'rh_analyst'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role, 'lider_area'::app_role])
);