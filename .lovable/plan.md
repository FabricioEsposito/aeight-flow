

## Plano: Leitura de Código de Barras de Boletos via OCR.space

### Resumo
Criar uma Edge Function que recebe o arquivo do boleto armazenado no Supabase Storage, envia para a API do OCR.space para extrair a linha digitável, e adicionar essa coluna na planilha de "Exportar Pagamento em Lote" do Extrato.

### Passo 1 — Configurar a chave de API
Salvar a chave da API OCR.space como secret `OCR_SPACE_API_KEY` no projeto Supabase, para uso na Edge Function.

### Passo 2 — Criar Edge Function `ocr-boleto`
**Arquivo:** `supabase/functions/ocr-boleto/index.ts`

- Recebe o `file_path` (caminho do boleto no storage) via POST
- Baixa o arquivo do bucket privado usando o Service Role Key
- Envia o arquivo para `https://api.ocr.space/parse/image` com parâmetros:
  - `isOverlayRequired: false`
  - `detectOrientation: true`  
  - `OCREngine: 2` (melhor para documentos)
- Extrai a linha digitável do texto retornado (regex para padrão de 47 ou 48 dígitos com pontos/espaços)
- Retorna `{ linha_digitavel: "..." }`

### Passo 3 — Atualizar exportação no Extrato
**Arquivo:** `src/pages/Extrato.tsx`

Na função `handleExportBatchPayment`:
1. Para cada lançamento pendente que possua `link_boleto`, chamar a Edge Function `ocr-boleto`
2. Aguardar todas as respostas (em paralelo com `Promise.allSettled`)
3. Adicionar coluna **"Linha Digitável"** (coluna J) na planilha Excel com o valor extraído
4. Exibir loading/progresso durante o processamento OCR
5. Se a leitura falhar para algum boleto, deixar a célula vazia

### Formato Final da Planilha

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Banco | Agência | Conta | Tipo Conta | Nome | CPF/CNPJ | Tipo Transf. | Valor | Data Pgto | Linha Digitável |

### Observações
- Lançamentos sem boleto anexado terão a coluna "Linha Digitável" vazia
- A API OCR.space tem limite de 25K chamadas/mês no plano gratuito
- O processamento pode levar alguns segundos por boleto, então será exibido um indicador de carregamento

