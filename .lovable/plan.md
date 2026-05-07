## Objetivo

Implementar workflow completo de aprovação para solicitações enviadas por prestadores e funcionários (NF mensal e reembolsos), com nova hierarquia, agrupamento por **grupo** (time) e **empresa** (centro de custo), novo papel de **Líder de Área**, e o usuário **Admin com acesso total a todas as etapas** (pode aprovar/rejeitar em qualquer fase).

---

## 1. Workflow de aprovação

### NF de prestação de serviço (`tipo = 'nf_mensal'`)
```
Prestador envia → pendente_rh_analista
   → Analista RH valida → validado_rh
        → Gerente RH aprova → aprovado_rh
              → Gerente Financeiro aprova → aprovado_financeiro
```

### Reembolso (`tipo = 'reembolso'`)
```
Solicitante envia → pendente_lider
   → Líder do grupo aprova → pendente_rh_analista
        → Analista RH valida → validado_rh
              → Gerente RH aprova → aprovado_rh
                    → Gerente Financeiro aprova → aprovado_financeiro
```

### Recusas (motivo obrigatório → notificação)
- Líder rejeita → notifica solicitante
- Analista RH rejeita → notifica solicitante
- Gerente RH rejeita → notifica Analista RH que validou
- Gerente Financeiro rejeita → notifica Gerente RH que aprovou

### Acesso do Admin (transversal)
- Admin **enxerga e age em todas as etapas** (Líder, Analista RH, Gerente RH, Financeiro).
- Pode aprovar pulando etapas se necessário e pode rejeitar em qualquer fase.
- RLS e UI sempre incluem `has_role(auth.uid(), 'admin')` como bypass.

---

## 2. Grupos e Empresas

**Grupos (times):** Tecnologia, Operações, People, Financeiro, Design — cada um com 1 líder (`lider_area`).

**Empresas (centros de custo já existentes):** b8one, Lomadee, Cryah, SAIO — derivadas automaticamente do fornecedor vinculado ao usuário.

---

## 3. Cadastro e vínculo de usuários

- Cadastro inicial → role `user`.
- Admin, em **Usuários**, ao promover para `prestador_servico`, `funcionario` ou `lider_area`, deve obrigatoriamente:
  - Vincular um **fornecedor** (a empresa vem do CC do fornecedor).
  - Selecionar o **grupo**.
  - Para `lider_area`: também escolher **qual grupo lidera**.
- Vínculo continua sendo auto-aprovado.

---

## 4. Mudanças no banco

**a)** Nova role `lider_area`:
```sql
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'lider_area';
```

**b)** Tabela `grupos_area` (id, nome unique, lider_user_id nullable, timestamps). Seed: Tecnologia, Operações, People, Financeiro, Design.

**c)** `profiles` ganha `grupo_id uuid` (FK grupos_area).

**d)** `solicitacoes_prestador` ganha:
- `aprovador_lider_id`, `data_aprovacao_lider`, `motivo_rejeicao_lider`
- Novos status: `pendente_lider`, `pendente_rh_analista`, `validado_rh`, `aprovado_rh`, `aprovado_financeiro`, `rejeitado_lider`, `rejeitado_rh_analista`, `rejeitado_rh_gerente`, `rejeitado_financeiro`.

**e)** RLS de `solicitacoes_prestador` (todas as policies incluem bypass `has_role(auth.uid(),'admin')`):
- Líder: vê/atualiza onde `solicitante.profiles.grupo_id` = grupo que lidera (security-definer `is_lider_do_grupo`).
- Analista RH: status `pendente_rh_analista`.
- Gerente RH: status `validado_rh`.
- Gerente Financeiro: status `aprovado_rh`.
- Admin: todas as etapas/status.

---

## 5. Mudanças no frontend

### `useUserRole.ts`
- Adicionar `lider_area` em `AppRole` + label.
- Permissões: `canApproveLider`, `canValidateRH` (analista), `canApproveRH` (gerente), `canApproveReembolsoFinanceiro`. Admin recebe **todas** marcadas como `true`.

### `Usuarios.tsx` + edge function `update-user`
- Novos campos: **Grupo** e (se `lider_area`) **Grupo que lidera**.
- Persistir `grupo_id` em `profiles` e `lider_user_id` em `grupos_area`.
- Validar fornecedor + grupo obrigatórios para roles de portal.

### Nova página `AprovacaoLider.tsx`
- Lista reembolsos `pendente_lider` do grupo do líder (admin vê todos).
- Aprovar → `pendente_rh_analista`. Rejeitar com motivo → notifica solicitante.
- Item de menu visível para `lider_area` e admin.

### `AprovacaoPrestadores.tsx` (refatorar)
- Três abas: **Validação Analista RH**, **Aprovação Gerente RH**, **Aprovação Financeiro**.
- Cada aba lê o status correspondente; admin vê todas as abas.
- Cada ação grava timestamps/aprovador da etapa e dispara notificação conforme regras da seção 1.
- Manter, na etapa Financeiro, a vinculação de parcela (NF) e criação de `contas_pagar` com plano 3.1.14 (Reembolso) já existentes.

### `NovaSolicitacaoDialog.tsx`
- Status inicial:
  - NF mensal → `pendente_rh_analista`
  - Reembolso → `pendente_lider` (bloqueia envio se solicitante não tiver grupo com líder definido, com mensagem orientando contatar admin)

### `MinhasSolicitacoes.tsx`
- Atualizar rótulos dos novos status e mostrar todos os motivos (`motivo_rejeicao_lider`, `motivo_rejeicao_rh`, `motivo_rejeicao_financeiro`).

### Configurações → Grupos (admin)
- Tela simples para listar os 5 grupos e definir/alterar o líder de cada um.

---

## 6. Roteamento de notificações

| Ação | Destinatário |
|------|-------------|
| Líder rejeita | solicitante |
| Analista RH rejeita | solicitante |
| Gerente RH rejeita | analista RH (`aprovador_rh_id` da validação) |
| Financeiro aprova | solicitante (concluído) |
| Financeiro rejeita | gerente RH (`aprovador_rh_id`) |
| Admin atua em qualquer etapa | mesmo destinatário da etapa correspondente |

---

## 7. Pontos a confirmar

1. Apenas **1 líder por grupo** (proposta).
2. Reembolso **bloqueia** envio se usuário não tiver grupo/líder (proposta).
3. NF mensal **não** passa pelo líder (proposta).
4. Líder enviando reembolso próprio → vai direto para Analista RH (proposta).

Confirme (ou aprove com as propostas) que sigo a implementação.
