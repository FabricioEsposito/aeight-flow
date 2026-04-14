import type { Tutorial } from '@/contexts/OnboardingContext';

export const tutorials: Tutorial[] = [
  {
    id: 'dashboard',
    title: 'Conhecendo o Dashboard',
    description: 'Aprenda a navegar pelo painel principal e entender os indicadores.',
    area: 'Geral',
    icon: 'Home',
    route: '/',
    steps: [
      {
        id: 'dashboard-1',
        title: 'Painel Principal',
        description: 'Este é o Dashboard do sistema. Aqui você tem uma visão geral de todas as áreas: financeiro, contratos, clientes e muito mais.',
      },
      {
        id: 'dashboard-2',
        title: 'Cards de Resumo',
        description: 'Os cards no topo mostram os principais indicadores como receitas, despesas e saldo. Eles atualizam automaticamente com os dados do sistema.',
      },
      {
        id: 'dashboard-3',
        title: 'Gráficos e Análises',
        description: 'Abaixo dos cards você encontra gráficos interativos com análises de DRE, fluxo de caixa e gestão de contratos.',
      },
      {
        id: 'dashboard-4',
        title: 'Menu Lateral',
        description: 'Use o menu lateral para navegar entre as áreas do sistema. Você pode favoritar itens clicando na estrela ao lado de cada item.',
      },
    ],
  },
  {
    id: 'clientes',
    title: 'Cadastrar Clientes',
    description: 'Aprenda a cadastrar e gerenciar seus clientes no sistema.',
    area: 'Cadastro',
    icon: 'Users',
    route: '/clientes',
    steps: [
      {
        id: 'clientes-1',
        title: 'Lista de Clientes',
        description: 'Nesta página você visualiza todos os clientes cadastrados. Use a barra de busca para encontrar clientes rapidamente.',
      },
      {
        id: 'clientes-2',
        title: 'Novo Cliente',
        description: 'Clique no botão "Novo Cliente" para abrir o formulário de cadastro. Preencha os dados como razão social, CNPJ/CPF e informações de contato.',
      },
      {
        id: 'clientes-3',
        title: 'Consulta Automática de CNPJ',
        description: 'Ao digitar um CNPJ, o sistema consulta automaticamente os dados da empresa e preenche os campos como razão social, endereço e nome fantasia.',
      },
      {
        id: 'clientes-4',
        title: 'Status do Cliente',
        description: 'Cada cliente pode estar ativo ou inativo. Clientes inativos não aparecem nas seleções de contratos e lançamentos.',
      },
    ],
  },
  {
    id: 'contratos',
    title: 'Criar Contratos',
    description: 'Saiba como criar e gerenciar contratos de receita e despesa.',
    area: 'Cadastro',
    icon: 'FileText',
    route: '/contratos',
    steps: [
      {
        id: 'contratos-1',
        title: 'Lista de Contratos',
        description: 'Aqui você vê todos os contratos cadastrados com informações de cliente/fornecedor, valor, status e período.',
      },
      {
        id: 'contratos-2',
        title: 'Novo Contrato',
        description: 'Clique em "Novo Contrato" para iniciar o cadastro. Escolha entre contrato de Receita ou Despesa e preencha os dados necessários.',
      },
      {
        id: 'contratos-3',
        title: 'Parcelas Automáticas',
        description: 'O sistema gera parcelas automaticamente com base no período e valor do contrato. Você pode personalizar datas e valores de cada parcela.',
      },
      {
        id: 'contratos-4',
        title: 'Centro de Custo',
        description: 'Associe centros de custo ao contrato com rateio percentual para ter controle detalhado de custos por área.',
      },
    ],
  },
  {
    id: 'contas-receber',
    title: 'Contas a Receber',
    description: 'Gerencie seus recebíveis e acompanhe o fluxo de receitas.',
    area: 'Financeiro',
    icon: 'TrendingUp',
    route: '/contas-receber',
    steps: [
      {
        id: 'cr-1',
        title: 'Painel de Contas a Receber',
        description: 'Aqui você visualiza todos os lançamentos de receita com status, valores e datas de vencimento.',
      },
      {
        id: 'cr-2',
        title: 'Filtros Avançados',
        description: 'Use os filtros por período, status, cliente e categoria para encontrar lançamentos específicos rapidamente.',
      },
      {
        id: 'cr-3',
        title: 'Baixa de Recebimento',
        description: 'Ao receber um pagamento, use a opção de "Dar Baixa" para registrar o recebimento, podendo informar juros, multa e descontos.',
      },
      {
        id: 'cr-4',
        title: 'Novo Lançamento',
        description: 'Crie lançamentos avulsos (fora de contrato) clicando em "Novo Lançamento" e preenchendo os dados do recebível.',
      },
    ],
  },
  {
    id: 'contas-pagar',
    title: 'Contas a Pagar',
    description: 'Controle todas as despesas e compromissos financeiros.',
    area: 'Financeiro',
    icon: 'TrendingDown',
    route: '/contas-pagar',
    steps: [
      {
        id: 'cp-1',
        title: 'Painel de Contas a Pagar',
        description: 'Visualize todas as despesas pendentes, pagas e vencidas organizadas por data de vencimento.',
      },
      {
        id: 'cp-2',
        title: 'Pagamento em Lote',
        description: 'Selecione múltiplos lançamentos e use o pagamento em lote para agilizar o processamento de pagamentos.',
      },
      {
        id: 'cp-3',
        title: 'Anexar Boletos e NF',
        description: 'Cada lançamento pode ter boletos e notas fiscais anexados para controle e documentação.',
      },
    ],
  },
  {
    id: 'extrato',
    title: 'Extrato Bancário',
    description: 'Acompanhe as movimentações e exporte relatórios.',
    area: 'Financeiro',
    icon: 'BarChart3',
    route: '/extrato',
    steps: [
      {
        id: 'extrato-1',
        title: 'Visão do Extrato',
        description: 'O extrato mostra todas as movimentações de entrada e saída organizadas por data, com saldo atualizado.',
      },
      {
        id: 'extrato-2',
        title: 'Exportar Pagamento em Lote',
        description: 'Use o botão "Exportar Pagamento em Lote" para gerar uma planilha com os dados bancários para facilitar os pagamentos.',
      },
      {
        id: 'extrato-3',
        title: 'Filtros por Conta',
        description: 'Filtre o extrato por conta bancária para ver movimentações de uma conta específica.',
      },
    ],
  },
  {
    id: 'faturamento',
    title: 'Controle de Faturamento',
    description: 'Gerencie notas fiscais e envio de cobranças.',
    area: 'Financeiro',
    icon: 'Receipt',
    route: '/controle-faturamento',
    steps: [
      {
        id: 'fat-1',
        title: 'Painel de Faturamento',
        description: 'Aqui você controla os lançamentos que precisam ser faturados, com dados de NF, valores e status de envio.',
      },
      {
        id: 'fat-2',
        title: 'Editar Faturamento',
        description: 'Clique em um lançamento para adicionar número da NF, link da NF, e ajustar dados de faturamento.',
      },
      {
        id: 'fat-3',
        title: 'Enviar Cobrança por E-mail',
        description: 'Use a opção de envio de e-mail para enviar boletos e cobranças diretamente para o cliente.',
      },
    ],
  },
  {
    id: 'rh',
    title: 'Recursos Humanos',
    description: 'Gerencie folha de pagamento, benefícios e aprovações.',
    area: 'RH',
    icon: 'Briefcase',
    route: '/rh',
    steps: [
      {
        id: 'rh-1',
        title: 'Dashboard RH',
        description: 'O dashboard de RH mostra um resumo da folha de pagamento e benefícios, com totais por tipo de vínculo.',
      },
      {
        id: 'rh-2',
        title: 'Folha de Pagamento',
        description: 'Na seção de folha, cadastre e gerencie os pagamentos de funcionários CLT e PJ com cálculos automáticos de impostos.',
      },
      {
        id: 'rh-3',
        title: 'Benefícios',
        description: 'Controle benefícios como vale-transporte, vale-alimentação e plano de saúde vinculados a cada fornecedor.',
      },
      {
        id: 'rh-4',
        title: 'Fluxo de Aprovação',
        description: 'Solicitações de folha e benefícios passam por aprovação do RH e depois do financeiro antes de gerar contas a pagar.',
      },
    ],
  },
  {
    id: 'comercial',
    title: 'Área Comercial',
    description: 'Acompanhe vendedores, metas e comissões.',
    area: 'Comercial',
    icon: 'ShoppingCart',
    route: '/dashboard-comercial',
    steps: [
      {
        id: 'com-1',
        title: 'Dashboard Comercial',
        description: 'Visualize o desempenho de vendas com ranking de vendedores, metas atingidas e análises por período.',
      },
      {
        id: 'com-2',
        title: 'Vendedores',
        description: 'Cadastre vendedores com percentual de comissão e metas individuais. Vincule-os a centros de custo específicos.',
      },
      {
        id: 'com-3',
        title: 'Comissionamento',
        description: 'Calcule e solicite pagamento de comissões baseado nas vendas recebidas do período selecionado.',
      },
    ],
  },
];

export const checklistItems = [
  { id: 'dashboard', label: 'Conhecer o Dashboard', tutorialId: 'dashboard', route: '/' },
  { id: 'cliente', label: 'Cadastrar primeiro cliente', tutorialId: 'clientes', route: '/clientes' },
  { id: 'contrato', label: 'Criar um contrato', tutorialId: 'contratos', route: '/contratos' },
  { id: 'receber', label: 'Entender contas a receber', tutorialId: 'contas-receber', route: '/contas-receber' },
  { id: 'extrato', label: 'Navegar pelo extrato', tutorialId: 'extrato', route: '/extrato' },
];
