ALTER TABLE public.vendedores ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'interno';
ALTER TABLE public.vendedores DROP CONSTRAINT IF EXISTS vendedores_tipo_check;
ALTER TABLE public.vendedores ADD CONSTRAINT vendedores_tipo_check CHECK (tipo IN ('interno','parceiro'));

ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS parceiro_id uuid;
CREATE INDEX IF NOT EXISTS idx_contratos_parceiro_id ON public.contratos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_vendedores_tipo ON public.vendedores(tipo);