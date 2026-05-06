ALTER TABLE public.solicitacoes_prestador
  ADD CONSTRAINT solicitacoes_prestador_fornecedor_id_fkey
  FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE RESTRICT;