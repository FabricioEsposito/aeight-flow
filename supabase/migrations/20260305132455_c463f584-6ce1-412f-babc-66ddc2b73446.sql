
-- Add centro_custo_id to ferramentas_software_licencas
ALTER TABLE public.ferramentas_software_licencas 
ADD COLUMN centro_custo_id uuid REFERENCES public.centros_custo(id);

-- Make centro_custo_id nullable on ferramentas_software (no longer required at tool level)
ALTER TABLE public.ferramentas_software 
ALTER COLUMN centro_custo_id DROP NOT NULL;
