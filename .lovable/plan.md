

## Adicionar Razão Social e CNPJ da Titular nos Dados Bancários dos E-mails

### Objetivo
Complementar o bloco "Dados para Pagamento" (PIX/Transferência) dos e-mails de **faturamento** e **cobrança** com a **Razão Social** e o **CNPJ** da pessoa jurídica titular da conta bancária, derivados a partir do nome da conta cadastrada.

### Mapeamento (entidade titular por sufixo da conta)

| Sufixo no `descricao` da conta | Razão Social | CNPJ |
|---|---|---|
| `Matriz b8one` (e `Conta Garantia b8one`) | B8ONE CONSULTORIA TECNICA EM TI LTDA | 31.044.681/0001-13 |
| `Filial b8one` | B8ONE CONSULTORIA TECNICA EM TI LTDA | 31.044.681/0002-02 |
| `Matriz Lomadee` | PLUGONE CONSULTORIA TECNICA EM TI LTDA | 38.442.433/0001-70 |
| `Matriz Cryah` | CRYAH AGENCIA DIGITAL LTDA | 12.104.320/0001-70 |
| qualquer outro | (omite Razão Social/CNPJ, mostra apenas dados bancários) | — |

A resolução é feita **no código da edge function**, lendo o campo `contas_bancarias.descricao` e batendo o sufixo. Não há mudança de schema nem cadastro adicional — a relação entidade ↔ conta é determinística pela nomenclatura já existente.

### Mockup do bloco atualizado (PIX / Transferência)

```text
┌──────────── DADOS PARA PAGAMENTO ────────────┐
│ 💳  Forma de Pagamento: PIX                  │
│                                              │
│  Titular:        Banco Itaú - Matriz b8one   │
│  Razão Social:   B8ONE CONSULTORIA TECNICA   │
│                  EM TI LTDA                  │
│  CNPJ:           31.044.681/0001-13          │
│                                              │
│  Banco:    Itaú Unibanco S.A                 │
│  Agência:  2937                              │
│  Conta:    21551-3 (Conta Corrente)          │
│                                              │
│  Após o pagamento, envie o comprovante para  │
│  financeiro@aeight.global                    │
└──────────────────────────────────────────────┘
```

Quando a conta não for de uma das matrizes/filiais mapeadas, as linhas **Razão Social** e **CNPJ** são omitidas — o restante do bloco aparece normalmente.

### Detalhes técnicos

**Arquivos a alterar (já planejados na etapa anterior):**
- `supabase/functions/send-billing-emails/index.ts`
- `supabase/functions/send-collection-emails/index.ts`

**Mudanças adicionais nesta etapa:**
1. Criar helper `resolveTitularPJ(descricaoConta: string)` que retorna `{ razao_social, cnpj } | null` aplicando a tabela acima (match por `endsWith` case-insensitive nos sufixos).
2. Estender o helper `buildDadosBancariosHtml(...)` para receber também o resultado de `resolveTitularPJ` e renderizar as linhas extras quando presentes.
3. Sem alterações de schema, sem nova consulta — o `descricao` já vem do join com `contas_bancarias` previsto no plano anterior.

### Fora do escopo
- Alterar a nomenclatura das contas bancárias.
- Cadastrar dados PJ no banco (`contas_bancarias` não terá novos campos).
- E-mails com tipo `boleto` (continuam inalterados).

