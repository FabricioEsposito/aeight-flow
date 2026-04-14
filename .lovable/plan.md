

## Plano: Guia Interativo para Novos Usuarios

### Resumo
Criar um sistema de onboarding interativo dentro do app com tour guiado, tooltips e checklist de progresso para novos usuarios aprenderem a usar o sistema.

### Componentes

**1. Pagina de Tutoriais (`/tutoriais`)**
- Uma pagina acessivel pelo sidebar com lista de tutoriais organizados por area (Cadastro, Financeiro, RH, Comercial, etc.)
- Cada tutorial e um card clicavel que inicia o tour guiado da respectiva area
- Barra de progresso mostrando quantos tutoriais o usuario ja completou
- Marcacao de "concluido" salva no localStorage

**2. Componente de Tour Guiado (`OnboardingTour`)**
- Overlay com highlight no elemento alvo + tooltip explicativo com setas
- Botoes "Proximo", "Anterior" e "Pular"
- Steps configurados por area do sistema (ex: "Como cadastrar um cliente", "Como criar um contrato", "Como gerar pagamento em lote")
- Indicador de progresso (step 2 de 5)

**3. Checklist de Primeiro Acesso**
- Dialog/modal que aparece na primeira vez que o usuario loga
- Lista de tarefas iniciais: "Cadastrar primeiro cliente", "Conhecer o dashboard", "Entender contas a receber"
- Cada item linka para o tour correspondente
- Pode ser reaberto pela pagina de tutoriais

**4. Botao de Ajuda no Header**
- Icone de `HelpCircle` no AppHeader ao lado do tema
- Abre dropdown com: "Ver tutoriais", "Iniciar tour desta pagina", "Checklist de onboarding"

### Estrutura dos Tours por Area

| Area | Steps |
|------|-------|
| Dashboard | Cards de resumo, graficos, filtros |
| Cadastro | Criar cliente, fornecedor, contrato |
| Financeiro | Contas a receber/pagar, extrato, exportar pagamento |
| RH | Folha de pagamento, beneficios, aprovacoes |
| Comercial | Dashboard comercial, vendedores, comissoes |
| Faturamento | Controle, edicao, envio de email |

### Detalhes Tecnicos

- **Biblioteca**: Implementacao custom usando `position: fixed` overlay com `z-index` alto e calculo de posicao do elemento alvo via `getBoundingClientRect()`
- **Persistencia**: `localStorage` para salvar progresso dos tutoriais e estado do checklist
- **Rota**: `/tutoriais` adicionada ao `App.tsx` e ao sidebar
- **Arquivos novos**:
  - `src/pages/Tutoriais.tsx` — pagina principal
  - `src/components/onboarding/OnboardingTour.tsx` — componente do tour
  - `src/components/onboarding/OnboardingChecklist.tsx` — checklist
  - `src/components/onboarding/tourSteps.ts` — configuracao dos steps por area
  - `src/hooks/useOnboarding.ts` — hook para estado do onboarding
- **Sidebar**: Novo item "Tutoriais" com icone `GraduationCap` no grupo principal

