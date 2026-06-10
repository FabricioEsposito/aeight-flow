ALTER TABLE public.historico_baixas
ADD COLUMN IF NOT EXISTS conta_bancaria_id uuid REFERENCES public.contas_bancarias(id);