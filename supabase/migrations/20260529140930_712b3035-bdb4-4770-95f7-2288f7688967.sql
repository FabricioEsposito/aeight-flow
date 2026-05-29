
-- Corrigir CV700019548: parcelas_contrato.valor = BRUTO, contas_receber.valor = LÍQUIDO
UPDATE public.parcelas_contrato SET valor = 23130.00 WHERE id = '09b10693-31ea-4da3-a55b-8eb2af791a4e';
UPDATE public.parcelas_contrato SET valor = 11565.00 WHERE id = 'a7b667a1-2e9f-4cf6-8e61-891d931d5dfc';
UPDATE public.parcelas_contrato SET valor = 11565.00 WHERE id = 'ed92523c-0dc7-41a7-b6c8-2551791a44db';

UPDATE public.contas_receber SET valor = 21707.50, valor_original = 23130 WHERE id = '64fa2ff1-6463-43ae-b76c-fde67a766dd2';
UPDATE public.contas_receber SET valor = 10853.75, valor_original = 11565 WHERE id = 'a2f7355f-78fe-442a-b1f7-6c29b1bdbde4';
UPDATE public.contas_receber SET valor = 10853.75, valor_original = 11565 WHERE id = 'e75e21e8-249d-447e-b5b6-0efa6e37bb77';
