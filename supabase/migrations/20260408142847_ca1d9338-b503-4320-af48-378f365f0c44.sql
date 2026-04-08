ALTER TABLE public.contas_receber ADD COLUMN servico_id uuid REFERENCES public.servicos(id);
ALTER TABLE public.contas_pagar ADD COLUMN servico_id uuid REFERENCES public.servicos(id);