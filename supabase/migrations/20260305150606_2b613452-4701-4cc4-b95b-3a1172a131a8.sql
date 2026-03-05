ALTER TABLE public.ferramentas_software 
  ADD COLUMN recorrente boolean NOT NULL DEFAULT true,
  ADD COLUMN dia_vencimento integer NOT NULL DEFAULT 1;