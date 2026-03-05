

## Plano: Controle de Ferramentas de Software

### Objetivo
Criar uma nova área dentro do Financeiro para gerenciar ferramentas de software (ex: Adobe, Google Workspace), com controle de licenças por fornecedor/pessoa, custo individual e total mensal, segmentado por centro de custo.

### Modelo de Dados (2 novas tabelas)

**`ferramentas_software`** — cadastro das ferramentas
- `id` (uuid, PK)
- `nome` (varchar) — ex: "Adobe Creative Cloud"
- `descricao` (text, nullable)
- `centro_custo_id` (uuid, FK → centros_custo)
- `valor_mensal` (numeric) — valor total esperado/mês
- `status` (varchar, default 'ativo')
- `created_at`, `updated_at`

**`ferramentas_software_licencas`** — licenças individuais por fornecedor/pessoa
- `id` (uuid, PK)
- `ferramenta_id` (uuid, FK → ferramentas_software)
- `fornecedor_id` (uuid, FK → fornecedores) — a pessoa/empresa que usa
- `descricao_usuario` (text, nullable) — nome do usuário da licença
- `valor_licenca` (numeric) — custo dessa licença
- `status` (varchar, default 'ativo')
- `created_at`, `updated_at`

RLS: mesmas políticas do padrão financeiro (SELECT para authenticated, INSERT para authenticated, UPDATE para finance roles, DELETE para admin).

### Componentes Frontend

1. **Página `FerramentasSoftware.tsx`** — lista de ferramentas com filtro por centro de custo (multi-select), exibindo nome, centro de custo, valor mensal total, quantidade de licenças, e um badge de validação (soma licenças vs valor total)

2. **Dialog `NovaFerramentaDialog.tsx`** — formulário para criar/editar ferramenta (nome, descrição, centro de custo, valor mensal)

3. **Dialog `GerenciarLicencasDialog.tsx`** — ao clicar numa ferramenta, abre detalhes com tabela de licenças (fornecedor, descrição do usuário, valor). Permite adicionar/editar/remover licenças. Exibe alerta se soma das licenças ≠ valor total da ferramenta

### Navegação

- Adicionar item "Ferramentas de Software" no grupo "Financeiro" do sidebar, com ícone `Monitor` (lucide)
- Rota: `/ferramentas-software`

### Validação

- A soma dos `valor_licenca` de todas as licenças ativas de uma ferramenta deve ser comparada com o `valor_mensal`. Exibir indicador visual (verde se bate, vermelho se diverge)

### Arquivos a criar/editar

- **Migração SQL**: criar tabelas `ferramentas_software` e `ferramentas_software_licencas` com RLS
- **`src/pages/FerramentasSoftware.tsx`**: página principal
- **`src/components/ferramentas/NovaFerramentaDialog.tsx`**: criar/editar ferramenta
- **`src/components/ferramentas/GerenciarLicencasDialog.tsx`**: gerenciar licenças
- **`src/components/ferramentas/FerramentasTable.tsx`**: tabela de ferramentas
- **`src/components/layout/AppSidebar.tsx`**: adicionar item no menu
- **`src/App.tsx`**: adicionar rota protegida

