import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DREData {
  receita: number;
  receitaDetalhes: Array<{ descricao: string; valor: number }>;
  cmv: number;
  cmvDetalhes: Array<{ descricao: string; valor: number }>;
  margemContribuicao: number;
  despAdm: number;
  despAdmDetalhes: Array<{ descricao: string; valor: number }>;
  ebtida: number;
  impostos: number;
  impostosDetalhes: Array<{ descricao: string; valor: number }>;
  emprestimos: number;
  emprestimosDetalhes: Array<{ descricao: string; valor: number }>;
  despFinanceiras: number;
  despFinanceirasDetalhes: Array<{ descricao: string; valor: number }>;
  transacoesInternas: number;
  transacoesInternasDetalhes: Array<{ descricao: string; valor: number }>;
  pesquisaDesenvolvimento: number;
  pesquisaDesenvolvimentoDetalhes: Array<{ descricao: string; valor: number }>;
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
        .select('valor, plano_conta_id, descricao, plano_contas(codigo, descricao)')
        .eq('status', 'recebido');

      if (dateRange) {
        receitasQuery = receitasQuery
          .gte('data_competencia', dateRange.from.toISOString().split('T')[0])
          .lte('data_competencia', dateRange.to.toISOString().split('T')[0]);
      }

      if (centroCusto && centroCusto !== 'todos') {
        receitasQuery = receitasQuery.eq('centro_custo', centroCusto);
      }

      const { data: receitas } = await receitasQuery;

      // Buscar despesas (regime de caixa - apenas pagas)
      let despesasQuery = supabase
        .from('contas_pagar')
        .select('valor, plano_conta_id, descricao, plano_contas(codigo, descricao)')
        .eq('status', 'pago')
        .not('data_pagamento', 'is', null);

      if (dateRange) {
        despesasQuery = despesasQuery
          .gte('data_pagamento', dateRange.from.toISOString().split('T')[0])
          .lte('data_pagamento', dateRange.to.toISOString().split('T')[0]);
      }

      if (centroCusto && centroCusto !== 'todos') {
        despesasQuery = despesasQuery.eq('centro_custo', centroCusto);
      }

      const { data: despesas } = await despesasQuery;

      // Processar receitas (1.1)
      const receitaIds = getAccountIds('1.1');
      const receitaDetalhes: Array<{ descricao: string; valor: number }> = [];
      let receitaTotal = 0;

      receitas?.forEach(r => {
        if (r.plano_conta_id && receitaIds.includes(r.plano_conta_id)) {
          receitaTotal += Number(r.valor);
          const plano = planosContas.find(p => p.id === r.plano_conta_id);
          receitaDetalhes.push({
            descricao: plano?.descricao || r.descricao,
            valor: Number(r.valor)
          });
        }
      });

      // Processar CMV - Custos Variáveis (2.1)
      const cmvIds = getAccountIds('2.1');
      const cmvDetalhes: Array<{ descricao: string; valor: number }> = [];
      let cmvTotal = 0;

      despesas?.forEach(d => {
        if (d.plano_conta_id && cmvIds.includes(d.plano_conta_id)) {
          cmvTotal += Number(d.valor);
          const plano = planosContas.find(p => p.id === d.plano_conta_id);
          cmvDetalhes.push({
            descricao: plano?.descricao || d.descricao,
            valor: Number(d.valor)
          });
        }
      });

      // Processar Desp. ADM - Custos Fixos (3.1)
      const despAdmIds = getAccountIds('3.1');
      const despAdmDetalhes: Array<{ descricao: string; valor: number }> = [];
      let despAdmTotal = 0;

      despesas?.forEach(d => {
        if (d.plano_conta_id && despAdmIds.includes(d.plano_conta_id)) {
          despAdmTotal += Number(d.valor);
          const plano = planosContas.find(p => p.id === d.plano_conta_id);
          despAdmDetalhes.push({
            descricao: plano?.descricao || d.descricao,
            valor: Number(d.valor)
          });
        }
      });

      // Processar Impostos (4.1)
      const impostosIds = getAccountIds('4.1');
      const impostosDetalhes: Array<{ descricao: string; valor: number }> = [];
      let impostosTotal = 0;

      despesas?.forEach(d => {
        if (d.plano_conta_id && impostosIds.includes(d.plano_conta_id)) {
          impostosTotal += Number(d.valor);
          const plano = planosContas.find(p => p.id === d.plano_conta_id);
          impostosDetalhes.push({
            descricao: plano?.descricao || d.descricao,
            valor: Number(d.valor)
          });
        }
      });

      // Processar Desp. Financeiras (5.1)
      const despFinIds = getAccountIds('5.1');
      const despFinDetalhes: Array<{ descricao: string; valor: number }> = [];
      let despFinTotal = 0;

      despesas?.forEach(d => {
        if (d.plano_conta_id && despFinIds.includes(d.plano_conta_id)) {
          despFinTotal += Number(d.valor);
          const plano = planosContas.find(p => p.id === d.plano_conta_id);
          despFinDetalhes.push({
            descricao: plano?.descricao || d.descricao,
            valor: Number(d.valor)
          });
        }
      });

      // Processar Empréstimos (6.1)
      const emprestimosIds = getAccountIds('6.1');
      const emprestimosDetalhes: Array<{ descricao: string; valor: number }> = [];
      let emprestimosTotal = 0;

      despesas?.forEach(d => {
        if (d.plano_conta_id && emprestimosIds.includes(d.plano_conta_id)) {
          emprestimosTotal += Number(d.valor);
          const plano = planosContas.find(p => p.id === d.plano_conta_id);
          emprestimosDetalhes.push({
            descricao: plano?.descricao || d.descricao,
            valor: Number(d.valor)
          });
        }
      });

      // Processar Transações Internas (7.1)
      const transInternasIds = getAccountIds('7.1');
      const transInternasDetalhes: Array<{ descricao: string; valor: number }> = [];
      let transInternasTotal = 0;

      despesas?.forEach(d => {
        if (d.plano_conta_id && transInternasIds.includes(d.plano_conta_id)) {
          transInternasTotal += Number(d.valor);
          const plano = planosContas.find(p => p.id === d.plano_conta_id);
          transInternasDetalhes.push({
            descricao: plano?.descricao || d.descricao,
            valor: Number(d.valor)
          });
        }
      });

      // Processar Pesquisa e Desenvolvimento (8.1)
      const pesquisaIds = getAccountIds('8.1');
      const pesquisaDetalhes: Array<{ descricao: string; valor: number }> = [];
      let pesquisaTotal = 0;

      despesas?.forEach(d => {
        if (d.plano_conta_id && pesquisaIds.includes(d.plano_conta_id)) {
          pesquisaTotal += Number(d.valor);
          const plano = planosContas.find(p => p.id === d.plano_conta_id);
          pesquisaDetalhes.push({
            descricao: plano?.descricao || d.descricao,
            valor: Number(d.valor)
          });
        }
      });

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
        transacoesInternas: transInternasTotal,
        transacoesInternasDetalhes: transInternasDetalhes,
        pesquisaDesenvolvimento: pesquisaTotal,
        pesquisaDesenvolvimentoDetalhes: pesquisaDetalhes,
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

  const renderDetails = (detailsKey: string, details: Array<{ descricao: string; valor: number }>) => {
    if (!expandedSections.has(detailsKey) || details.length === 0) return null;

    return (
      <div className="bg-muted/30">
        {details.map((item, index) => (
          <div key={index} className="flex justify-between items-center py-2 px-4 ml-16 text-sm">
            <span className="text-muted-foreground">{item.descricao}</span>
            <span>{formatCurrency(item.valor)}</span>
          </div>
        ))}
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

          {/* Transações Internas */}
          {renderLine('Transações Internas', dreData.transacoesInternas, false, false, true, 'transacoesInternas')}
          {renderDetails('transacoesInternas', dreData.transacoesInternasDetalhes)}

          {/* Pesquisa e Desenvolvimento */}
          {renderLine('Pesquisa e Desenvolvimento (P&D)', dreData.pesquisaDesenvolvimento, false, dreData.pesquisaDesenvolvimento === 0 ? false : true, true, 'pesquisa')}
          {renderDetails('pesquisa', dreData.pesquisaDesenvolvimentoDetalhes)}

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
