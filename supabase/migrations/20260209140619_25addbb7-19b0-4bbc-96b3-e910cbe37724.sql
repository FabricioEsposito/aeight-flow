
-- Adicionar campo de aviso prévio (dias, máximo 90)
ALTER TABLE public.contratos 
ADD COLUMN aviso_previo_dias integer DEFAULT 0 CHECK (aviso_previo_dias >= 0 AND aviso_previo_dias <= 90);

-- Adicionar flag de renovação automática 12 meses
ALTER TABLE public.contratos 
ADD COLUMN renovacao_automatica boolean DEFAULT false;

-- Adicionar flag de ajuste IPCA após 12 meses
ALTER TABLE public.contratos 
ADD COLUMN ajuste_ipca boolean DEFAULT false;
