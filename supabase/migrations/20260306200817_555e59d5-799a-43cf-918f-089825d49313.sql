
-- Reverter parcela 3 do contrato CV565581179 para em aberto
UPDATE contas_pagar 
SET status = 'pendente', data_pagamento = NULL 
WHERE id = '88b24d7f-b24f-49b3-aafb-ff86239ef82c';

UPDATE parcelas_contrato 
SET status = 'pendente' 
WHERE id = '38ea2114-3945-4144-97ee-26c46eb65564';
