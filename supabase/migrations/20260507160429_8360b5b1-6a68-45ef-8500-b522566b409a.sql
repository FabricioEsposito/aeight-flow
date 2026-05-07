
UPDATE public.solicitacoes_prestador SET status = 'aprovado_lider' WHERE status = 'pendente_rh_analista';
UPDATE public.solicitacoes_prestador SET status = 'aprovado_rh' WHERE status = 'pendente_financeiro';
UPDATE public.solicitacoes_prestador SET status = 'rejeitado_rh' WHERE status IN ('rejeitado_rh_analista','rejeitado_rh_gerente');
