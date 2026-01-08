-- Permitir que usuários deletem suas próprias solicitações pendentes
DROP POLICY IF EXISTS "Admins podem deletar solicitações" ON public.solicitacoes_ajuste_financeiro;

-- Nova política: admins podem deletar qualquer solicitação OU usuário pode deletar suas próprias solicitações pendentes
CREATE POLICY "Users can delete own pending or admins can delete any" 
ON public.solicitacoes_ajuste_financeiro 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() = solicitante_id AND status = 'pendente')
);