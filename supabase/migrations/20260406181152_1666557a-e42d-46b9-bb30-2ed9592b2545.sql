ALTER TABLE public.fornecedores
  ADD COLUMN banco_codigo varchar,
  ADD COLUMN banco_nome varchar,
  ADD COLUMN agencia varchar,
  ADD COLUMN conta varchar,
  ADD COLUMN tipo_conta_bancaria varchar,
  ADD COLUMN tipo_transferencia varchar;