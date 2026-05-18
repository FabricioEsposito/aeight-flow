
DO $$
DECLARE
  v_contrato_id uuid := 'bfa1e52c-2ef5-40a4-a754-9e3221186376';
  v_cliente_id uuid := '42df1198-321b-476c-8074-d40a702ca083';
  v_plano_id uuid := 'f06e6f7e-1392-4790-b764-3773eed428ef';
  v_conta_id uuid := '203727cc-b247-40ac-ae42-f35893a13b50';
  v_cc_codigo varchar := 'a0551897-f301-47b1-bf90-b0c01e9ea2c9';
  v_cc_id uuid := 'a0551897-f301-47b1-bf90-b0c01e9ea2c9';
  v_servico_id uuid := 'd64246fa-126a-4e87-84ad-7b6994cd4924';
  v_valor numeric := 15485.25;
  v_numero_contrato varchar := 'CV405899570';
  v_datas date[] := ARRAY['2026-06-30','2026-09-30','2026-12-30','2027-03-30']::date[];
  v_data date;
  v_parcela_id uuid;
  v_cr_id uuid;
  i int;
BEGIN
  FOR i IN 1..array_length(v_datas,1) LOOP
    v_data := v_datas[i];
    v_parcela_id := gen_random_uuid();
    v_cr_id := gen_random_uuid();

    INSERT INTO parcelas_contrato (id, contrato_id, numero_parcela, valor, data_vencimento, status, tipo, conta_bancaria_id)
    VALUES (v_parcela_id, v_contrato_id, i, v_valor, v_data, 'pendente', 'receber', v_conta_id);

    INSERT INTO contas_receber (
      id, cliente_id, parcela_id, valor, valor_original, data_vencimento, data_competencia,
      conta_bancaria_id, plano_conta_id, centro_custo, servico_id, descricao, status
    ) VALUES (
      v_cr_id, v_cliente_id, v_parcela_id, v_valor, v_valor, v_data, v_data,
      v_conta_id, v_plano_id, v_cc_codigo, v_servico_id,
      'Contrato ' || v_numero_contrato || ' - Parcela ' || i || '/4', 'pendente'
    );

    INSERT INTO lancamentos_centros_custo (conta_receber_id, centro_custo_id, percentual)
    VALUES (v_cr_id, v_cc_id, 100);
  END LOOP;
END $$;
