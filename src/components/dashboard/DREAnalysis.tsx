import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Sparkles, Eye, EyeOff } from "lucide-react";
import { DREChatDialog } from "./DREChatDialog";
import { DRETrendChart } from "./DRETrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

interface SubGrupoItem {
  nome: string;
  valor: number;
  items: Array<{ nome: string; valor: number; centroCusto?: string; rateio?: RateioInfo[] }>;
}

interface DetalheItem {
  codigo: string;
  descricao: string;
  valor: number;
  items: Array<{ nome: string; valor: number; centroCusto?: string; rateio?: RateioInfo[] }>;
  subGrupos?: SubGrupoItem[];
}

interface DREData {
  receita: number;
  receitaBruta: number;
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
  despExtraordinaria: number;
  despExtraordinariaDetalhes: DetalheItem[];
  splitAfiliado: number;
  splitAfiliadoMes: number[];
}

const SPLIT_HIDDEN_COST_CODES = ['2.1.11', '2.1.12', '2.1.13'];

interface DREAnalysisProps {
  dateRange: { from: string; to: string } | null;
  centroCusto?: string[];
}

interface MensalDetalhe {
  label: string;
  valores: number[];
  total: number;
  children?: MensalDetalhe[];
}

interface DREMensal {
  meses: string[]; // ex: ['2025-01', '2025-02']
  linhas: Array<{
    label: string;
    isTotal?: boolean;
    isNegative?: boolean;
    isPercent?: boolean;
    valores: number[]; // por mês
    detalhes?: MensalDetalhe[];
  }>;
}

