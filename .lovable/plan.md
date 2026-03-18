

## Plano Consolidado: Holerite - Upload PDF, Template de E-mail e Envio

### 1. Migration SQL

- Criar bucket `holerites` (público) no storage
- Adicionar coluna `holerite_url` (text, nullable) na tabela `folha_pagamento`
- RLS policies para o bucket (authenticated can upload/read/delete)

### 2. Simplificar EditFolhaDialog

Remover do formulário:
- **Tipo de Vínculo** (select CLT/PJ)
- **Salário Base** (currency input)
- **Outros Proventos** (currency input)
- **Outros Descontos** (currency input)

O valor líquido será o valor da parcela diretamente. Manter: data de vencimento, status, observações.

Adicionar **FileUpload de holerite** (condicional): exibido apenas quando `plano_contas_id` for `30a56eb0-cfba-4e09-9f43-bf3cd39873bc` (2.1.2 - Salário CLT) ou `c1b3c1bf-c014-46f0-baa7-cdea1c3b0ac7` (3.1.1 - Salário CLT). Usa o componente `FileUpload` existente com bucket `holerites`.

### 3. Edge Function `send-holerite-email`

**Template HTML profissional** seguindo o padrão visual do `send-billing-emails`:

- **Header:** Gradiente roxo (`#4f46e5` → `#818cf8`), título "Holerite", subtítulo "Recursos Humanos - Aeight"
- **Corpo:**
  - Saudação personalizada ao fornecedor (nome fantasia ou razão social)
  - Mensagem: "Segue em anexo o holerite referente à competência **Mês/Ano**."
  - Card resumo com Competência e Valor Líquido
  - Indicador de anexo (📎 PDF)
- **Rodapé:** Contato `rh@aeight.global`, copyright Aeight
- **Anexo:** PDF do holerite (via URL do storage)
- **Remetente:** `rh@financeiro.aeight.global`

**Lógica:**
1. Recebe `{ folha_id }`
2. Busca `folha_pagamento` → `fornecedor` (email) + `holerite_url`
3. Valida que existe holerite e e-mail
4. Envia via Resend com PDF em anexo
5. Registra em `email_logs`

### 4. UI na FolhaPagamentoTab

- Passar `plano_contas_id` para o `EditFolhaDialog`
- Adicionar botão de envio de e-mail (ícone Mail) na coluna de ações, visível apenas para registros com categoria Salário CLT **e** que tenham holerite anexado
- Toast de sucesso/erro no envio

### 5. Config

```toml
[functions.send-holerite-email]
verify_jwt = false
```

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Bucket `holerites` + coluna `holerite_url` |
| `src/components/rh/EditFolhaDialog.tsx` | Simplificar campos, adicionar FileUpload condicional, salvar `holerite_url` |
| `src/components/rh/FolhaPagamentoTab.tsx` | Botão enviar holerite na tabela |
| `supabase/functions/send-holerite-email/index.ts` | Nova edge function com template |
| `supabase/config.toml` | Registrar nova função |

