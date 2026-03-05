
-- Add currency column to licenses table (default BRL)
ALTER TABLE public.ferramentas_software_licencas 
ADD COLUMN moeda character varying NOT NULL DEFAULT 'BRL';

-- Add currency column to ferramentas_software for the valor_mensal
ALTER TABLE public.ferramentas_software
ADD COLUMN moeda character varying NOT NULL DEFAULT 'BRL';
