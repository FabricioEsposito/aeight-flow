import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { DREChatDialog } from "./DREChatDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompanyTagWithPercent } from "@/components/centro-custos/CompanyBadge";

interface RateioInfo {
  codigo: string;
  descricao: string;
  percentual: number;
  centro_custo_id: string;
}

interface DetalheItem {
  codigo: string;
  descricao: string;
  valor: number;
  items: Array<{ nome: string; valor: number; centroCusto?: string; rateio?: RateioInfo[] }>;
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
  dateRange: { from: string; to: string } | null;
  centroCusto?: string[];
}

export function DREAnalysis({ dateRange, centroCusto }: DREAnalysisProps) {
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpen] = useState(false);

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

  const [centrosCustoNomes, setCentrosCustoNomes] = useState<string[]>([]);

  const fetchDREData = async () => {
    try {
      setIsLoading(true);

      // Buscar nomes dos centros de custo selecionados
      if (centroCusto && centroCusto.length > 0) {
        const { data: ccs } = await supabase
          .from('centros_custo')
          .select('descricao')
          .in('id', centroCusto);
        setCentrosCustoNomes(ccs?.map(c => c.descricao) || []);
      } else {
        setCentrosCustoNomes([]);
      }

      // Buscar todos centros de custo para mapear IDs -> nomes/codigos
      const { data: allCentrosCusto } = await supabase
        .from('centros_custo')
        .select('id, codigo, descricao');
      const ccMap = new Map((allCentrosCusto || []).map(c => [c.id, c.descricao]));
      const ccFullMap = new Map((allCentrosCusto || []).map(c => [c.id, c]));

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

      // Buscar receitas (regime de competência) - SEM filtro de centro_custo
      let receitasQuery = supabase
        .from('contas_receber')
        .select('id, valor, plano_conta_id, descricao, centro_custo, parcela_id, plano_contas(codigo, descricao), clientes(razao_social)');

      if (dateRange) {
        const fromDate = `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, '0')}-${String(dateRange.from.getDate()).padStart(2, '0')}`;
        const toDate = `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, '0')}-${String(dateRange.to.getDate()).padStart(2, '0')}`;
        receitasQuery = receitasQuery
          .gte('data_competencia', fromDate)
          .lte('data_competencia', toDate);
      }

      // Não filtrar por centro_custo diretamente - será feito via rateio
      const { data: receitas } = await receitasQuery;

      // Buscar despesas (regime de competência) - SEM filtro de centro_custo
      let despesasQuery = supabase
        .from('contas_pagar')
        .select('id, valor, plano_conta_id, descricao, centro_custo, parcela_id, plano_contas(codigo, descricao), fornecedores(razao_social)');

      if (dateRange) {
        const fromDate = `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, '0')}-${String(dateRange.from.getDate()).padStart(2, '0')}`;
        const toDate = `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, '0')}-${String(dateRange.to.getDate()).padStart(2, '0')}`;
        despesasQuery = despesasQuery
          .gte('data_competencia', fromDate)
          .lte('data_competencia', toDate);
      }

      const { data: despesas } = await despesasQuery;

      // Build rateio map: parcela_id -> RateioInfo[]
      const allLancamentos = [...(receitas || []), ...(despesas || [])];
      const parcelaIds = [...new Set(allLancamentos.map(l => l.parcela_id).filter(Boolean))] as string[];
      
      let rateioMap = new Map<string, RateioInfo[]>();
      
      if (parcelaIds.length > 0) {
        // Get contrato_id for each parcela
        const { data: parcelas } = await supabase
          .from('parcelas_contrato')
          .select('id, contrato_id')
          .in('id', parcelaIds);

        if (parcelas && parcelas.length > 0) {
          const contratoIds = [...new Set(parcelas.map(p => p.contrato_id).filter(Boolean))] as string[];
          
          if (contratoIds.length > 0) {
            const { data: rateios } = await supabase
              .from('contratos_centros_custo')
              .select('contrato_id, centro_custo_id, percentual, centros_custo:centro_custo_id(id, codigo, descricao)')
              .in('contrato_id', contratoIds);

            if (rateios && rateios.length > 0) {
              const contratoRateioMap = new Map<string, RateioInfo[]>();
              for (const r of rateios) {
                const cc = r.centros_custo as any;
                if (!cc) continue;
                const item: RateioInfo = {
                  codigo: cc.codigo,
                  descricao: cc.descricao,
                  percentual: r.percentual,
                  centro_custo_id: r.centro_custo_id,
                };
                const existing = contratoRateioMap.get(r.contrato_id) || [];
                existing.push(item);
                contratoRateioMap.set(r.contrato_id, existing);
              }

              for (const parcela of parcelas) {
                if (parcela.contrato_id && contratoRateioMap.has(parcela.contrato_id)) {
                  rateioMap.set(parcela.id, contratoRateioMap.get(parcela.contrato_id)!);
                }
              }
            }
          }
        }
      }

      // Fetch lancamentos_centros_custo for individual entries (no parcela_id)
      const individualReceberIds = (receitas || []).filter((l: any) => !l.parcela_id).map((l: any) => l.id);
      const individualPagarIds = (despesas || []).filter((l: any) => !l.parcela_id).map((l: any) => l.id);
      const lancamentoRateioMap = new Map<string, RateioInfo[]>();

      if (individualReceberIds.length > 0) {
        const { data: lccReceber } = await supabase
          .from('lancamentos_centros_custo')
          .select('conta_receber_id, centro_custo_id, percentual, centros_custo:centro_custo_id(id, codigo, descricao)')
          .in('conta_receber_id', individualReceberIds);
        if (lccReceber) {
          for (const r of lccReceber) {
            const cc = r.centros_custo as any;
            if (!cc) continue;
            const item: RateioInfo = { codigo: cc.codigo, descricao: cc.descricao, percentual: r.percentual, centro_custo_id: r.centro_custo_id };
            const existing = lancamentoRateioMap.get(r.conta_receber_id!) || [];
            existing.push(item);
            lancamentoRateioMap.set(r.conta_receber_id!, existing);
          }
        }
      }

      if (individualPagarIds.length > 0) {
        const { data: lccPagar } = await supabase
          .from('lancamentos_centros_custo')
          .select('conta_pagar_id, centro_custo_id, percentual, centros_custo:centro_custo_id(id, codigo, descricao)')
          .in('conta_pagar_id', individualPagarIds);
        if (lccPagar) {
          for (const r of lccPagar) {
            const cc = r.centros_custo as any;
            if (!cc) continue;
            const item: RateioInfo = { codigo: cc.codigo, descricao: cc.descricao, percentual: r.percentual, centro_custo_id: r.centro_custo_id };
            const existing = lancamentoRateioMap.get(r.conta_pagar_id!) || [];
            existing.push(item);
            lancamentoRateioMap.set(r.conta_pagar_id!, existing);
          }
        }
      }

      // Helper: get the effective value for a lancamento considering rateio and cost center filter
      const getEffectiveValue = (l: any): { valor: number; rateio?: RateioInfo[] } | null => {
        // Contract-based rateio (via parcela_id) or individual entry rateio (via lancamento id)
        const rateio = l.parcela_id ? rateioMap.get(l.parcela_id) : lancamentoRateioMap.get(l.id) || null;
        
        if (centroCusto && centroCusto.length > 0) {
          if (rateio && rateio.length > 0) {
            // Has rateio - apply proportional value for matching cost centers
            const matchingRateios = rateio.filter(r => centroCusto.includes(r.centro_custo_id));
            if (matchingRateios.length === 0) return null; // Not in selected cost centers
            const totalPercent = matchingRateios.reduce((sum, r) => sum + r.percentual, 0);
            return { valor: Number(l.valor) * (totalPercent / 100), rateio };
          } else {
            // No rateio - use direct centro_custo field
            if (!l.centro_custo || !centroCusto.includes(l.centro_custo)) return null;
            return { valor: Number(l.valor) };
          }
        }
        
        // No filter - full value
        return { valor: Number(l.valor), rateio: rateio || undefined };
      };

      // Função auxiliar para agrupar detalhes com suporte a rateio
      const agruparDetalhes = (
        lancamentos: any[],
        accountIds: string[],
        planosContas: any[],
        tipo: 'receita' | 'despesa'
      ): { detalhes: DetalheItem[]; total: number } => {
        const grouped = new Map<string, { codigo: string; descricao: string; items: Map<string, { valor: number; centroCusto?: string; rateio?: RateioInfo[] }>; total: number }>();
        let total = 0;

        lancamentos?.forEach(l => {
          if (l.plano_conta_id && accountIds.includes(l.plano_conta_id)) {
            const effective = getEffectiveValue(l);
            if (!effective) return; // Filtered out
            
            total += effective.valor;
            const plano = planosContas.find(p => p.id === l.plano_conta_id);
            const codigo = plano?.codigo || '';
            const descricao = plano?.descricao || l.descricao;
            const nome = tipo === 'receita' 
              ? (l.clientes?.razao_social || 'Cliente não informado')
              : (l.fornecedores?.razao_social || 'Fornecedor não informado');
            const ccNome = l.centro_custo ? ccMap.get(l.centro_custo) : undefined;

            if (!grouped.has(l.plano_conta_id)) {
              grouped.set(l.plano_conta_id, {
                codigo,
                descricao,
                items: new Map(),
                total: 0
              });
            }

            const group = grouped.get(l.plano_conta_id)!;
            group.total += effective.valor;
            const itemKey = ccNome ? `${nome}|||${ccNome}` : nome;
            const current = group.items.get(itemKey) || { valor: 0, centroCusto: ccNome as string | undefined, rateio: effective.rateio };
            current.valor += effective.valor;
            group.items.set(itemKey, current);
          }
        });

        const detalhes: DetalheItem[] = Array.from(grouped.values()).map(g => ({
          codigo: g.codigo,
          descricao: g.descricao,
          valor: g.total,
          items: Array.from(g.items.entries())
            .map(([key, item]) => ({ 
              nome: key.includes('|||') ? key.split('|||')[0] : key, 
              valor: item.valor, 
              centroCusto: item.centroCusto,
              rateio: item.rateio,
            }))
            .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
        })).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));

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

  const calcAV = (value: number | string): string | null => {
    if (typeof value !== 'number' || !dreData || dreData.receita === 0) return null;
    return `${((value / dreData.receita) * 100).toFixed(1)}%`;
  };

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
    const av = showValue ? calcAV(value as number) : null;

    return (
      <div className={cn("border-b border-border", indent && "ml-8")}>
        <div className="flex items-center py-3 px-4 hover:bg-muted/50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
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
          <div className="flex items-center gap-2">
            {av && (
              <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                {av}
              </span>
            )}
            <div className="flex items-center gap-1 w-36 justify-end shrink-0">
              {showValue && isNegative && <span className="text-destructive">-</span>}
              <span className={cn(
                isTotal && "font-bold",
                isNegative ? "text-destructive" : value !== '-' && "text-foreground"
              )}>
                {displayValue}
              </span>
            </div>
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
              <div className="flex items-center py-2 px-4 ml-12 text-sm border-b border-border/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                    {calcAV(item.valor) || ''}
                  </span>
                  <span className="font-medium w-36 text-right shrink-0">{formatCurrency(item.valor)}</span>
                </div>
              </div>

              {/* Detalhes por fornecedor/cliente */}
              {isSubExpanded && item.items.length > 0 && (
                <div className="bg-muted/20">
                  {item.items.map((subItem, subIndex) => (
                    <div key={subIndex} className="flex items-center py-2 px-4 ml-24 text-sm gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-muted-foreground truncate">{subItem.nome}</span>
                        {subItem.rateio && subItem.rateio.length > 1 && (
                          <div className="flex flex-wrap gap-1 shrink-0">
                            {subItem.rateio.map((r, rIdx) => (
                              <CompanyTagWithPercent key={rIdx} codigo={r.codigo} percentual={r.percentual} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                          {calcAV(subItem.valor) || ''}
                        </span>
                        <span className="shrink-0 w-36 text-right">{formatCurrency(subItem.valor)}</span>
                      </div>
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

  const chatDreData = dreData ? {
    receita: dreData.receita,
    receitaDetalhes: dreData.receitaDetalhes,
    cmv: dreData.cmv,
    cmvDetalhes: dreData.cmvDetalhes,
    margemContribuicao: dreData.margemContribuicao,
    despAdm: dreData.despAdm,
    despAdmDetalhes: dreData.despAdmDetalhes,
    ebtida: dreData.ebtida,
    impostos: dreData.impostos,
    impostosDetalhes: dreData.impostosDetalhes,
    emprestimos: dreData.emprestimos,
    emprestimosDetalhes: dreData.emprestimosDetalhes,
    despFinanceiras: dreData.despFinanceiras,
    despFinanceirasDetalhes: dreData.despFinanceirasDetalhes,
    ebit: dreData.ebit,
    provisaoCsllIrrf: dreData.provisaoCsllIrrf,
    resultadoExercicio: dreData.resultadoExercicio,
    periodo: dateRange
      ? `${dateRange.from.toLocaleDateString('pt-BR')} a ${dateRange.to.toLocaleDateString('pt-BR')}`
      : 'Todo o período',
    centrosCusto: centrosCustoNomes.length > 0 ? centrosCustoNomes : null,
  } : null;

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>DRE Gerencial (Competência)</CardTitle>
          <p className="text-sm text-muted-foreground">
            {dateRange 
              ? `Período: ${dateRange.from.toLocaleDateString('pt-BR')} a ${dateRange.to.toLocaleDateString('pt-BR')}`
              : 'Todo o período'
            }
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setChatOpen(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Consultar IA
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground flex items-center py-3 px-4 font-bold">
            <span className="flex-1">DRE Gerencial (Competência)</span>
            <span className="text-xs w-16 text-right shrink-0 opacity-80">AV%</span>
            <span className="w-36 text-right shrink-0">{dateRange ? `${dateRange.from.toLocaleDateString('pt-BR', { month: 'short' })}/${dateRange.from.getFullYear()}` : 'Todo período'}</span>
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
    <DREChatDialog open={chatOpen} onOpenChange={setChatOpen} dreData={chatDreData} />
    </>
  );
}