export function DREAnalysis({ dateRange, centroCusto }: DREAnalysisProps) {
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [dreMensal, setDreMensal] = useState<DREMensal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showDespExtraordinaria, setShowDespExtraordinaria] = useState(false);
  const [showSplitAfiliado, setShowSplitAfiliado] = useState(false);
  const [isLomadeeFiltered, setIsLomadeeFiltered] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Helper to format "YYYY-MM-DD" string to display format
  const formatDateStr = (dateStr: string, shortMonth = false): string => {
    const [year, month, day] = dateStr.split('-');
    if (shortMonth) {
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return `${months[parseInt(month) - 1]}/${year}`;
    }
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    fetchDREData();
  }, [dateRange, centroCusto, showSplitAfiliado]);

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

  // Helper to fetch all rows from a query bypassing the 1000-row limit
  const fetchAllRows = async <T = any>(
    table: 'contas_receber' | 'contas_pagar',
    selectStr: string,
    dateRange: { from: string; to: string } | null,
    dateField: string = 'data_competencia'
  ): Promise<T[]> => {
    const PAGE_SIZE = 1000;
    let allData: T[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from(table)
        .select(selectStr)
        .neq('status', 'cancelado')
        .range(from, from + PAGE_SIZE - 1);

      if (dateRange) {
        query = query
          .gte(dateField, dateRange.from)
          .lte(dateField, dateRange.to);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...(data as T[])];
        hasMore = data.length === PAGE_SIZE;
        from += PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    return allData;
  };

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

      // Split Afiliado só faz sentido quando o filtro inclui exclusivamente o CC 002 - Lomadee
      const lomadeeId = (allCentrosCusto || []).find(c => c.codigo === '002')?.id;
      const isLomadee = !!(lomadeeId && centroCusto && centroCusto.length > 0 && centroCusto.every(id => id === lomadeeId));
      setIsLomadeeFiltered(isLomadee);
      if (!isLomadee && showSplitAfiliado) {
        setShowSplitAfiliado(false);
      }

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

      // Buscar receitas (regime de competência) - com paginação
      const receitasRaw = await fetchAllRows(
        'contas_receber',
        'id, valor, plano_conta_id, descricao, centro_custo, parcela_id, data_competencia, servico_id, observacoes, split_afiliado, plano_contas(codigo, descricao), clientes(razao_social), servicos(nome)',
        dateRange
      );

      // Buscar despesas (regime de competência) - com paginação
      const despesasRaw = await fetchAllRows(
        'contas_pagar',
        'id, valor, plano_conta_id, descricao, centro_custo, parcela_id, data_competencia, plano_contas(codigo, descricao), fornecedores(razao_social)',
        dateRange
      );

      // Excluir categoria 5.1.4 (Aplicações) do DRE
      const isExcludedFromDRE = (planoCodigo?: string | null) => {
        if (!planoCodigo) return false;
        return planoCodigo === '5.1.4' || planoCodigo.startsWith('5.1.4.');
      };
      const receitas = (receitasRaw || []).filter((r: any) => !isExcludedFromDRE(r?.plano_contas?.codigo));
      const despesas = (despesasRaw || []).filter((r: any) => !isExcludedFromDRE(r?.plano_contas?.codigo));

      // Build rateio map: parcela_id -> RateioInfo[]
      const allLancamentos = [...receitas, ...despesas];
      const parcelaIds = [...new Set(allLancamentos.map(l => l.parcela_id).filter(Boolean))] as string[];
      
      let rateioMap = new Map<string, RateioInfo[]>();
      // Map: parcela_id -> nome(s) de serviço(s) do contrato
      const parcelaServicoMap = new Map<string, string>();

      // Map para normalizar nomes de serviço vindos de `observacoes` (ex: "ASSM005 - Assinatura Monitfy")
      // ao nome canônico do serviço, evitando duplicação no agrupamento do DRE.
      const servicoCanonicoMap = new Map<string, string>(); // chave normalizada -> nome canônico
      {
        const { data: todosServicos } = await supabase
          .from('servicos')
          .select('codigo, nome');
        (todosServicos || []).forEach((s: any) => {
          if (!s?.nome) return;
          const nome = String(s.nome).trim();
          servicoCanonicoMap.set(nome.toLowerCase(), nome);
          if (s.codigo) {
            const cod = String(s.codigo).trim();
            servicoCanonicoMap.set(cod.toLowerCase(), nome);
            servicoCanonicoMap.set(`${cod} - ${nome}`.toLowerCase(), nome);
          }
        });
      }

      const resolveServicoFromObservacoes = (obs: unknown): string | undefined => {
        if (typeof obs !== 'string' || !obs.startsWith('Serviço: ')) return undefined;
        const raw = obs.replace('Serviço: ', '').trim();
        if (!raw) return undefined;
        const lower = raw.toLowerCase();
        if (servicoCanonicoMap.has(lower)) return servicoCanonicoMap.get(lower);
        // tenta tirar prefixo "CODIGO - "
        const semCodigo = raw.replace(/^[^\s-]+\s*-\s*/, '').trim();
        if (semCodigo && servicoCanonicoMap.has(semCodigo.toLowerCase())) {
          return servicoCanonicoMap.get(semCodigo.toLowerCase());
        }
        return semCodigo || raw;
      };

      
      if (parcelaIds.length > 0) {
        // Get contrato_id for each parcela
        const { data: parcelas } = await supabase
          .from('parcelas_contrato')
          .select('id, contrato_id')
          .in('id', parcelaIds);

        if (parcelas && parcelas.length > 0) {
          const contratoIds = [...new Set(parcelas.map(p => p.contrato_id).filter(Boolean))] as string[];
          
          if (contratoIds.length > 0) {
            const [{ data: rateios }, { data: contratosData }] = await Promise.all([
              supabase
                .from('contratos_centros_custo')
                .select('contrato_id, centro_custo_id, percentual, centros_custo:centro_custo_id(id, codigo, descricao)')
                .in('contrato_id', contratoIds),
              supabase
                .from('contratos')
                .select('id, servicos')
                .in('id', contratoIds),
            ]);

            // Resolver nomes de serviços
            const allServicoIds = new Set<string>();
            (contratosData || []).forEach((c: any) => {
              if (Array.isArray(c.servicos)) c.servicos.forEach((sid: string) => sid && allServicoIds.add(sid));
            });
            const servicoNomeMap = new Map<string, string>();
            if (allServicoIds.size > 0) {
              const { data: servicosData } = await supabase
                .from('servicos')
                .select('id, nome')
                .in('id', Array.from(allServicoIds));
              (servicosData || []).forEach((s: any) => servicoNomeMap.set(s.id, s.nome));
            }
            const contratoServicoMap = new Map<string, string>();
            (contratosData || []).forEach((c: any) => {
              if (Array.isArray(c.servicos) && c.servicos.length > 0) {
                const nomes = c.servicos.map((sid: string) => servicoNomeMap.get(sid)).filter(Boolean);
                if (nomes.length > 0) contratoServicoMap.set(c.id, nomes.join(' + '));
              }
            });

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

            for (const parcela of parcelas) {
              if (parcela.contrato_id && contratoServicoMap.has(parcela.contrato_id)) {
                parcelaServicoMap.set(parcela.id, contratoServicoMap.get(parcela.contrato_id)!);
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
        const grouped = new Map<string, {
          codigo: string;
          descricao: string;
          items: Map<string, { valor: number; centroCusto?: string; rateio?: RateioInfo[] }>;
          // Para receitas: serviço -> cliente -> valor
          servicos: Map<string, { total: number; clientes: Map<string, { valor: number; centroCusto?: string; rateio?: RateioInfo[] }> }>;
          total: number;
        }>();
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
                servicos: new Map(),
                total: 0
              });
            }

            const group = grouped.get(l.plano_conta_id)!;
            group.total += effective.valor;
            const itemKey = ccNome ? `${nome}|||${ccNome}` : nome;
            const current = group.items.get(itemKey) || { valor: 0, centroCusto: ccNome as string | undefined, rateio: effective.rateio };
            current.valor += effective.valor;
            group.items.set(itemKey, current);

            // Para receitas: agrupar também por serviço
            if (tipo === 'receita') {
              const servicoNome =
                l.servicos?.nome
                || (l.parcela_id ? parcelaServicoMap.get(l.parcela_id) : undefined)
                || resolveServicoFromObservacoes(l.observacoes)
                || 'Sem serviço informado';
              if (!group.servicos.has(servicoNome)) {
                group.servicos.set(servicoNome, { total: 0, clientes: new Map() });
              }
              const sg = group.servicos.get(servicoNome)!;
              sg.total += effective.valor;
              const cliCur = sg.clientes.get(itemKey) || { valor: 0, centroCusto: ccNome as string | undefined, rateio: effective.rateio };
              cliCur.valor += effective.valor;
              sg.clientes.set(itemKey, cliCur);
            }
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
            .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)),
          subGrupos: tipo === 'receita' && g.servicos.size > 0
            ? Array.from(g.servicos.entries())
                .map(([servNome, sg]) => ({
                  nome: servNome,
                  valor: sg.total,
                  items: Array.from(sg.clientes.entries())
                    .map(([key, item]) => ({
                      nome: key.includes('|||') ? key.split('|||')[0] : key,
                      valor: item.valor,
                      centroCusto: item.centroCusto,
                      rateio: item.rateio,
                    }))
                    .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)),
                }))
                .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
            : undefined,
        })).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));

        return { detalhes, total };
      };

      // Processar receitas (1.1)
      const receitaIds = getAccountIds('1.1');
      const { detalhes: receitaDetalhesRaw, total: receitaTotalRaw } = agruparDetalhes(
        receitas,
        receitaIds,
        planosContas,
        'receita'
      );

      // Calcular Split Afiliado (consolidado)
      const splitTotal = (receitas || []).reduce((s, l: any) => s + (Number(l.split_afiliado) || 0), 0);
      const receitaTotal = showSplitAfiliado ? receitaTotalRaw - splitTotal : receitaTotalRaw;
      const receitaDetalhes = receitaDetalhesRaw;

      // Processar CMV - Custos Variáveis (2.1) — quando "com Split" oculta 2.1.11/2.1.12/2.1.13
      const cmvIdsAll = getAccountIds('2.1');
      const cmvIds = showSplitAfiliado
        ? cmvIdsAll.filter(id => {
            const p = planosContas.find(pc => pc.id === id);
            return p && !SPLIT_HIDDEN_COST_CODES.some(c => p.codigo === c || p.codigo.startsWith(c + '.'));
          })
        : cmvIdsAll;
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

      // Processar Despesa Extraordinária (8.1)
      const despExtraIds = getAccountIds('8.1');
      const { detalhes: despExtraDetalhes, total: despExtraTotal } = agruparDetalhes(
        despesas,
        despExtraIds,
        planosContas,
        'despesa'
      );

      // Calcular indicadores
      const margemContribuicao = receitaTotal > 0 ? ((receitaTotal - cmvTotal) / receitaTotal) * 100 : 0;
      const ebtida = receitaTotal - cmvTotal - despAdmTotal;
      const ebit = ebtida - impostosTotal - emprestimosTotal - despFinTotal;
      const provisaoCsllIrrf = ebit > 0 ? ebit * 0.34 : 0;
      const resultadoExercicio = ebit - provisaoCsllIrrf;

      // ============= Cálculo mensal comparativo =============
      const buildMesesList = (): string[] => {
        if (!dateRange) {
          const set = new Set<string>();
          [...receitas, ...despesas].forEach((l: any) => {
            if (l.data_competencia) set.add(l.data_competencia.slice(0, 7));
          });
          return Array.from(set).sort();
        }
        const result: string[] = [];
        const [fy, fm] = dateRange.from.split('-').map(Number);
        const [ty, tm] = dateRange.to.split('-').map(Number);
        let y = fy, m = fm;
        while (y < ty || (y === ty && m <= tm)) {
          result.push(`${y}-${String(m).padStart(2, '0')}`);
          m++;
          if (m > 12) { m = 1; y++; }
        }
        return result;
      };

      const mesesList = buildMesesList();

      const somarPorMes = (lancamentos: any[], accountIds: string[]): number[] => {
        const totais = new Array(mesesList.length).fill(0);
        lancamentos?.forEach((l: any) => {
          if (!l.plano_conta_id || !accountIds.includes(l.plano_conta_id)) return;
          if (!l.data_competencia) return;
          const mes = l.data_competencia.slice(0, 7);
          const idx = mesesList.indexOf(mes);
          if (idx === -1) return;
          const effective = getEffectiveValue(l);
          if (!effective) return;
          totais[idx] += effective.valor;
        });
        return totais;
      };

      const receitaMesRaw = somarPorMes(receitas, receitaIds);
      // Split por mês (somar split_afiliado por data_competencia)
      const splitAfiliadoMes = new Array(mesesList.length).fill(0);
      (receitas || []).forEach((l: any) => {
        const v = Number(l.split_afiliado) || 0;
        if (!v || !l.data_competencia) return;
        const idx = mesesList.indexOf(l.data_competencia.slice(0, 7));
        if (idx !== -1) splitAfiliadoMes[idx] += v;
      });
      const receitaMes = showSplitAfiliado
        ? receitaMesRaw.map((r, i) => r - splitAfiliadoMes[i])
        : receitaMesRaw;
      const cmvMes = somarPorMes(despesas, cmvIds);
      
      const despAdmMes = somarPorMes(despesas, despAdmIds);
      const impostosMes = somarPorMes(despesas, impostosIds);
      const despFinMes = somarPorMes(despesas, despFinIds);
      const emprestimosMes = somarPorMes(despesas, emprestimosIds);
      const despExtraMes = somarPorMes(despesas, despExtraIds);

      // Construir detalhamento mensal hierárquico (plano de contas -> serviço/fornecedor -> cliente)
      const buildMensalDetalhe = (
        lancamentos: any[],
        accountIds: string[],
        tipo: 'receita' | 'despesa'
      ): MensalDetalhe[] => {
        const planos = new Map<string, {
          codigo: string; descricao: string; valores: number[]; total: number;
          grupos: Map<string, { label: string; valores: number[]; total: number; items: Map<string, { label: string; valores: number[]; total: number }> }>;
        }>();

        lancamentos?.forEach((l: any) => {
          if (!l.plano_conta_id || !accountIds.includes(l.plano_conta_id)) return;
          if (!l.data_competencia) return;
          const mes = l.data_competencia.slice(0, 7);
          const idx = mesesList.indexOf(mes);
          if (idx === -1) return;
          const effective = getEffectiveValue(l);
          if (!effective) return;

          const plano = planosContas.find(p => p.id === l.plano_conta_id);
          const codigo = plano?.codigo || '';
          const descricao = plano?.descricao || '';

          if (!planos.has(l.plano_conta_id)) {
            planos.set(l.plano_conta_id, {
              codigo, descricao,
              valores: new Array(mesesList.length).fill(0),
              total: 0,
              grupos: new Map(),
            });
          }
          const p = planos.get(l.plano_conta_id)!;
          p.valores[idx] += effective.valor;
          p.total += effective.valor;

          const grupoKey = tipo === 'receita'
            ? (l.servicos?.nome
                || (l.parcela_id ? parcelaServicoMap.get(l.parcela_id) : undefined)
                || resolveServicoFromObservacoes(l.observacoes)
                || 'Sem serviço informado')
            : (l.fornecedores?.razao_social || 'Fornecedor não informado');

          if (!p.grupos.has(grupoKey)) {
            p.grupos.set(grupoKey, { label: grupoKey, valores: new Array(mesesList.length).fill(0), total: 0, items: new Map() });
          }
          const g = p.grupos.get(grupoKey)!;
          g.valores[idx] += effective.valor;
          g.total += effective.valor;

          if (tipo === 'receita') {
            const cliente = l.clientes?.razao_social || 'Cliente não informado';
            if (!g.items.has(cliente)) {
              g.items.set(cliente, { label: cliente, valores: new Array(mesesList.length).fill(0), total: 0 });
            }
            const c = g.items.get(cliente)!;
            c.valores[idx] += effective.valor;
            c.total += effective.valor;
          }
        });

        return Array.from(planos.values())
          .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
          .map(p => ({
            label: `${p.codigo} ${p.descricao}`.trim(),
            valores: p.valores,
            total: p.total,
            children: Array.from(p.grupos.values())
              .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
              .map(g => ({
                label: g.label,
                valores: g.valores,
                total: g.total,
                children: tipo === 'receita'
                  ? Array.from(g.items.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
                  : undefined,
              })),
          }));
      };

      const receitaDetalheMes = buildMensalDetalhe(receitas, receitaIds, 'receita');
      const cmvDetalheMes = buildMensalDetalhe(despesas, cmvIds, 'despesa');
      const despAdmDetalheMes = buildMensalDetalhe(despesas, despAdmIds, 'despesa');
      const impostosDetalheMes = buildMensalDetalhe(despesas, impostosIds, 'despesa');
      const despFinDetalheMes = buildMensalDetalhe(despesas, despFinIds, 'despesa');
      const emprestimosDetalheMes = buildMensalDetalhe(despesas, emprestimosIds, 'despesa');
      const despExtraDetalheMes = buildMensalDetalhe(despesas, despExtraIds, 'despesa');
      

      const margemMes = receitaMes.map((r, i) => r > 0 ? ((r - cmvMes[i]) / r) * 100 : 0);
      const ebtidaMes = receitaMes.map((r, i) => r - cmvMes[i] - despAdmMes[i]);
      const ebitMes = ebtidaMes.map((e, i) => e - impostosMes[i] - emprestimosMes[i] - despFinMes[i]);
      const provisaoMes = ebitMes.map(e => e > 0 ? e * 0.34 : 0);
      const resultadoMes = ebitMes.map((e, i) => e - provisaoMes[i]);

      const linhasMensal: DREMensal['linhas'] = [
        { label: 'Receita', valores: showSplitAfiliado ? receitaMesRaw : receitaMes, detalhes: receitaDetalheMes },
      ];
      if (showSplitAfiliado) {
        linhasMensal.push({ label: '(-) Split Afiliado', valores: splitAfiliadoMes, isNegative: true });
        linhasMensal.push({ label: 'Receita Líquida', valores: receitaMes, isTotal: true });
      }
      linhasMensal.push(
        { label: 'CMV (Custo Variável)', valores: cmvMes, isNegative: true, detalhes: cmvDetalheMes },
        { label: 'Margem de Contribuição', valores: margemMes, isTotal: true, isPercent: true },
        { label: 'Desp. ADM (Custo Fixo)', valores: despAdmMes, isNegative: true, detalhes: despAdmDetalheMes },
        { label: 'EBTIDA', valores: ebtidaMes, isTotal: true },
        { label: 'Impostos', valores: impostosMes, isNegative: true, detalhes: impostosDetalheMes },
        { label: 'Empréstimo', valores: emprestimosMes, isNegative: true, detalhes: emprestimosDetalheMes },
        { label: 'Desp. Financeiras', valores: despFinMes, isNegative: true, detalhes: despFinDetalheMes },
        { label: 'EBIT', valores: ebitMes, isTotal: true },
        { label: 'Provisão CSLL e IRRF (34%)', valores: provisaoMes, isNegative: true },
        { label: 'Resultado do Exercício', valores: resultadoMes, isTotal: true },
        { label: 'Despesa Extraordinária', valores: despExtraMes, isNegative: true, detalhes: despExtraDetalheMes },
        { label: 'Resultado Após Desp. Extraord.', valores: resultadoMes.map((r, i) => r - despExtraMes[i]), isTotal: true },
      );
      setDreMensal({ meses: mesesList, linhas: linhasMensal });


      setDreData({
        receita: receitaTotal,
        receitaBruta: receitaTotalRaw,
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
        despExtraordinaria: despExtraTotal,
        despExtraordinariaDetalhes: despExtraDetalhes,
        splitAfiliado: splitTotal,
        splitAfiliadoMes,
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

  // AH no gerencial: variação entre o primeiro e o último mês do período
  const calcAH = (label: string): { text: string; positive: boolean | null } | null => {
    if (!dreMensal || dreMensal.meses.length < 2) return null;
    const linha = dreMensal.linhas.find(l => l.label === label);
    if (!linha) return null;
    const first = linha.valores[0];
    const last = linha.valores[linha.valores.length - 1];
    if (!first || first === 0) return { text: '—', positive: null };
    const variacao = ((last - first) / Math.abs(first)) * 100;
    if (!isFinite(variacao)) return { text: '—', positive: null };
    const sign = variacao > 0 ? '+' : '';
    return { text: `${sign}${variacao.toFixed(1)}%`, positive: variacao >= 0 };
  };

  // Tooltip da AH: detalha quais categorias mais subiram/caíram entre o 1º e o último mês
  const getAHBreakdown = (label: string): { ganhos: Array<{ label: string; variacao: number }>; perdas: Array<{ label: string; variacao: number }> } | null => {
    if (!dreMensal || dreMensal.meses.length < 2) return null;
    const linha = dreMensal.linhas.find(l => l.label === label);
    if (!linha?.detalhes?.length) return null;
    const lastIdx = dreMensal.meses.length - 1;
    const items = linha.detalhes
      .map(d => {
        const first = d.valores[0] || 0;
        const last = d.valores[lastIdx] || 0;
        return { label: d.label, variacao: last - first };
      })
      .filter(d => Math.abs(d.variacao) > 0.005);
    const ganhos = items.filter(i => i.variacao > 0).sort((a, b) => b.variacao - a.variacao).slice(0, 5);
    const perdas = items.filter(i => i.variacao < 0).sort((a, b) => a.variacao - b.variacao).slice(0, 5);
    if (ganhos.length === 0 && perdas.length === 0) return null;
    return { ganhos, perdas };
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
    const ah = showValue ? calcAH(label) : null;

    return (
      <div className={cn("border-b border-border", indent && "ml-8", isTotal && "bg-muted/40")}>
        <div className={cn("flex items-center py-3 px-4 hover:bg-muted/50", isTotal && "hover:bg-muted/60")}>
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
            {(() => {
              const ahSpan = (
                <span
                  className={cn(
                    "text-xs w-20 text-right shrink-0 cursor-help",
                    !ah && "text-muted-foreground",
                    ah?.positive === null && "text-muted-foreground",
                    ah?.positive === true && (isNegative ? "text-destructive" : "text-emerald-600"),
                    ah?.positive === false && (isNegative ? "text-emerald-600" : "text-destructive"),
                  )}
                >
                  {ah ? ah.text : ''}
                </span>
              );
              const breakdown = isTotal && hasDetails && ah ? getAHBreakdown(label) : null;
              if (!breakdown) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>{ahSpan}</TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Análise Horizontal: variação % entre o 1º e o último mês do período</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{ahSpan}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold">Variação por categoria (1º x último mês)</p>
                      {breakdown.ganhos.length > 0 && (
                        <div>
                          <p className={cn("font-medium mb-1", isNegative ? "text-destructive" : "text-emerald-600")}>
                            {isNegative ? 'Aumentos (impacto negativo)' : 'Ganhos (impacto positivo)'}
                          </p>
                          <ul className="space-y-0.5">
                            {breakdown.ganhos.map((g, i) => (
                              <li key={i} className="flex justify-between gap-3">
                                <span className="truncate">{g.label}</span>
                                <span className="shrink-0">+{formatCurrency(g.variacao)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {breakdown.perdas.length > 0 && (
                        <div>
                          <p className={cn("font-medium mb-1", isNegative ? "text-emerald-600" : "text-destructive")}>
                            {isNegative ? 'Reduções (impacto positivo)' : 'Perdas (impacto negativo)'}
                          </p>
                          <ul className="space-y-0.5">
                            {breakdown.perdas.map((p, i) => (
                              <li key={i} className="flex justify-between gap-3">
                                <span className="truncate">{p.label}</span>
                                <span className="shrink-0">-{formatCurrency(Math.abs(p.variacao))}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })()}
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

              {/* Detalhes: se houver subGrupos (ex: serviços nas receitas), agrupa por serviço -> clientes; senão lista direto */}
              {isSubExpanded && item.subGrupos && item.subGrupos.length > 0 && (
                <div className="bg-muted/20">
                  {item.subGrupos.map((sg, sgIdx) => {
                    const sgKey = `${subKey}_sg_${sgIdx}`;
                    const isSgExpanded = expandedSections.has(sgKey);
                    return (
                      <div key={sgIdx}>
                        <div className="flex items-center py-2 px-4 ml-20 text-sm border-b border-border/50">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {sg.items.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleSection(sgKey)}
                              >
                                {isSgExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </Button>
                            )}
                            <span className="text-muted-foreground font-medium truncate">{sg.nome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                              {calcAV(sg.valor) || ''}
                            </span>
                            <span className="font-medium w-36 text-right shrink-0">{formatCurrency(sg.valor)}</span>
                          </div>
                        </div>
                        {isSgExpanded && sg.items.length > 0 && (
                          <div className="bg-muted/10">
                            {sg.items.map((subItem, subIndex) => (
                              <div key={subIndex} className="flex items-center py-2 px-4 ml-32 text-sm gap-2">
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
              )}

              {/* Detalhes por fornecedor/cliente (sem subGrupos) */}
              {isSubExpanded && !item.subGrupos && item.items.length > 0 && (
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
      ? `${formatDateStr(dateRange.from)} a ${formatDateStr(dateRange.to)}`
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
              ? `Período: ${formatDateStr(dateRange.from)} a ${formatDateStr(dateRange.to)}`
              : 'Todo o período'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLomadeeFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSplitAfiliado(!showSplitAfiliado)}
              className="gap-2 text-muted-foreground"
              title="Visualiza o DRE deduzindo o Split Afiliado da Receita e ocultando custos 2.1.11/2.1.12/2.1.13"
            >
              {showSplitAfiliado ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="text-xs">Split Afiliado</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDespExtraordinaria(!showDespExtraordinaria)}
            className="gap-2 text-muted-foreground"
            title={showDespExtraordinaria ? 'Ocultar Despesa Extraordinária' : 'Exibir Despesa Extraordinária'}
          >
            {showDespExtraordinaria ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="text-xs">Extraordinária</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setChatOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Consultar IA
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground flex items-center py-3 px-4 font-bold">
            <span className="flex-1">DRE Gerencial (Competência)</span>
            <span className="text-xs w-16 text-right shrink-0 opacity-80" title="Análise Vertical (% sobre receita)">AV%</span>
            <span className="text-xs w-20 text-right shrink-0 opacity-80" title="Análise Horizontal (1º mês x último mês do período)">AH%</span>
            <span className="w-36 text-right shrink-0">{dateRange ? formatDateStr(dateRange.from, true) : 'Todo período'}</span>
          </div>

          {/* Receita */}
          {renderLine('Receita', showSplitAfiliado && dreData.splitAfiliado > 0 ? dreData.receitaBruta : dreData.receita, false, false, true, 'receita')}
          {renderDetails('receita', dreData.receitaDetalhes)}

          {/* Split Afiliado (apenas quando o toggle está ativo) */}
          {showSplitAfiliado && dreData.splitAfiliado > 0 && (
            <>
              {renderLine('(-) Split Afiliado', dreData.splitAfiliado, false, true)}
              {renderLine('Receita Líquida', dreData.receita, true, dreData.receita < 0)}
            </>
          )}

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

          {/* Despesa Extraordinária */}
          {showDespExtraordinaria && (
            <>
              {renderLine('Despesa Extraordinária', dreData.despExtraordinaria, false, true, true, 'despExtraordinaria')}
              {renderDetails('despExtraordinaria', dreData.despExtraordinariaDetalhes)}
              {renderLine('Resultado Após Desp. Extraordinárias', dreData.resultadoExercicio - dreData.despExtraordinaria, true, (dreData.resultadoExercicio - dreData.despExtraordinaria) < 0)}
            </>
          )}
        </div>
      </CardContent>
    </Card>

    {dreMensal && dreMensal.meses.length > 0 && (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>DRE Mensal Comparativo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparativo mês a mês dentro do período filtrado ({dreMensal.meses.length} mês{dreMensal.meses.length > 1 ? 'es' : ''})
          </p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th rowSpan={2} className="text-left py-3 px-4 font-bold sticky left-0 bg-primary z-10 min-w-[240px] align-middle">Linha</th>
                  {dreMensal.meses.map((mes, mi) => {
                    const [y, m] = mes.split('-');
                    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
                    return (
                      <th key={mes} colSpan={3} className="text-center py-2 px-4 font-bold min-w-[260px] whitespace-nowrap border-l border-primary-foreground/20">
                        {months[parseInt(m) - 1]}/{y}
                      </th>
                    );
                  })}
                  <th colSpan={2} className="text-center py-2 px-4 font-bold min-w-[220px] whitespace-nowrap bg-primary/80 border-l border-primary-foreground/20">Total</th>
                </tr>
                <tr className="bg-primary text-primary-foreground text-xs">
                  {dreMensal.meses.map(mes => (
                    <Fragment key={mes}>
                      <th className="text-right py-2 px-4 font-medium whitespace-nowrap border-l border-primary-foreground/20">Valor</th>
                      <th className="text-right py-2 px-2 font-medium whitespace-nowrap opacity-80" title="Análise Vertical (% sobre receita)">AV%</th>
                      <th className="text-right py-2 px-2 font-medium whitespace-nowrap opacity-80" title="Análise Horizontal (variação vs mês anterior)">AH%</th>
                    </Fragment>
                  ))}
                  <th className="text-right py-2 px-4 font-medium whitespace-nowrap bg-primary/80 border-l border-primary-foreground/20">Valor</th>
                  <th className="text-right py-2 px-2 font-medium whitespace-nowrap bg-primary/80 opacity-80">AV%</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const receitaLinha = dreMensal.linhas.find(l => l.label === 'Receita');
                  const receitasMensais = receitaLinha?.valores || [];
                  const receitaTotalConsolidada = dreData.receita;
                  const formatAV = (valor: number, receitaBase: number): string => {
                    if (!receitaBase || receitaBase === 0) return '-';
                    return `${((Math.abs(valor) / Math.abs(receitaBase)) * 100).toFixed(1)}%`;
                  };
                  // AH = variação % vs mês anterior
                  const formatAH = (valores: number[], i: number): { text: string; positive: boolean | null } => {
                    if (i === 0) return { text: '—', positive: null };
                    const prev = valores[i - 1];
                    const curr = valores[i];
                    if (!prev || prev === 0) {
                      if (!curr || curr === 0) return { text: '—', positive: null };
                      return { text: '—', positive: null };
                    }
                    const variacao = ((curr - prev) / Math.abs(prev)) * 100;
                    if (!isFinite(variacao)) return { text: '—', positive: null };
                    const sign = variacao > 0 ? '+' : '';
                    return { text: `${sign}${variacao.toFixed(1)}%`, positive: variacao >= 0 };
                  };

                  // Breakdown da AH mensal: contribuição de cada categoria filha na variação vs mês anterior
                  const getMonthlyBreakdown = (
                    detalhes: MensalDetalhe[] | undefined,
                    i: number
                  ): { ganhos: Array<{ label: string; variacao: number }>; perdas: Array<{ label: string; variacao: number }> } | null => {
                    if (!detalhes?.length || i === 0) return null;
                    const items = detalhes
                      .map(d => ({ label: d.label, variacao: (d.valores[i] || 0) - (d.valores[i - 1] || 0) }))
                      .filter(d => Math.abs(d.variacao) > 0.005);
                    const ganhos = items.filter(x => x.variacao > 0).sort((a, b) => b.variacao - a.variacao).slice(0, 5);
                    const perdas = items.filter(x => x.variacao < 0).sort((a, b) => a.variacao - b.variacao).slice(0, 5);
                    if (ganhos.length === 0 && perdas.length === 0) return null;
                    return { ganhos, perdas };
                  };

                  const renderAHTooltip = (
                    children: JSX.Element,
                    isNegative: boolean | undefined,
                    detalhes: MensalDetalhe[] | undefined,
                    i: number
                  ) => {
                    const breakdown = getMonthlyBreakdown(detalhes, i);
                    if (!breakdown) return children;
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>{children}</TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm">
                          <div className="space-y-2 text-xs">
                            <p className="font-semibold">Variação por categoria (vs mês anterior)</p>
                            {breakdown.ganhos.length > 0 && (
                              <div>
                                <p className={cn("font-medium mb-1", isNegative ? "text-destructive" : "text-emerald-600")}>
                                  {isNegative ? 'Aumentos (impacto negativo)' : 'Ganhos (impacto positivo)'}
                                </p>
                                <ul className="space-y-0.5">
                                  {breakdown.ganhos.map((g, k) => (
                                    <li key={k} className="flex justify-between gap-3">
                                      <span className="truncate">{g.label}</span>
                                      <span className="shrink-0">+{formatCurrency(g.variacao)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {breakdown.perdas.length > 0 && (
                              <div>
                                <p className={cn("font-medium mb-1", isNegative ? "text-emerald-600" : "text-destructive")}>
                                  {isNegative ? 'Reduções (impacto positivo)' : 'Perdas (impacto negativo)'}
                                </p>
                                <ul className="space-y-0.5">
                                  {breakdown.perdas.map((p, k) => (
                                    <li key={k} className="flex justify-between gap-3">
                                      <span className="truncate">{p.label}</span>
                                      <span className="shrink-0">-{formatCurrency(Math.abs(p.variacao))}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  };

                  const renderDetalheRow = (
                    d: MensalDetalhe,
                    parentKey: string,
                    depth: number,
                    isNegative: boolean | undefined
                  ): JSX.Element[] => {
                    const key = `${parentKey}__${d.label}`;
                    const isExp = expandedSections.has(key);
                    const hasChildren = !!(d.children && d.children.length > 0);
                    const rows: JSX.Element[] = [];
                    rows.push(
                      <tr key={key} className="border-b border-border/40 hover:bg-muted/30 bg-muted/10">
                        <td
                          className="py-1.5 px-4 sticky left-0 z-10 bg-background"
                          style={{ paddingLeft: `${16 + depth * 20}px` }}
                        >
                          <div className="flex items-center gap-1">
                            {hasChildren ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => toggleSection(key)}
                              >
                                {isExp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </Button>
                            ) : (
                              <span className="inline-block w-5" />
                            )}
                            <span className="text-xs text-muted-foreground truncate" title={d.label}>{d.label}</span>
                          </div>
                        </td>
                        {d.valores.map((v, i) => {
                          const ah = formatAH(d.valores, i);
                          return (
                            <Fragment key={i}>
                              <td className={cn(
                                "text-right py-1.5 px-4 text-xs tabular-nums whitespace-nowrap border-l border-border/40",
                                isNegative && v !== 0 && "text-destructive"
                              )}>
                                {(isNegative && v > 0 ? '-' : '') + formatCurrency(Math.abs(v))}
                              </td>
                              <td className="text-right py-1.5 px-2 text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                                {formatAV(v, receitasMensais[i] ?? 0)}
                              </td>
                              <td className={cn(
                                "text-right py-1.5 px-2 text-[10px] tabular-nums whitespace-nowrap",
                                ah.positive === null && "text-muted-foreground",
                                ah.positive === true && (isNegative ? "text-destructive" : "text-emerald-600"),
                                ah.positive === false && (isNegative ? "text-emerald-600" : "text-destructive"),
                              )}>
                                {ah.text}
                              </td>
                            </Fragment>
                          );
                        })}
                        <td className={cn(
                          "text-right py-1.5 px-4 text-xs tabular-nums whitespace-nowrap bg-muted/20 border-l border-border/40 font-medium",
                          isNegative && d.total !== 0 && "text-destructive"
                        )}>
                          {(isNegative && d.total > 0 ? '-' : '') + formatCurrency(Math.abs(d.total))}
                        </td>
                        <td className="text-right py-1.5 px-2 text-[10px] text-muted-foreground tabular-nums whitespace-nowrap bg-muted/20">
                          {formatAV(d.total, receitaTotalConsolidada)}
                        </td>
                      </tr>
                    );
                    if (isExp && hasChildren) {
                      d.children!.forEach(c => {
                        rows.push(...renderDetalheRow(c, key, depth + 1, isNegative));
                      });
                    }
                    return rows;
                  };

                  return dreMensal.linhas
                  .filter(linha => showDespExtraordinaria || !linha.label.includes('Extraord'))
                  .flatMap((linha, idx) => {
                    let total: number | null;
                    if (linha.isPercent) {
                      total = dreData.margemContribuicao;
                    } else {
                      switch (linha.label) {
                        case 'Receita': total = dreData.receita; break;
                        case 'CMV (Custo Variável)': total = dreData.cmv; break;
                        case 'Desp. ADM (Custo Fixo)': total = dreData.despAdm; break;
                        case 'EBTIDA': total = dreData.ebtida; break;
                        case 'Impostos': total = dreData.impostos; break;
                        case 'Empréstimo': total = dreData.emprestimos; break;
                        case 'Desp. Financeiras': total = dreData.despFinanceiras; break;
                        case 'EBIT': total = dreData.ebit; break;
                        case 'Provisão CSLL e IRRF (34%)': total = dreData.provisaoCsllIrrf; break;
                        case 'Resultado do Exercício': total = dreData.resultadoExercicio; break;
                        case 'Despesa Extraordinária': total = dreData.despExtraordinaria; break;
                        case 'Resultado Após Desp. Extraord.': total = dreData.resultadoExercicio - dreData.despExtraordinaria; break;
                        default: total = linha.valores.reduce((s, v) => s + v, 0);
                      }
                    }
                    const linhaKey = `mensal_${linha.label}`;
                    const isLinhaExp = expandedSections.has(linhaKey);
                    const hasDetalhes = !!(linha.detalhes && linha.detalhes.length > 0);
                    const rows: JSX.Element[] = [];
                    rows.push(
                      <tr key={idx} className={cn("border-b border-border hover:bg-muted/50", linha.isTotal && "bg-muted/40 hover:bg-muted/60")}>
                        <td className={cn("py-2 px-4 sticky left-0 z-10", linha.isTotal ? "font-bold bg-muted/40" : "bg-background")}>
                          <div className="flex items-center gap-1">
                            {hasDetalhes ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => toggleSection(linhaKey)}
                              >
                                {isLinhaExp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </Button>
                            ) : (
                              <span className="inline-block w-5" />
                            )}
                            <span>{linha.label}</span>
                          </div>
                        </td>
                        {linha.valores.map((v, i) => {
                          const ah = formatAH(linha.valores, i);
                          return (
                            <Fragment key={i}>
                              <td className={cn(
                                "text-right py-2 px-4 tabular-nums whitespace-nowrap border-l border-border/40",
                                linha.isTotal && "font-bold",
                                linha.isNegative && v !== 0 && "text-destructive",
                                !linha.isNegative && linha.isTotal && v < 0 && "text-destructive"
                              )}>
                                {linha.isPercent
                                  ? `${v.toFixed(2)}%`
                                  : (linha.isNegative && v > 0 ? '-' : '') + formatCurrency(Math.abs(v))}
                              </td>
                              <td className={cn(
                                "text-right py-2 px-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap",
                                linha.isTotal && "font-semibold"
                              )}>
                                {linha.isPercent ? '-' : formatAV(v, receitasMensais[i] ?? 0)}
                              </td>
                              <td className={cn(
                                "text-right py-2 px-2 text-xs tabular-nums whitespace-nowrap",
                                linha.isTotal && "font-semibold",
                                ah.positive === null && "text-muted-foreground",
                                ah.positive === true && (linha.isNegative ? "text-destructive" : "text-emerald-600"),
                                ah.positive === false && (linha.isNegative ? "text-emerald-600" : "text-destructive"),
                                linha.detalhes && linha.detalhes.length > 0 && i > 0 && "cursor-help underline decoration-dotted underline-offset-2",
                              )}>
                                {renderAHTooltip(<span>{ah.text}</span>, linha.isNegative, linha.detalhes, i)}
                              </td>
                            </Fragment>
                          );
                        })}
                        <td className={cn(
                          "text-right py-2 px-4 tabular-nums whitespace-nowrap font-bold bg-muted/20 border-l border-border/40",
                          linha.isNegative && total !== null && total !== 0 && "text-destructive",
                          !linha.isNegative && linha.isTotal && total !== null && total < 0 && "text-destructive"
                        )}>
                          {linha.isPercent
                            ? `${(total ?? 0).toFixed(2)}%`
                            : (linha.isNegative && (total ?? 0) > 0 ? '-' : '') + formatCurrency(Math.abs(total ?? 0))}
                        </td>
                        <td className={cn(
                          "text-right py-2 px-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap font-semibold bg-muted/20"
                        )}>
                          {linha.isPercent ? '-' : formatAV(total ?? 0, receitaTotalConsolidada)}
                        </td>
                      </tr>
                    );
                    if (isLinhaExp && hasDetalhes) {
                      linha.detalhes!.forEach(d => {
                        rows.push(...renderDetalheRow(d, linhaKey, 1, linha.isNegative));
                      });
                    }
                    return rows;
                  });
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )}

    {dreMensal && dreMensal.meses.length > 0 && (() => {
      const receitaLinha = dreMensal.linhas.find(l => l.label === 'Receita');
      const margemLinha = dreMensal.linhas.find(l => l.label === 'Margem de Contribuição');
      const ebtidaLinha = dreMensal.linhas.find(l => l.label === 'EBTIDA');
      return (
        <>
          {margemLinha && (
            <DRETrendChart
              title="Margem de Contribuição vs Meta Ideal"
              description="Comparativo mensal entre a margem realizada e a meta ideal para empresas de serviço (referência: 40%)."
              meses={dreMensal.meses}
              valores={margemLinha.valores}
              format="percent"
              valueColor="hsl(var(--primary))"
              trendColor="hsl(var(--destructive))"
              defaultTargetPercent={40}
              inputLabel="Meta ideal (%)"
            />
          )}
          {ebtidaLinha && receitaLinha && (
            <DRETrendChart
              title="EBITDA vs Meta Ideal"
              description="Comparativo mensal do EBITDA realizado e a meta ideal calculada como % da Receita do mês."
              meses={dreMensal.meses}
              valores={ebtidaLinha.valores}
              referenceValores={receitaLinha.valores}
              format="currency"
              valueColor="hsl(var(--primary))"
              trendColor="hsl(var(--destructive))"
              defaultTargetPercent={20}
              inputLabel="Meta ideal (% da Receita)"
            />
          )}
        </>
      );
    })()}

    <DREChatDialog open={chatOpen} onOpenChange={setChatOpen} dreData={chatDreData} />
    </>
  );
}
