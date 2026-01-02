-- Primeiro, excluir as parcelas e contas órfãs existentes
-- Deletar contas_receber que referenciam parcelas que não existem mais ou cujo contrato não existe
DELETE FROM public.contas_receber 
WHERE parcela_id IN (
  SELECT pc.id FROM public.parcelas_contrato pc
  LEFT JOIN public.contratos c ON pc.contrato_id = c.id
  WHERE c.id IS NULL
);

-- Deletar contas_pagar que referenciam parcelas que não existem mais ou cujo contrato não existe
DELETE FROM public.contas_pagar 
WHERE parcela_id IN (
  SELECT pc.id FROM public.parcelas_contrato pc
  LEFT JOIN public.contratos c ON pc.contrato_id = c.id
  WHERE c.id IS NULL
);

-- Deletar parcelas órfãs (sem contrato)
DELETE FROM public.parcelas_contrato 
WHERE contrato_id NOT IN (SELECT id FROM public.contratos)
   OR contrato_id IS NULL;

-- Agora modificar as foreign keys para incluir ON DELETE CASCADE

-- Primeiro, remover a foreign key existente das parcelas_contrato
ALTER TABLE public.parcelas_contrato 
DROP CONSTRAINT IF EXISTS parcelas_contrato_contrato_id_fkey;

-- Adicionar a foreign key com ON DELETE CASCADE
ALTER TABLE public.parcelas_contrato 
ADD CONSTRAINT parcelas_contrato_contrato_id_fkey 
FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;

-- Remover a foreign key existente das contas_receber para parcela_id
ALTER TABLE public.contas_receber 
DROP CONSTRAINT IF EXISTS contas_receber_parcela_id_fkey;

-- Adicionar a foreign key com ON DELETE CASCADE
ALTER TABLE public.contas_receber 
ADD CONSTRAINT contas_receber_parcela_id_fkey 
FOREIGN KEY (parcela_id) REFERENCES public.parcelas_contrato(id) ON DELETE CASCADE;

-- Remover a foreign key existente das contas_pagar para parcela_id
ALTER TABLE public.contas_pagar 
DROP CONSTRAINT IF EXISTS contas_pagar_parcela_id_fkey;

-- Adicionar a foreign key com ON DELETE CASCADE
ALTER TABLE public.contas_pagar 
ADD CONSTRAINT contas_pagar_parcela_id_fkey 
FOREIGN KEY (parcela_id) REFERENCES public.parcelas_contrato(id) ON DELETE CASCADE;