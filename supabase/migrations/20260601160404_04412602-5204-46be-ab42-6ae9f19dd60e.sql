UPDATE public.parcelas_contrato SET valor = 18000 WHERE contrato_id = '217d7217-0c22-4f20-9340-f6013659e5e7' AND numero_parcela >= 6;

UPDATE public.contas_receber SET valor = 16893, valor_original = 18000 WHERE parcela_id IN (
  SELECT id FROM public.parcelas_contrato WHERE contrato_id = '217d7217-0c22-4f20-9340-f6013659e5e7' AND numero_parcela >= 6
);