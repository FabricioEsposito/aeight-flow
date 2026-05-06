# Portal de Envios — Prestadores & Funcionários

## Visão geral

Criar uma área dedicada onde **prestadores de serviço** enviam Notas Fiscais mensais e solicitações de reembolso, e **funcionários CLT** enviam apenas reembolsos. Fluxo de aprovação em duas etapas: **RH valida → Financeiro libera pagamento**.

```text
PRESTADOR/FUNC.    →    RH (valida)    →    FINANCEIRO (libera)    →    Pagamento
   (upload)              (aprovar/rejeitar)    (gera lançamento)         (folha/conta a pagar)
```

---

## 1. Novos roles e auto-cadastro

Adicionar ao enum `app_role`:
- `prestador_servico` — envia NF mensal + reembolsos
- `funcionario` — envia apenas reembolsos

**Auto-cadastro com aprovação:**
- Tela `/auth` ganha aba "Sou prestador/funcionário" (CNPJ/CPF + dados)
- Sistema busca match em `fornecedores` pelo CNPJ/CPF
- Cria registro em nova tabela `vinculos_usuario_fornecedor` com `status='pendente'`
- Admin aprova na área de Usuários → ativa role e vínculo
- Sem match → admin cadastra manualmente o fornecedor antes

## 2. Schema do banco

**Nova tabela `vinculos_usuario_fornecedor`:**
- `user_id`, `fornecedor_id`, `tipo` (prestador/funcionario), `status` (pendente/aprovado/rejeitado), `aprovado_por`, timestamps
- RLS: usuário vê seu próprio; admin vê todos

**Nova tabela `solicitacoes_prestador`** (NF mensal e reembolso unificados):
- `id`, `solicitante_id` (user_id), `fornecedor_id`, `tipo` ('nf_mensal' | 'reembolso')
- `valor`, `descricao`, `mes_referencia`, `ano_referencia`
- `arquivo_url` (storage path da NF/comprovante)
- `numero_nf` (opcional, só para NF)
- `status`: `pendente_rh` → `aprovado_rh` / `rejeitado_rh` → `aprovado_financeiro` / `rejeitado_financeiro` → `pago`
- `aprovador_rh_id`, `data_aprovacao_rh`, `motivo_rejeicao_rh`
- `aprovador_financeiro_id`, `data_aprovacao_financeiro`, `motivo_rejeicao_financeiro`
- `parcela_id` (NF mensal: RH escolhe parcela do contrato p/ vincular)
- `conta_pagar_id` (reembolso: gerado ao aprovar no financeiro)
- `folha_pagamento_id` (NF mensal: vinculação à folha)
- `data_vencimento_pagamento` (definida pelo financeiro)
- timestamps + `created_by`

**Novo bucket storage:** `prestador-docs` (privado, signed URLs — segue padrão `faturamento-docs`)

**Plano de contas para reembolso:** **`3.1.14`** (já existente, será usado como destino padrão dos reembolsos aprovados)

## 3. Fluxo — Reembolso (prestador OU funcionário)

```text
1. Usuário acessa /portal/reembolsos → "Novo reembolso"
2. Form: valor, descrição, upload do comprovante (NF/recibo)
3. Status = pendente_rh
4. RH (em /rh/aprovacoes nova aba "Reembolsos"): aprova ou rejeita
5. Aprovado → status = aprovado_rh → notifica financeiro
6. Financeiro (em /solicitacoes nova aba "Reembolsos"): aprova
   - Define data de vencimento + conta bancária
   - Sistema cria conta_pagar avulsa: fornecedor=solicitante, plano_conta=3.1.14, link_nf=arquivo do comprovante
   - status = aprovado_financeiro
7. Quando dada baixa no extrato → status = pago
```

## 4. Fluxo — NF Mensal (somente prestador)

```text
1. Prestador acessa /portal/notas-fiscais → "Enviar NF do mês"
2. Form: mês/ano referência, número NF, valor, descrição, upload PDF
3. Status = pendente_rh
4. RH (aba "NF Prestadores"): valida e SELECIONA a parcela do contrato do prestador a vincular
   - Lista de parcelas vem de parcelas_contrato dos contratos onde fornecedor_id = prestador
   - Filtro automático: contratos com plano de contas 2.1.3 (folha) ou 3.1.4 (prestadores)
5. Aprovado → atualiza folha_pagamento.holerite_url ou cria registro de folha vinculado à parcela; copia arquivo para link_nf da conta_pagar correspondente
6. Anexo fica acessível no Extrato/Folha
```

