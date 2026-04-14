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
    id: 'fornecedores',
    title: 'Cadastrar Fornecedores',
    description: 'Aprenda a cadastrar e gerenciar seus fornecedores no sistema.',
    area: 'Cadastro',
    icon: 'Users',
    route: '/fornecedores',
    steps: [
      {
        id: 'fornecedores-1',
        title: 'Lista de Fornecedores',
        description: 'Nesta página você visualiza todos os fornecedores cadastrados. Use a barra de busca para encontrar fornecedores por razão social, nome fantasia ou CNPJ/CPF.',
      },
      {
        id: 'fornecedores-2',
        title: 'Novo Fornecedor',
        description: 'Clique no botão "Novo Fornecedor" para abrir o formulário. Preencha os dados como razão social, CNPJ/CPF, e-mail e telefone.',
      },
      {
        id: 'fornecedores-3',
        title: 'Consulta Automática de CNPJ',
        description: 'Assim como em clientes, ao digitar um CNPJ o sistema preenche automaticamente os dados da empresa.',
      },
      {
        id: 'fornecedores-4',
        title: 'Dados Bancários',
        description: 'Cadastre os dados bancários do fornecedor (banco, agência, conta, tipo de conta e tipo de transferência) para facilitar pagamentos e exportações financeiras.',
      },
      {
        id: 'fornecedores-5',
        title: 'Status do Fornecedor',
        description: 'Fornecedores podem estar ativos ou inativos. Inativos não aparecem nas seleções de contratos e lançamentos de contas a pagar.',
      },
    ],
  },
  {
    id: 'contratos-venda',
    title: 'Criar Contrato de Venda (Receita)',
    description: 'Passo a passo completo para criar um contrato de receita com cliente.',
    area: 'Contratos',
    icon: 'FileText',
    route: '/contratos',
    steps: [
      {
        id: 'cv-1',
        title: '📋 Início — Acessando a área de contratos',
        description: 'Você está na página de Contratos. Aqui ficam listados todos os seus contratos ativos, encerrados e suspensos. Para criar um novo, clique no botão "Novo Contrato" no canto superior direito.',
      },
      {
        id: 'cv-2',
        title: '🔀 Escolha o tipo de contrato',
        description: 'Na tela de novo contrato, o primeiro campo é o "Tipo de Contrato". Selecione "Receita (Venda)" para contratos onde você vai receber do cliente. Se fosse uma despesa (compra de serviço/produto), escolheria "Despesa (Compra)".',
      },
      {
        id: 'cv-3',
        title: '👤 Selecionar o Cliente',
        description: 'No campo "Cliente", selecione o cliente que estará vinculado a este contrato. Caso o cliente ainda não esteja cadastrado, vá primeiro à área de Clientes e faça o cadastro. Apenas clientes com status "Ativo" aparecem na lista.',
      },
      {
        id: 'cv-4',
        title: '🏷️ Número do Contrato',
        description: 'Informe o número identificador do contrato. Pode ser o número interno da sua empresa ou o número que consta no documento do contrato. Este campo é obrigatório e serve para localizar o contrato rapidamente.',
      },
      {
        id: 'cv-5',
        title: '📂 Plano de Contas e Serviço',
        description: 'Selecione o "Plano de Contas" que categoriza esta receita (ex: Receita de Serviços, Receita de Produtos). Também selecione o "Serviço" prestado. Estas informações são usadas nos relatórios de DRE e classificação financeira.',
      },
      {
        id: 'cv-6',
        title: '💰 Valores — Unitário, Quantidade e Total',
        description: 'Preencha o "Valor Unitário" do serviço/produto e a "Quantidade". O sistema calcula automaticamente o "Valor Total". Se houver desconto, selecione o tipo (percentual ou valor fixo) e informe o valor — o total será recalculado.',
      },
      {
        id: 'cv-7',
        title: '📅 Período do Contrato',
        description: 'Defina a "Data de Início" e a "Data de Fim" do contrato. Se for um contrato recorrente (mensal), marque a opção "Recorrente" e selecione o período (mensal, trimestral, etc.). O sistema gerará parcelas automaticamente com base nestas datas.',
      },
      {
        id: 'cv-8',
        title: '🔄 Opções de Recorrência e IPCA',
        description: 'Para contratos de venda, você tem opções especiais: "Renovação Automática" renova o contrato ao final do período. "Ajuste por IPCA" aplica reajuste automático pelo índice de inflação. "Aviso Prévio" define quantos dias antes do vencimento o sistema deve alertar (0 a 90 dias).',
      },
      {
        id: 'cv-9',
        title: '🏦 Conta Bancária e Centro de Custo',
        description: 'Selecione a "Conta Bancária" onde os recebimentos serão registrados. No "Centro de Custo", você pode associar um ou mais centros com rateio percentual (ex: 60% Operacional, 40% Comercial).',
      },
      {
        id: 'cv-10',
        title: '📊 Impostos Retidos',
        description: 'Se aplicável, informe os percentuais de retenção de impostos: IRRF, PIS, COFINS, CSLL e PIS/COFINS combinado. Estes valores serão considerados no cálculo do valor líquido das parcelas.',
      },
      {
        id: 'cv-11',
        title: '👨‍💼 Vendedor Responsável',
        description: 'Selecione o vendedor responsável por esta venda. Isso vincula o contrato ao vendedor para cálculo de comissão e acompanhamento de metas na área comercial.',
      },
      {
        id: 'cv-12',
        title: '📝 Observações e Link do Contrato',
        description: 'Use o campo "Observações de Faturamento" para informações relevantes na hora de faturar. No campo "Link do Contrato" você pode colar um link para o documento do contrato (Google Drive, etc.).',
      },
      {
        id: 'cv-13',
        title: '✅ Visualizar Parcelas e Salvar',
        description: 'Antes de salvar, confira a prévia das parcelas geradas com datas e valores. Você pode personalizar parcelas individuais se necessário. Quando tudo estiver correto, clique em "Salvar Contrato". As parcelas serão criadas automaticamente como Contas a Receber.',
      },
    ],
  },
  {
    id: 'contratos-compra',
    title: 'Criar Contrato de Compra (Despesa)',
    description: 'Passo a passo completo para criar um contrato de despesa com fornecedor.',
    area: 'Contratos',
    icon: 'FileText',
    route: '/contratos',
    steps: [
      {
        id: 'cc-1',
        title: '📋 Início — Acessando a área de contratos',
        description: 'Você está na página de Contratos. Para criar um contrato de compra/despesa, clique no botão "Novo Contrato" no canto superior direito.',
      },
      {
        id: 'cc-2',
        title: '🔀 Escolha o tipo: Despesa (Compra)',
        description: 'No campo "Tipo de Contrato", selecione "Despesa (Compra)". Este tipo é usado quando você contrata um serviço ou compra de um fornecedor e precisa pagar.',
      },
      {
        id: 'cc-3',
        title: '🏭 Selecionar o Fornecedor',
        description: 'Em contratos de compra, o campo muda de "Cliente" para "Fornecedor". Selecione o fornecedor que prestará o serviço ou fornecerá o produto. Apenas fornecedores ativos aparecem na lista.',
      },
      {
        id: 'cc-4',
        title: '🏷️ Número do Contrato e Serviço',
        description: 'Informe o número do contrato e selecione o Plano de Contas adequado (ex: Despesas com Serviços, Despesas Operacionais). Selecione também o serviço contratado.',
      },
      {
        id: 'cc-5',
        title: '💰 Valores e Descontos',
        description: 'Preencha o valor unitário e quantidade. Se houver desconto negociado com o fornecedor, informe-o. O valor total será calculado automaticamente.',
      },
      {
        id: 'cc-6',
        title: '📅 Período e Recorrência',
        description: 'Defina o período do contrato. Para contratos de compra recorrentes (ex: aluguel mensal, serviço mensal), marque "Recorrente" e defina o período. O sistema gera as parcelas de pagamento automaticamente.',
      },
      {
        id: 'cc-7',
        title: '🏦 Conta Bancária e Centro de Custo',
        description: 'Selecione a conta bancária de onde sairão os pagamentos. Associe centros de custo para classificar a despesa por área da empresa (ex: 100% Administrativo ou rateio entre áreas).',
      },
      {
        id: 'cc-8',
        title: '📊 Impostos e Retenções',
        description: 'Para contratos PJ, informe os percentuais de retenção na fonte (IRRF, PIS, COFINS, CSLL). O sistema deduz automaticamente os impostos do valor bruto para calcular o líquido.',
      },
      {
        id: 'cc-9',
        title: '✅ Conferir e Salvar',
        description: 'Revise todas as parcelas geradas na prévia. Verifique datas de vencimento e valores. Ao salvar, o sistema cria automaticamente as Contas a Pagar correspondentes para cada parcela.',
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
    title: 'Extrato e Conciliação',
    description: 'Aprenda a dar baixas, reabrir lançamentos, editar, clonar e excluir movimentações.',
    area: 'Financeiro',
    icon: 'BarChart3',
    route: '/extrato',
    steps: [
      {
        id: 'extrato-1',
        title: '📋 Visão Geral do Extrato',
        description: 'O extrato mostra todas as movimentações financeiras (entradas e saídas) organizadas por data. Cada linha exibe a descrição, o valor, a data de vencimento, o status (em aberto, pago/recebido) e a conta bancária associada.',
      },
      {
        id: 'extrato-2',
        title: '🔍 Filtros e Busca',
        description: 'Use os filtros no topo da página para refinar a visualização: filtre por conta bancária, período, tipo (entrada/saída) e status (em aberto ou pago). A barra de busca permite localizar lançamentos pela descrição.',
      },
      {
        id: 'extrato-3',
        title: '✅ Dar Baixa — Marcar como Pago/Recebido',
        description: 'Para dar baixa em um lançamento, clique no ícone de três pontos (⋮) na linha do lançamento e selecione "Marcar como pago" (para saídas) ou "Marcar como recebido" (para entradas). Isso registra que o pagamento/recebimento foi efetivado e atualiza o saldo da conta bancária.',
      },
      {
        id: 'extrato-4',
        title: '🔄 Voltar para Em Aberto',
        description: 'Cometeu um erro ao dar baixa? Clique no ícone de três pontos (⋮) do lançamento já pago/recebido e selecione "Voltar para em aberto". O lançamento retorna ao status anterior e o saldo da conta é revertido. Use com cuidado!',
      },
      {
        id: 'extrato-5',
        title: '✏️ Editar Lançamento',
        description: 'Para alterar dados de um lançamento, clique no ícone de três pontos (⋮) e selecione "Editar lançamento". Você pode alterar a descrição, valor, data de vencimento, conta bancária, plano de contas e centro de custo. Lançamentos vinculados a contratos mantêm o vínculo.',
      },
      {
        id: 'extrato-6',
        title: '📋 Clonar Lançamento',
        description: 'Precisa criar um lançamento parecido? Use a opção "Clonar lançamento" no menu de três pontos (⋮). O sistema cria uma cópia com os mesmos dados, permitindo que você ajuste apenas o que for diferente (data, valor, etc.). Ideal para lançamentos recorrentes avulsos.',
      },
      {
        id: 'extrato-7',
        title: '👁️ Ver Detalhes',
        description: 'Clique em "Ver detalhes do lançamento" para visualizar todas as informações completas: dados do cliente/fornecedor, histórico de alterações, centro de custo, boleto anexado, nota fiscal e observações.',
      },
      {
        id: 'extrato-8',
        title: '🗑️ Excluir Lançamento',
        description: 'A opção "Excluir lançamento" só aparece para lançamentos avulsos (criados manualmente, não vinculados a contratos). Lançamentos de parcelas de contratos não podem ser excluídos diretamente — para isso, é necessário editar ou encerrar o contrato.',
      },
      {
        id: 'extrato-9',
        title: '📤 Exportar Pagamento em Lote',
        description: 'Use o botão "Exportar Pagamento em Lote" para gerar uma planilha com os dados bancários dos fornecedores para processar pagamentos em massa no seu banco. Filtre primeiro os lançamentos desejados antes de exportar.',
      },
      {
        id: 'extrato-10',
        title: '💡 Dica: Baixa Parcial',
        description: 'Se um cliente pagou apenas parte do valor, use a opção de "Baixa Parcial" (quando disponível). O sistema registra o valor recebido e cria um novo lançamento com o valor restante automaticamente.',
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
  { id: 'contrato-venda', label: 'Criar um contrato de venda', tutorialId: 'contratos-venda', route: '/contratos' },
  { id: 'contrato-compra', label: 'Criar um contrato de compra', tutorialId: 'contratos-compra', route: '/contratos' },
  { id: 'extrato', label: 'Aprender a usar o extrato', tutorialId: 'extrato', route: '/extrato' },
  { id: 'receber', label: 'Entender contas a receber', tutorialId: 'contas-receber', route: '/contas-receber' },
];
