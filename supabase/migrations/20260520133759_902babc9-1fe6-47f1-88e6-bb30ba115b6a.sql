
-- Remove overrides errados (100% CC 001) das parcelas de Março
DELETE FROM public.lancamentos_centros_custo WHERE id IN ('4625d58e-1b28-4ff6-a684-5a4448fdc750','16bfa5fd-440e-45c9-8025-1aed6b9a3d7e');

-- Adiciona rateio ao avulso de Fevereiro (R$ 278,46)
INSERT INTO public.lancamentos_centros_custo (conta_pagar_id, centro_custo_id, percentual) VALUES
('f5cde19b-0f5c-4e28-873d-f040ff5aa1d6', 'd5eb10a2-e83b-47bb-895b-ba0cde604a74', 75.14),
('f5cde19b-0f5c-4e28-873d-f040ff5aa1d6', 'd3a313de-341e-498c-bed6-7aa9ce79b309', 13.02),
('f5cde19b-0f5c-4e28-873d-f040ff5aa1d6', '7d7381b8-b3f1-44a0-a466-9d5b5ac8cdb5', 1.84),
('f5cde19b-0f5c-4e28-873d-f040ff5aa1d6', 'a0551897-f301-47b1-bf90-b0c01e9ea2c9', 10);

-- Inserindo as parcelas de Março com o rateio padrão (após o DELETE acima, elas voltam a usar o rateio do contrato — sem necessidade de inserir aqui)
