-- Aumentar o tamanho dos campos codigo e descricao na tabela plano_contas
ALTER TABLE public.plano_contas 
  ALTER COLUMN codigo TYPE VARCHAR(50),
  ALTER COLUMN descricao TYPE VARCHAR(200);