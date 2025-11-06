-- Corrigir parent_id da categoria 1.1.1 que estava apontando para si mesma
UPDATE public.plano_contas 
SET parent_id = '7b7dab58-ce26-49c5-b0da-d531d61feaa9', 
    nivel = 3
WHERE id = 'f06e6f7e-1392-4790-b764-3773eed428ef';