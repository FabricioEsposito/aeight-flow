-- Reverter a constraint NOT NULL em parcela_id para permitir lançamentos manuais
-- (sem vínculo com contratos)

ALTER TABLE public.contas_receber ALTER COLUMN parcela_id DROP NOT NULL;
ALTER TABLE public.contas_pagar ALTER COLUMN parcela_id DROP NOT NULL;