## 5. Novas páginas e rotas

**Para prestador/funcionário (layout simplificado, só portal):**
- `/portal` — dashboard com últimas solicitações + status
- `/portal/reembolsos` — lista + botão novo
- `/portal/notas-fiscais` — só prestador
- `ProtectedRoute` redireciona prestador/funcionario direto para `/portal` (não acessam financeiro/RH internos)

**Para RH:**
- Nova aba em `/rh/aprovacoes`: "Reembolsos" e "NF Prestadores"

**Para Financeiro:**
- Nova aba em `/solicitacoes`: "Reembolsos pendentes"

**Para Admin:**
- Nova aba em `/usuarios`: "Vínculos pendentes" (aprovar auto-cadastros)

## 6. Permissions (`useUserRole`)

Novas flags:
- `canAccessPortal` (prestador, funcionario, admin)
- `canSendNFPrestador` (prestador apenas)
- `canSendReembolso` (prestador, funcionario)
- `canApproveReembolsoRH` (rh_manager, rh_analyst, admin)
- `canApproveReembolsoFinanceiro` (finance_manager, admin)
- `canApproveVinculoUsuario` (admin)

`prestador_servico` e `funcionario` ficam isolados: sem acesso a dashboard, financeiro, RH internos, contratos, etc.

## 7. Notificações

- RH recebe notificação a cada nova solicitação
- Financeiro recebe ao aprovar RH
- Prestador/funcionário recebe a cada mudança de status (aprovado/rejeitado/pago)
- Email opcional via Resend (`financeiro@aeight.global`) — usar template existente

## 8. RLS principais

- `solicitacoes_prestador`:
  - SELECT: solicitante vê as suas; RH/Financeiro/admin veem todas
  - INSERT: prestador/funcionario só com `solicitante_id = auth.uid()`
  - UPDATE: RH atualiza campos RH; Financeiro atualiza campos financeiro
- `vinculos_usuario_fornecedor`:
  - SELECT própria + admin tudo
  - INSERT autenticado próprio
  - UPDATE só admin
- Storage `prestador-docs`: usuário só lê seus arquivos; RH/Financeiro/admin leem tudo (seguindo padrão `holerites`)

## 9. Detalhes técnicos

- Arquivos: signed URLs 1h via `openStorageFile` existente
- Quando reembolso é aprovado pelo financeiro: `INSERT contas_pagar` com `plano_conta_id` correspondente ao código `3.1.14`, `link_nf` = path do arquivo no bucket `prestador-docs`
- Quando NF é vinculada à parcela: `link_nf` da `contas_pagar` correspondente é atualizado com path do arquivo
- Validação: zod schemas em todos os forms
- Campo `mes_referencia/ano_referencia` na NF guia o RH na escolha da parcela (filtrar por mês)

## 10. Entregáveis

1. Migration: enum roles, 2 tabelas novas, bucket `prestador-docs`, RLS
2. Hook `useUserRole` atualizado + `usePermissionCheck` + roleLabels
3. Layout `PortalLayout` minimalista (sem sidebar do app)
4. 3 páginas portal (dashboard + reembolsos + NF)
5. Componentes: `NovoReembolsoDialog`, `NovaNFDialog`, `AprovarReembolsoDialog`, `AprovarNFDialog` (RH escolhe parcela), `AprovarFinanceiroReembolsoDialog`, `AprovarVinculoDialog`
6. Abas novas em `/rh/aprovacoes`, `/solicitacoes`, `/usuarios`
7. `App.tsx`: rotas `/portal/*` + redirecionamento por role
8. Notificações + emails

## Confirmação pendente

- Funcionário CLT precisa estar cadastrado em `fornecedores` ou em outra tabela? (assumirei `fornecedores` com `tipo_pessoa=PF`, mantendo simplicidade — funcionário pode existir como PF para fins de pagamento de reembolso)
