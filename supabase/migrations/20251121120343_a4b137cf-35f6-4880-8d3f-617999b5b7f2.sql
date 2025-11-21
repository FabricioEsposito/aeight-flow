-- Migrar campo email para array em clientes e fornecedores

-- Alterar tabela clientes
ALTER TABLE public.clientes 
  ALTER COLUMN email TYPE text[] 
  USING CASE 
    WHEN email IS NULL OR email = '' THEN '{}'::text[]
    ELSE ARRAY[email]::text[]
  END;

-- Alterar tabela fornecedores
ALTER TABLE public.fornecedores 
  ALTER COLUMN email TYPE text[] 
  USING CASE 
    WHEN email IS NULL OR email = '' THEN '{}'::text[]
    ELSE ARRAY[email]::text[]
  END;