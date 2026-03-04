

## Plano: Hierarquia de Roles para Area de RH

### Resumo

Adicionar dois novos roles ao sistema: **Gerente de RH** (`rh_manager`) e **Analista de RH** (`rh_analyst`). Implementar um fluxo de aprovacao onde o Analista de RH sobe dados (importacao/edicao) que ficam pendentes ate aprovacao do Gerente de RH. Apos aprovacao, o sistema notifica o Gerente de Financas e Admin para confirmar a propagacao para o extrato (contas_pagar/parcelas_contrato).

### Acesso a Area de RH

| Role | Acesso RH | Pode editar/importar | Precisa aprovacao | Pode aprovar | Pode enviar holerite |
|---|---|---|---|---|---|
| Admin | Sim | Sim | Nao | Sim | Sim |
| Gerente de RH | Sim | Sim | Nao | Sim | Sim |
| Analista de RH | Sim | Sim | **Sim (Gerente RH)** | Nao | **Somente apos pago** |
| Demais roles | Nao | - | - | - | - |

### Fluxo de Aprovacao (3 etapas)

1. **Analista de RH** importa planilha ou edita registros -- dados ficam salvos em `folha_pagamento` com status `pendente_aprovacao_rh`
2. **Gerente de RH** visualiza registros pendentes e aprova -- status muda para `aprovado_rh`
3. Sistema envia **notificacao** para Admin e Gerente de Financas com detalhes dos lancamentos aprovados, pedindo confirmacao para **propagar valores para contas_pagar e parcelas_contrato** (atualizar extrato)
4. Admin/Gerente Financas confirma -- valores sao propagados e status muda para `processado`

### Alteracoes no Banco de Dados (Migration)

```sql
-- 1. Adicionar novos roles ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rh_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rh_analyst';

-- 2. Criar tabela de solicitacoes de aprovacao RH
CREATE TABLE public.solicitacoes_aprovacao_rh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR NOT NULL DEFAULT 'pendente', -- pendente, aprovado_rh, aprovado_financeiro, rejeitado
  tipo VARCHAR NOT NULL DEFAULT 'importacao', -- importacao, edicao_individual
  descricao TEXT,
  detalhes JSONB, -- array com resumo dos lancamentos alterados
  mes_referencia INTEGER NOT NULL,
  ano_referencia INTEGER NOT NULL,
  aprovador_rh_id UUID,
  data_aprovacao_rh TIMESTAMPTZ,
  aprovador_financeiro_id UUID,
  data_aprovacao_financeiro TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.solicitacoes_aprovacao_rh ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view solicitacoes_aprovacao_rh"
ON public.solicitacoes_aprovacao_rh FOR SELECT USING (true);

CREATE POLICY "RH roles can create solicitacoes_aprovacao_rh"
ON public.solicitacoes_aprovacao_rh FOR INSERT
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "RH managers and admins can update solicitacoes_aprovacao_rh"
ON public.solicitacoes_aprovacao_rh FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin','rh_manager','finance_manager']::app_role[]));

-- 3. Adicionar coluna de referencia na folha_pagamento
ALTER TABLE public.folha_pagamento ADD COLUMN IF NOT EXISTS solicitacao_rh_id UUID;
```

### Alteracoes no Frontend

#### 1. `useUserRole.ts`
- Adicionar `rh_manager` e `rh_analyst` ao type `AppRole`
- Adicionar labels: `'rh_manager': 'Gerente de RH'`, `'rh_analyst': 'Analista de RH'`
- Configurar permissoes:
  - **rh_manager**: `canAccessRH: true`, demais areas conforme necessidade
  - **rh_analyst**: `canAccessRH: true`, demais areas `false`
- Adicionar novas permissoes: `canApproveRH`, `needsApprovalForRH`, `canSendHoleriteOnlyWhenPaid`
- Adicionar `isRHManager`, `isRHAnalyst` helpers

#### 2. `Usuarios.tsx` (roleOptions)
- Adicionar opcoes de Gerente de RH e Analista de RH no select de roles

#### 3. `FolhaPagamentoTab.tsx`
- Condicionar acoes baseado no role:
  - Se `rh_analyst`: ao importar/editar, nao propagar direto -- salvar em `folha_pagamento` com status `pendente_aprovacao_rh` e criar registro em `solicitacoes_aprovacao_rh`
  - Se `rh_manager` ou `admin`: comportamento atual (ou tambem criar solicitacao para financeiro)
- Adicionar aba/secao de "Pendentes de Aprovacao" visivel para Gerente de RH
- Botao "Aprovar" em lote para Gerente de RH -- muda status e dispara notificacao

#### 4. `ImportarFolhaDialog.tsx`
- Se usuario eh `rh_analyst`: ao confirmar importacao, salvar dados na `folha_pagamento` mas NAO propagar para `parcelas_contrato`/`contas_pagar`. Criar `solicitacao_aprovacao_rh` com detalhes JSON
- Se `rh_manager`/`admin`: criar solicitacao para aprovacao financeira (etapa 3)

#### 5. `EditFolhaDialog.tsx`
- Mesma logica: se `rh_analyst`, salvar mas nao propagar, marcar como pendente

#### 6. Novo componente: `AprovacaoRHPanel.tsx`
- Painel visivel para Gerente de RH com lista de solicitacoes pendentes
- Detalhes: quem solicitou, quantos lancamentos, valores totais
- Botoes: Aprovar / Rejeitar
- Ao aprovar: atualizar status, enviar notificacao para Admin e Gerente Financas

#### 7. Novo componente: `ConfirmacaoFinanceiroRHDialog.tsx`
- Dialog acessado via notificacao pelo Admin/Gerente Financas
- Mostra detalhes de todos lancamentos aprovados pelo RH
- Botao "Confirmar e Atualizar Extrato" -- propaga valores para `parcelas_contrato` e `contas_pagar`

#### 8. `EnviarHoleriteDialog.tsx` / Botao de envio
- Se `rh_analyst`: desabilitar envio de holerite se `status !== 'pago'`
- Mostrar tooltip explicativo quando desabilitado

#### 9. `AppSidebar.tsx`
- Permitir acesso ao menu RH para roles `rh_manager` e `rh_analyst`

#### 10. `ProtectedRoute.tsx` / `usePermissionCheck.ts`
- Incluir `canAccessRH` na verificacao de acesso

### Arquivos Impactados

| Arquivo | Acao |
|---|---|
| Migration SQL | Novo enum values + tabela `solicitacoes_aprovacao_rh` |
| `src/hooks/useUserRole.ts` | Novos roles, permissoes, helpers |
| `src/hooks/usePermissionCheck.ts` | Novas permission keys |
| `src/pages/Usuarios.tsx` | Novas opcoes de role |
| `src/components/rh/FolhaPagamentoTab.tsx` | Logica condicional por role |
| `src/components/rh/ImportarFolhaDialog.tsx` | Fluxo de aprovacao |
| `src/components/rh/EditFolhaDialog.tsx` | Fluxo de aprovacao |
| `src/components/rh/EnviarHoleriteDialog.tsx` | Restricao holerite somente pago |
| `src/components/rh/AprovacaoRHPanel.tsx` | **Novo** -- painel de aprovacao RH |
| `src/components/rh/ConfirmacaoFinanceiroRHDialog.tsx` | **Novo** -- confirmacao financeiro |
| `src/components/layout/AppSidebar.tsx` | Acesso RH para novos roles |
| `src/pages/RecursosHumanos.tsx` | Integrar painel de aprovacao |

