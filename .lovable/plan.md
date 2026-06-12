## Objetivo

Alterar o fluxo de **reembolso** (sem mexer em NF mensal) para a ordem **Solicitante → RH Analista → Líder → Financeiro**, com e-mails automáticos em cada transição.

## Fluxo novo (reembolso)

```text
Envio → confirmação ao solicitante
      → pendente_rh_analista
        ├─ Rejeita → e-mail rejeição c/ motivo ao solicitante (fim)
        └─ Aprova  → e-mail "aprovado pelo RH" ao solicitante
                   → pendente_lider
                     → e-mail ao líder (notificação + link plataforma)
                     ├─ Rejeita → e-mail rejeição c/ motivo ao solicitante (fim)
                     └─ Aprova  → e-mail "aprovado, encaminhado ao financeiro" ao solicitante
                               → aprovado_lider (financeiro processa como hoje)
```

NF mensal continua como hoje (não há líder).

## Alterações de código

### 1. `src/components/portal/NovaSolicitacaoDialog.tsx`
- Para `tipo === 'reembolso'`: status inicial sempre **`pendente_rh_analista`** (remover a lógica que pulava direto para `aprovado_lider` quando não havia líder).
- Após `insert`, chamar `notify-solicitacao-prestador` com `evento: 'criado'` para disparar o e-mail de confirmação ao solicitante.

### 2. `src/pages/AprovacaoPrestadores.tsx`
- Mudar a ordem das abas/steps para reembolso: **rh_analista → lider → financeiro** (hoje é lider → rh_analista → rh_gerente → financeiro).
- Ao aprovar no step `rh_analista` (reembolso): definir `status = 'pendente_lider'`, gravar `aprovador_rh_analista_id` + data, disparar:
  - `notify-solicitacao-prestador` evento `aprovado_rh` (e-mail ao solicitante);
  - `notify-solicitacao-prestador` evento `pendente_lider` (e-mail ao líder, buscando `grupos_area.lider_user_id` → `profiles.email` do solicitante);
  - notificação in-app para o líder.
- Ao aprovar no step `lider` (reembolso): `status = 'aprovado_lider'`, disparar `notify-solicitacao-prestador` evento `aprovado_lider` (e-mail ao solicitante: "encaminhado ao financeiro").
- Rejeições em qualquer step (lider/rh_analista): manter caixa de motivo, disparar `notify-solicitacao-prestador` evento `rejeitado` com o motivo (já existe — só garantir copy correto por etapa).
- NF mensal: comportamento atual preservado.

### 3. `supabase/functions/notify-solicitacao-prestador/index.ts`
Expandir os eventos suportados e os templates HTML:

| evento | destinatário | copy |
|---|---|---|
| `criado` (reembolso) | solicitante | "Recebemos sua solicitação de reembolso..." |
| `aprovado_rh` (reembolso) | solicitante | "Seu reembolso foi aprovado pelo RH..." |
| `pendente_lider` (reembolso) | líder de área | "Líder, o colaborador X enviou uma solicitação..." com critérios e prazo dia 20 |
| `aprovado_lider` (reembolso) | solicitante | "Aprovado e encaminhado ao financeiro, pagamento dia 20..." |
| `rejeitado` (qualquer step) | solicitante | mantém atual com motivo |
| `aprovado` (NF) | mantém atual | — |

- Para `pendente_lider`: a função buscará `solicitante_id → profiles.grupo_id → grupos_area.lider_user_id → profiles.email` para resolver o destinatário e o nome do solicitante.
- Para `criado / aprovado_rh / aprovado_lider`: destinatário é o e-mail profissional do solicitante (`profiles.email`), não o do fornecedor.
- Manter `cc: hello.people@b8one.com` e remetente `Aeight RH <rh@financeiro.aeight.global>`.

### 4. Banco
- Nenhuma mudança de schema necessária. Os status `pendente_rh_analista`, `pendente_lider`, `aprovado_lider`, `aprovado_rh`, `rejeitado_lider`, `rejeitado_rh` já existem e são usados pela tela de aprovações.

## Fora de escopo
- Fluxo de NF mensal (mantido).
- Telas de listagem em `MinhasSolicitacoes`/`PortalReembolsos` (apenas seguirão exibindo os novos status já mapeados pelo `StatusBadge`).
- Cronograma de pagamento dia 20 — apenas mencionado nos e-mails, sem automação de data.
