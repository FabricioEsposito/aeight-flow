import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DetalheItem {
  codigo: string;
  descricao: string;
  valor: number;
  items: Array<{ nome: string; valor: number }>;
}

interface DREData {
  receita: number;
  receitaDetalhes: DetalheItem[];
  cmv: number;
  cmvDetalhes: DetalheItem[];
  margemContribuicao: number;
  despAdm: number;
  despAdmDetalhes: DetalheItem[];
  ebtida: number;
  impostos: number;
  impostosDetalhes: DetalheItem[];
  emprestimos: number;
  emprestimosDetalhes: DetalheItem[];
  despFinanceiras: number;
  despFinanceirasDetalhes: DetalheItem[];
  transacoesInternas: number;
  transacoesInternasDetalhes: DetalheItem[];
  pesquisaDesenvolvimento: number;
  pesquisaDesenvolvimentoDetalhes: DetalheItem[];
  ebit: number;
  provisaoCsllIrrf: number;
  resultadoExercicio: number;
}

interface DREAnalysisProps {
  dateRange: { from: Date; to: Date } | null;
  centroCusto?: string;
}

export function DREAnalysis({ dateRange, centroCusto }: DREAnalysisProps) {
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDREData();
  }, [dateRange, centroCusto]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const fetchDREData = async () => {
    try {
      setIsLoading(true);

      // Buscar planos de contas para mapear IDs
      const { data: planosContas } = await supabase
        .from('plano_contas')
        .select('id, codigo, descricao')
        .eq('status', 'ativo');

      if (!planosContas) return;

      // Criar mapa de códigos para IDs
      const planosMap = new Map(planosContas.map(p => [p.codigo, p]));

      // Função para obter IDs de contas que começam com um código específico
      const getAccountIds = (codigoPrefix: string) => {
        return planosContas
          .filter(p => p.codigo.startsWith(codigoPrefix))
          .map(p => p.id);
      };

      // Buscar receitas (regime de competência)
      let receitasQuery = supabase
        .from('contas_receber')
        .select('valor, plano_conta_id, descricao, plano_contas(codigo, descricao), clientes(razao_social)');

      if (dateRange) {
        // Usar formato de data local para evitar problemas de timezone
        const fromDate = `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, '0')}-${String(dateRange.from.getDate()).padStart(2, '0')}`;
        const toDate = `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, '0')}-${String(dateRange.to.getDate()).padStart(2, '0')}`;
        receitasQuery = receitasQuery
          .gte('data_competencia', fromDate)
          .lte('data_competencia', toDate);
      }

      if (centroCusto && centroCusto !== 'todos') {
        receitasQuery = receitasQuery.eq('centro_custo', centroCusto);
      }

      const { data: receitas } = await receitasQuery;

      // Buscar despesas (regime de competência)
      let despesasQuery = supabase
        .from('contas_pagar')
        .select('valor, plano_conta_id, descricao, plano_contas(codigo, descricao), fornecedores(razao_social)');

      if (dateRange) {
        // Usar formato de data local para evitar problemas de timezone
        const fromDate = `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, '0')}-${String(dateRange.from.getDate()).padStart(2, '0')}`;
        const toDate = `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, '0')}-${String(dateRange.to.getDate()).padStart(2, '0')}`;
        despesasQuery = despesasQuery
          .gte('data_competencia', fromDate)
          .lte('data_competencia', toDate);
      }

      if (centroCusto && centroCusto !== 'todos') {
        despesasQuery = despesasQuery.eq('centro_custo', centroCusto);
      }

      const { data: despesas } = await despesasQuery;

      // Função auxiliar para agrupar detalhes
      const agruparDetalhes = (
        lancamentos: any[],
        accountIds: string[],
        planosContas: any[],
        tipo: 'receita' | 'despesa'
      ): { detalhes: DetalheItem[]; total: number } => {
        const grouped = new Map<string, { codigo: string; descricao: string; items: Map<string, number>; total: number }>();
        let total = 0;

        lancamentos?.forEach(l => {
          if (l.plano_conta_id && accountIds.includes(l.plano_conta_id)) {
            total += Number(l.valor);
            const plano = planosContas.find(p => p.id === l.plano_conta_id);
            const codigo = plano?.codigo || '';
            const descricao = plano?.descricao || l.descricao;
            const nome = tipo === 'receita' 
              ? (l.clientes?.razao_social || 'Cliente não informado')
              : (l.fornecedores?.razao_social || 'Fornecedor não informado');

            if (!grouped.has(l.plano_conta_id)) {
              grouped.set(l.plano_conta_id, {
                codigo,
                descricao,
                items: new Map(),
                total: 0
              });
            }

            const group = grouped.get(l.plano_conta_id)!;
            group.total += Number(l.valor);
            const currentValue = group.items.get(nome) || 0;
            group.items.set(nome, currentValue + Number(l.valor));
          }
        });

        const detalhes: DetalheItem[] = Array.from(grouped.values()).map(g => ({
          codigo: g.codigo,
          descricao: g.descricao,
          valor: g.total,
          items: Array.from(g.items.entries()).map(([nome, valor]) => ({ nome, valor }))
        }));

        return { detalhes, total };
      };

      // Processar receitas (1.1)
      const receitaIds = getAccountIds('1.1');
      const { detalhes: receitaDetalhes, total: receitaTotal } = agruparDetalhes(
        receitas,
        receitaIds,
        planosContas,
        'receita'
      );

      // Processar CMV - Custos Variáveis (2.1)
      const cmvIds = getAccountIds('2.1');
      const { detalhes: cmvDetalhes, total: cmvTotal } = agruparDetalhes(
        despesas,
        cmvIds,
        planosContas,
        'despesa'
      );

      // Processar Desp. ADM - Custos Fixos (3.1)
      const despAdmIds = getAccountIds('3.1');
      const { detalhes: despAdmDetalhes, total: despAdmTotal } = agruparDetalhes(
        despesas,
        despAdmIds,
        planosContas,
        'despesa'
      );

      // Processar Impostos (4.1)
      const impostosIds = getAccountIds('4.1');
      const { detalhes: impostosDetalhes, total: impostosTotal } = agruparDetalhes(
        despesas,
        impostosIds,
        planosContas,
        'despesa'
      );

      // Processar Desp. Financeiras (5.1)
      const despFinIds = getAccountIds('5.1');
      const { detalhes: despFinDetalhes, total: despFinTotal } = agruparDetalhes(
        despesas,
        despFinIds,
        planosContas,
        'despesa'
      );

      // Processar Empréstimos (6.1)
      const emprestimosIds = getAccountIds('6.1');
      const { detalhes: emprestimosDetalhes, total: emprestimosTotal } = agruparDetalhes(
        despesas,
        emprestimosIds,
        planosContas,
        'despesa'
      );

      // Calcular indicadores
      const margemContribuicao = receitaTotal > 0 ? ((receitaTotal - cmvTotal) / receitaTotal) * 100 : 0;
      const ebtida = receitaTotal - cmvTotal - despAdmTotal;
      const ebit = ebtida - impostosTotal - emprestimosTotal - despFinTotal;
      const provisaoCsllIrrf = ebit > 0 ? ebit * 0.34 : 0;
      const resultadoExercicio = ebit - provisaoCsllIrrf;

      setDreData({
        receita: receitaTotal,
        receitaDetalhes,
        cmv: cmvTotal,
        cmvDetalhes,
        margemContribuicao,
        despAdm: despAdmTotal,
        despAdmDetalhes,
        ebtida,
        impostos: impostosTotal,
        impostosDetalhes,
        emprestimos: emprestimosTotal,
        emprestimosDetalhes,
        despFinanceiras: despFinTotal,
        despFinanceirasDetalhes: despFinDetalhes,
        transacoesInternas: 0,
        transacoesInternasDetalhes: [],
        pesquisaDesenvolvimento: 0,
        pesquisaDesenvolvimentoDetalhes: [],
        ebit,
        provisaoCsllIrrf,
        resultadoExercicio,
      });
    } catch (error) {
      console.error('Erro ao buscar dados do DRE:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!dreData) return null;

  const renderLine = (
    label: string,
    value: number | string,
    isTotal?: boolean,
    isNegative?: boolean,
    hasDetails?: boolean,
    detailsKey?: string,
    indent?: boolean
  ) => {
    const isExpanded = detailsKey ? expandedSections.has(detailsKey) : false;
    const showValue = typeof value === 'number';
    const displayValue = showValue ? formatCurrency(Math.abs(value)) : value;

    return (
      <div className={cn("border-b border-border", indent && "ml-8")}>
        <div className="flex justify-between items-center py-3 px-4 hover:bg-muted/50">
          <div className="flex items-center gap-2">
            {hasDetails && detailsKey && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleSection(detailsKey)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            <span className={cn(
              isTotal && "font-bold",
              !hasDetails && "ml-8"
            )}>
              {label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {showValue && isNegative && <span className="text-destructive">-</span>}
            <span className={cn(
              isTotal && "font-bold",
              isNegative ? "text-destructive" : value !== '-' && "text-foreground"
            )}>
              {displayValue}
            </span>
            {showValue && isNegative && <span className="text-destructive">-</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderDetails = (detailsKey: string, details: DetalheItem[]) => {
    if (!expandedSections.has(detailsKey) || details.length === 0) return null;

    return (
      <div className="bg-muted/30">
        {details.map((item, index) => {
          const subKey = `${detailsKey}_${index}`;
          const isSubExpanded = expandedSections.has(subKey);

          return (
            <div key={index}>
              {/* Linha da subcategoria */}
              <div className="flex justify-between items-center py-2 px-4 ml-12 text-sm border-b border-border/50">
                <div className="flex items-center gap-2">
                  {item.items.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleSection(subKey)}
                    >
                      {isSubExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  )}
                  <span className="text-muted-foreground font-medium">
                    {item.codigo} {item.descricao}
                  </span>
                </div>
                <span className="font-medium">{formatCurrency(item.valor)}</span>
              </div>

              {/* Detalhes por fornecedor/cliente */}
              {isSubExpanded && item.items.length > 0 && (
                <div className="bg-muted/20">
                  {item.items.map((subItem, subIndex) => (
                    <div key={subIndex} className="flex justify-between items-center py-2 px-4 ml-24 text-sm">
                      <span className="text-muted-foreground">{subItem.nome}</span>
                      <span>{formatCurrency(subItem.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>DRE Gerencial (Competência)</CardTitle>
        <p className="text-sm text-muted-foreground">
          {dateRange 
            ? `Período: ${dateRange.from.toLocaleDateString('pt-BR')} a ${dateRange.to.toLocaleDateString('pt-BR')}`
            : 'Todo o período'
          }
        </p>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground flex justify-between items-center py-3 px-4 font-bold">
            <span>DRE Gerencial (Competência)</span>
            <span>{dateRange ? `${dateRange.from.toLocaleDateString('pt-BR', { month: 'short' })}/${dateRange.from.getFullYear()}` : 'Todo período'}</span>
          </div>

          {/* Receita */}
          {renderLine('Receita', dreData.receita, false, false, true, 'receita')}
          {renderDetails('receita', dreData.receitaDetalhes)}

          {/* CMV */}
          {renderLine('CMV (Custo Variável)', dreData.cmv, false, true, true, 'cmv')}
          {renderDetails('cmv', dreData.cmvDetalhes)}

          {/* Margem de Contribuição */}
          {renderLine('Margem de Contribuição', formatPercentage(dreData.margemContribuicao), true)}

          {/* Desp. ADM */}
          {renderLine('Desp. ADM (Custo Fixo)', dreData.despAdm, false, true, true, 'despAdm')}
          {renderDetails('despAdm', dreData.despAdmDetalhes)}

          {/* EBTIDA */}
          {renderLine('EBTIDA', dreData.ebtida, true, dreData.ebtida < 0)}

          {/* Impostos */}
          {renderLine('Impostos', dreData.impostos, false, true, true, 'impostos')}
          {renderDetails('impostos', dreData.impostosDetalhes)}

          {/* Empréstimos */}
          {renderLine('Empréstimo', dreData.emprestimos, false, true, true, 'emprestimos')}
          {renderDetails('emprestimos', dreData.emprestimosDetalhes)}

          {/* Desp. Financeiras */}
          {renderLine('Desp. Financeiras', dreData.despFinanceiras, false, true, true, 'despFinanceiras')}
          {renderDetails('despFinanceiras', dreData.despFinanceirasDetalhes)}

          {/* EBIT */}
          {renderLine('Lucro Antes do Imposto de Renda (EBIT)', dreData.ebit, true, dreData.ebit < 0)}

          {/* Provisão CSLL e IRRF */}
          {renderLine('Provisão CSLL e IRRF (34%)', dreData.provisaoCsllIrrf === 0 ? '-' : dreData.provisaoCsllIrrf, false, dreData.provisaoCsllIrrf > 0)}

          {/* Resultado do Exercício */}
          {renderLine('Resultado do Exercício', dreData.resultadoExercicio, true, dreData.resultadoExercicio < 0)}
        </div>
      </CardContent>
    </Card>
  );
}
