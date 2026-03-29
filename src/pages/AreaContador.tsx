import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calculator, Download, Search, FileSpreadsheet, FileDown, BarChart3, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TablePagination } from '@/components/ui/table-pagination';
import { ContaBancariaMultiSelect } from '@/components/financeiro/ContaBancariaMultiSelect';
import { CentroCustoFilterSelect } from '@/components/financeiro/CentroCustoFilterSelect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useExportReport } from '@/hooks/useExportReport';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { PermissionDeniedDialog } from '@/components/PermissionDeniedDialog';

// ==================== HELPERS ====================
const PAGE_SIZE = 1000;

const fetchAllPages = async (buildQuery: (from: number, to: number) => any): Promise<any[]> => {
  let from = 0;
  const results: any[] = [];
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const chunk = data || [];
    results.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return results;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
};

const formatCnpj = (value: string) => {
  if (!value) return 'N/A';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 14) return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return value;
};

/** Returns: { start: 'YYYY-01-01', end: 'YYYY-MM-DD' } where end is last day of previous month */
const getClosedPeriod = () => {
  const today = new Date();
  const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  return {
    start: format(startOfYear, 'yyyy-MM-dd'),
    end: format(lastDayLastMonth, 'yyyy-MM-dd'),
  };
};

const getMonthLabel = (month: number, year: number) => {
  const d = new Date(year, month - 1, 1);
  return format(d, 'MMMM/yyyy', { locale: ptBR });
};

// ==================== TYPES ====================
interface ExtratoRow {
  id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data_vencimento: string;
  descricao: string;
  status: string;
  cliente_fornecedor?: string;
  centro_custo_nome?: string;
  categoria?: string;
  conta_bancaria_id?: string;
  conta_bancaria_nome?: string;
  data_recebimento?: string;
  data_pagamento?: string;
}

interface RetencaoRow {
  id: string;
  data_recebimento: string;
  cliente_razao_social: string;
  cliente_cnpj: string;
  servicos: string;
  numero_nf: string | null;
  valor_bruto: number;
  irrf_valor: number;
  pis_valor: number;
  cofins_valor: number;
  csll_valor: number;
  valor_liquido: number;
  mes: number;
  ano: number;
}

// ==================== COMPONENT ====================
export default function AreaContador() {
  const [activeTab, setActiveTab] = useState('extrato');
  const { toast } = useToast();
  const { exportToPDF, exportToExcel } = useExportReport();
  const { showPermissionDenied, setShowPermissionDenied, permissionDeniedMessage, checkPermission } = usePermissionCheck();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Área do Contador</h1>
          <p className="text-sm text-muted-foreground">
            Período fechado: até {formatDate(getClosedPeriod().end)}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="extrato" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Extrato e Conciliação
          </TabsTrigger>
          <TabsTrigger value="retencoes" className="gap-2">
            <Receipt className="w-4 h-4" />
            Relatório de Retenções
          </TabsTrigger>
        </TabsList>

        <TabsContent value="extrato">
          <ExtratoTab />
        </TabsContent>
        <TabsContent value="retencoes">
          <RetencoesTab />
        </TabsContent>
      </Tabs>

      <PermissionDeniedDialog
        open={showPermissionDenied}
        onOpenChange={setShowPermissionDenied}
        description={permissionDeniedMessage}
      />
    </div>
  );
}

// ==================== EXTRATO TAB ====================
function ExtratoTab() {
  const [lancamentos, setLancamentos] = useState<ExtratoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [contaBancariaFilter, setContaBancariaFilter] = useState<string[]>([]);
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: string; descricao: string; banco: string; saldo_atual: number; [key: string]: any }>>([]);
  const [centroCustoFilter, setCentroCustoFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [saldoInicial, setSaldoInicial] = useState(0);
  const { toast } = useToast();
  const { exportToPDF, exportToExcel } = useExportReport();

  const period = getClosedPeriod();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Lookup maps
      const [{ data: planoContasData }, { data: centrosCustoData }, { data: contasBancariasData }] = await Promise.all([
        supabase.from('plano_contas').select('id, codigo, descricao'),
        supabase.from('centros_custo').select('id, codigo, descricao'),
        supabase.from('contas_bancarias').select('id, descricao, banco, saldo_inicial, data_inicio, status').order('descricao'),
      ]);

      const planoMap = new Map((planoContasData || []).map(p => [p.id, p]));
      const ccMap = new Map((centrosCustoData || []).map(c => [c.id, c]));
      const cbMap = new Map((contasBancariasData || []).map(c => [c.id, c]));

      // Fetch paid entries by movement date, pending by due date
      const [receberPagos, receberPendentes, pagarPagos, pagarPendentes] = await Promise.all([
        fetchAllPages((from, to) =>
          supabase.from('contas_receber')
            .select('id, valor, data_vencimento, descricao, status, centro_custo, plano_conta_id, conta_bancaria_id, data_recebimento, cliente_id, clientes:cliente_id(razao_social, nome_fantasia)')
            .eq('status', 'pago').not('data_recebimento', 'is', null)
            .gte('data_recebimento', period.start).lte('data_recebimento', period.end)
            .order('data_recebimento').range(from, to)
        ),
        fetchAllPages((from, to) =>
          supabase.from('contas_receber')
            .select('id, valor, data_vencimento, descricao, status, centro_custo, plano_conta_id, conta_bancaria_id, data_recebimento, cliente_id, clientes:cliente_id(razao_social, nome_fantasia)')
            .neq('status', 'pago').neq('status', 'cancelado')
            .gte('data_vencimento', period.start).lte('data_vencimento', period.end)
            .order('data_vencimento').range(from, to)
        ),
        fetchAllPages((from, to) =>
          supabase.from('contas_pagar')
            .select('id, valor, data_vencimento, descricao, status, centro_custo, plano_conta_id, conta_bancaria_id, data_pagamento, fornecedor_id, fornecedores:fornecedor_id(razao_social, nome_fantasia)')
            .eq('status', 'pago').not('data_pagamento', 'is', null)
            .gte('data_pagamento', period.start).lte('data_pagamento', period.end)
            .order('data_pagamento').range(from, to)
        ),
        fetchAllPages((from, to) =>
          supabase.from('contas_pagar')
            .select('id, valor, data_vencimento, descricao, status, centro_custo, plano_conta_id, conta_bancaria_id, data_pagamento, fornecedor_id, fornecedores:fornecedor_id(razao_social, nome_fantasia)')
            .neq('status', 'pago').neq('status', 'cancelado')
            .gte('data_vencimento', period.start).lte('data_vencimento', period.end)
            .order('data_vencimento').range(from, to)
        ),
      ]);

      // Calculate opening balance
      const [entradasAnt, saidasAnt] = await Promise.all([
        fetchAllPages((from, to) =>
          supabase.from('contas_receber').select('valor').eq('status', 'pago').lt('data_recebimento', period.start).range(from, to)
        ),
        fetchAllPages((from, to) =>
          supabase.from('contas_pagar').select('valor').eq('status', 'pago').lt('data_pagamento', period.start).range(from, to)
        ),
      ]);

      const saldoInicialContas = (contasBancariasData || [])
        .filter((c: any) => c.status !== 'inativo')
        .reduce((acc: number, c: any) => acc + Number(c.saldo_inicial || 0), 0);

      const totalEntradasAnt = entradasAnt.reduce((acc: number, r: any) => acc + Number(r.valor), 0);
      const totalSaidasAnt = saidasAnt.reduce((acc: number, r: any) => acc + Number(r.valor), 0);
      const saldoInicialCalc = saldoInicialContas + totalEntradasAnt - totalSaidasAnt;
      setSaldoInicial(saldoInicialCalc);
      setContasBancarias((contasBancariasData || []).filter((c: any) => c.status !== 'inativo'));

      // Map to rows
      const mapReceber = (r: any): ExtratoRow => {
        const cc = r.centro_custo ? ccMap.get(r.centro_custo) : null;
        const pc = r.plano_conta_id ? planoMap.get(r.plano_conta_id) : null;
        const cb = r.conta_bancaria_id ? cbMap.get(r.conta_bancaria_id) : null;
        return {
          id: r.id, tipo: 'entrada', valor: Number(r.valor), data_vencimento: r.data_vencimento,
          descricao: r.descricao, status: r.status,
          cliente_fornecedor: (r.clientes as any)?.nome_fantasia || (r.clientes as any)?.razao_social || '',
          centro_custo_nome: cc ? `${cc.codigo} - ${cc.descricao}` : undefined,
          categoria: pc ? `${pc.codigo} - ${pc.descricao}` : undefined,
          conta_bancaria_id: r.conta_bancaria_id,
          conta_bancaria_nome: cb ? `${cb.banco} - ${cb.descricao}` : undefined,
          data_recebimento: r.data_recebimento,
        };
      };

      const mapPagar = (p: any): ExtratoRow => {
        const cc = p.centro_custo ? ccMap.get(p.centro_custo) : null;
        const pc = p.plano_conta_id ? planoMap.get(p.plano_conta_id) : null;
        const cb = p.conta_bancaria_id ? cbMap.get(p.conta_bancaria_id) : null;
        return {
          id: p.id, tipo: 'saida', valor: Number(p.valor), data_vencimento: p.data_vencimento,
          descricao: p.descricao, status: p.status,
          cliente_fornecedor: (p.fornecedores as any)?.nome_fantasia || (p.fornecedores as any)?.razao_social || '',
          centro_custo_nome: cc ? `${cc.codigo} - ${cc.descricao}` : undefined,
          categoria: pc ? `${pc.codigo} - ${pc.descricao}` : undefined,
          conta_bancaria_id: p.conta_bancaria_id,
          conta_bancaria_nome: cb ? `${cb.banco} - ${cb.descricao}` : undefined,
          data_pagamento: p.data_pagamento,
        };
      };

      const all = [
        ...receberPagos.map(mapReceber),
        ...receberPendentes.map(mapReceber),
        ...pagarPagos.map(mapPagar),
        ...pagarPendentes.map(mapPagar),
      ].sort((a, b) => {
        const dateA = a.status === 'pago' ? (a.data_recebimento || a.data_pagamento || a.data_vencimento) : a.data_vencimento;
        const dateB = b.status === 'pago' ? (b.data_recebimento || b.data_pagamento || b.data_vencimento) : b.data_vencimento;
        return (dateA || '').localeCompare(dateB || '');
      });

      setLancamentos(all);
    } catch (error) {
      console.error('Erro ao buscar extrato:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar o extrato.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return lancamentos.filter(l => {
      if (searchTerm && !l.descricao.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(l.cliente_fornecedor || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (contaBancariaFilter.length > 0 && (!l.conta_bancaria_id || !contaBancariaFilter.includes(l.conta_bancaria_id))) return false;
      if (centroCustoFilter.length > 0 && !centroCustoFilter.some(cc => (l.centro_custo_nome || '').includes(cc))) return false;
      return true;
    });
  }, [lancamentos, searchTerm, contaBancariaFilter, centroCustoFilter]);

  const totalEntradas = filtered.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
  const totalSaidas = filtered.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
  const saldoPeriodo = totalEntradas - totalSaidas;

  const totalItems = filtered.length;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getDisplayStatus = (row: ExtratoRow) => {
    if (row.status === 'pago') return row.tipo === 'entrada' ? 'recebido' : 'pago';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const venc = new Date(row.data_vencimento + 'T00:00:00');
    return venc < hoje ? 'vencido' : 'em dia';
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Extrato Contábil',
      filename: `extrato-contador-${format(new Date(), 'yyyy-MM-dd')}`,
      columns: [
        { header: 'Data', accessor: (r: ExtratoRow) => r.data_vencimento, type: 'date' as const },
        { header: 'Tipo', accessor: (r: ExtratoRow) => r.tipo === 'entrada' ? 'Entrada' : 'Saída' },
        { header: 'Descrição', accessor: 'descricao' },
        { header: 'Cliente/Fornecedor', accessor: (r: ExtratoRow) => r.cliente_fornecedor || '-' },
        { header: 'Categoria', accessor: (r: ExtratoRow) => r.categoria || '-' },
        { header: 'Centro de Custo', accessor: (r: ExtratoRow) => r.centro_custo_nome || '-' },
        { header: 'Conta Bancária', accessor: (r: ExtratoRow) => r.conta_bancaria_nome || '-' },
        { header: 'Valor', accessor: (r: ExtratoRow) => r.valor, type: 'currency' as const },
        { header: 'Status', accessor: (r: ExtratoRow) => getDisplayStatus(r) },
      ],
      data: filtered,
      dateRange: `${formatDate(period.start)} - ${formatDate(period.end)}`,
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: 'Extrato Contábil',
      filename: `extrato-contador-${format(new Date(), 'yyyy-MM-dd')}`,
      columns: [
        { header: 'Data', accessor: (r: ExtratoRow) => r.data_vencimento, type: 'date' as const },
        { header: 'Tipo', accessor: (r: ExtratoRow) => r.tipo === 'entrada' ? 'E' : 'S' },
        { header: 'Cliente/Fornecedor', accessor: (r: ExtratoRow) => r.cliente_fornecedor || '-' },
        { header: 'Descrição', accessor: 'descricao' },
        { header: 'Valor', accessor: (r: ExtratoRow) => r.valor, type: 'currency' as const },
        { header: 'Status', accessor: (r: ExtratoRow) => getDisplayStatus(r) },
      ],
      data: filtered,
      dateRange: `${formatDate(period.start)} - ${formatDate(period.end)}`,
      subtotals: [
        { label: 'Total Entradas', value: totalEntradas, type: 'positive' },
        { label: 'Total Saídas', value: totalSaidas, type: 'negative' },
        { label: 'Saldo', value: saldoPeriodo, type: saldoPeriodo >= 0 ? 'positive' : 'negative' },
      ],
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Entradas</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Saídas</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalSaidas)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Saldo do Período</p>
          <p className={`text-xl font-bold ${saldoPeriodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(saldoPeriodo)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <ContaBancariaMultiSelect contas={contasBancarias} selectedIds={contaBancariaFilter} onChange={setContaBancariaFilter} />
        <CentroCustoFilterSelect value={centroCustoFilter} onValueChange={setCentroCustoFilter} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Exportar</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}><FileDown className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente/Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Conta Bancária</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Saída</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum lançamento encontrado</TableCell></TableRow>
              ) : (
                paginated.map(row => {
                  const status = getDisplayStatus(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(row.data_vencimento)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.descricao}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{row.cliente_fornecedor || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">{row.categoria || '-'}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs">{row.centro_custo_nome || '-'}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs">{row.conta_bancaria_nome || '-'}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {row.tipo === 'entrada' ? formatCurrency(row.valor) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {row.tipo === 'saida' ? formatCurrency(row.valor) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status === 'recebido' || status === 'pago' ? 'default' : status === 'vencido' ? 'destructive' : 'secondary'}>
                          {status === 'recebido' ? 'Recebido' : status === 'pago' ? 'Pago' : status === 'vencido' ? 'Vencido' : 'Em dia'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
        />
      </Card>
    </div>
  );
}

// ==================== RETENÇÕES TAB ====================
function RetencoesTab() {
  const [retencoes, setRetencoes] = useState<RetencaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [anoFilter, setAnoFilter] = useState(new Date().getFullYear().toString());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { toast } = useToast();
  const { exportToExcel, exportToPDF } = useExportReport();

  const period = getClosedPeriod();

  useEffect(() => {
    fetchRetencoes();
  }, [anoFilter]);

  const fetchRetencoes = async () => {
    setLoading(true);
    try {
      const ano = parseInt(anoFilter);
      const startDate = `${ano}-01-01`;
      // End date: min(last day of previous month, end of selected year)
      const endDate = ano < new Date().getFullYear() ? `${ano}-12-31` : period.end;

      // If year is current but no closed month yet, show nothing
      if (ano === new Date().getFullYear() && new Date().getMonth() === 0) {
        setRetencoes([]);
        setLoading(false);
        return;
      }

      const data = await fetchAllPages((from, to) =>
        supabase.from('contas_receber')
          .select(`
            id, valor, data_recebimento, numero_nf, status, parcela_id,
            clientes:cliente_id(razao_social, cnpj_cpf),
            parcelas_contrato:parcela_id(
              contratos:contrato_id(
                irrf_percentual, pis_percentual, cofins_percentual, csll_percentual,
                servicos, valor_bruto
              )
            )
          `)
          .eq('status', 'pago')
          .not('data_recebimento', 'is', null)
          .not('parcela_id', 'is', null)
          .gte('data_recebimento', startDate)
          .lte('data_recebimento', endDate)
          .order('data_recebimento')
          .range(from, to)
      );

      // Fetch service names
      const allServiceIds = new Set<string>();
      data.forEach((r: any) => {
        const contrato = r.parcelas_contrato?.contratos;
        if (contrato?.servicos && Array.isArray(contrato.servicos)) {
          contrato.servicos.forEach((sid: string) => allServiceIds.add(sid));
        }
      });

      let servicosMap = new Map<string, string>();
      if (allServiceIds.size > 0) {
        const { data: servicosData } = await supabase
          .from('servicos').select('id, codigo, nome').in('id', Array.from(allServiceIds));
        if (servicosData) {
          servicosData.forEach(s => servicosMap.set(s.id, `${s.codigo} - ${s.nome}`));
        }
      }

      const rows: RetencaoRow[] = data
        .filter((r: any) => {
          const contrato = r.parcelas_contrato?.contratos;
          if (!contrato) return false;
          const total = (contrato.irrf_percentual || 0) + (contrato.pis_percentual || 0) +
            (contrato.cofins_percentual || 0) + (contrato.csll_percentual || 0);
          return total > 0;
        })
        .map((r: any) => {
          const contrato = r.parcelas_contrato?.contratos;
          const valor = Number(r.valor);
          const irrfPct = contrato?.irrf_percentual || 0;
          const pisPct = contrato?.pis_percentual || 0;
          const cofinsPct = contrato?.cofins_percentual || 0;
          const csllPct = contrato?.csll_percentual || 0;
          const totalPct = irrfPct + pisPct + cofinsPct + csllPct;

          // Determine if valor is already net or gross
          const contratoValorBruto = contrato?.valor_bruto ? Number(contrato.valor_bruto) : 0;
          let valorBruto = valor;
          
          if (totalPct > 0 && totalPct < 100) {
            const brutoEstimado = valor / (1 - totalPct / 100);
            if (contratoValorBruto > 0 && Math.abs(contratoValorBruto - brutoEstimado) <= Math.max(0.5, brutoEstimado * 0.01)) {
              valorBruto = contratoValorBruto;
            } else {
              valorBruto = valor; // assume already gross
            }
          }

          const round2 = (v: number) => Math.round(v * 100) / 100;
          const irrfValor = round2(valorBruto * irrfPct / 100);
          const pisValor = round2(valorBruto * pisPct / 100);
          const cofinsValor = round2(valorBruto * cofinsPct / 100);
          const csllValor = round2(valorBruto * csllPct / 100);
          const valorLiquido = round2(valorBruto - irrfValor - pisValor - cofinsValor - csllValor);

          const servicosNomes = contrato?.servicos && Array.isArray(contrato.servicos)
            ? contrato.servicos.map((sid: string) => servicosMap.get(sid) || sid).join(', ')
            : '-';

          const recDate = new Date(r.data_recebimento + 'T00:00:00');

          return {
            id: r.id,
            data_recebimento: r.data_recebimento,
            cliente_razao_social: (r.clientes as any)?.razao_social || 'N/A',
            cliente_cnpj: (r.clientes as any)?.cnpj_cpf || '',
            servicos: servicosNomes,
            numero_nf: r.numero_nf,
            valor_bruto: round2(valorBruto),
            irrf_valor: irrfValor,
            pis_valor: pisValor,
            cofins_valor: cofinsValor,
            csll_valor: csllValor,
            valor_liquido: valorLiquido,
            mes: recDate.getMonth() + 1,
            ano: recDate.getFullYear(),
          };
        });

      setRetencoes(rows);
    } catch (error) {
      console.error('Erro ao buscar retenções:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as retenções.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return retencoes;
    const term = searchTerm.toLowerCase();
    return retencoes.filter(r =>
      r.cliente_razao_social.toLowerCase().includes(term) ||
      r.cliente_cnpj.includes(searchTerm) ||
      (r.numero_nf && r.numero_nf.includes(searchTerm))
    );
  }, [retencoes, searchTerm]);

  // Group by month
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, RetencaoRow[]>();
    filtered.forEach(r => {
      const key = `${r.ano}-${String(r.mes).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const totals = useMemo(() => ({
    bruto: filtered.reduce((s, r) => s + r.valor_bruto, 0),
    irrf: filtered.reduce((s, r) => s + r.irrf_valor, 0),
    pis: filtered.reduce((s, r) => s + r.pis_valor, 0),
    cofins: filtered.reduce((s, r) => s + r.cofins_valor, 0),
    csll: filtered.reduce((s, r) => s + r.csll_valor, 0),
    liquido: filtered.reduce((s, r) => s + r.valor_liquido, 0),
  }), [filtered]);

  const totalItems = filtered.length;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportColumns = [
    { header: 'Data Recebimento', accessor: (r: RetencaoRow) => r.data_recebimento, type: 'date' as const },
    { header: 'Cliente', accessor: (r: RetencaoRow) => r.cliente_razao_social },
    { header: 'CNPJ', accessor: (r: RetencaoRow) => formatCnpj(r.cliente_cnpj) },
    { header: 'Serviço', accessor: (r: RetencaoRow) => r.servicos },
    { header: 'NF', accessor: (r: RetencaoRow) => r.numero_nf || '-' },
    { header: 'Valor Bruto', accessor: (r: RetencaoRow) => r.valor_bruto, type: 'currency' as const },
    { header: 'IRRF', accessor: (r: RetencaoRow) => r.irrf_valor, type: 'currency' as const },
    { header: 'PIS', accessor: (r: RetencaoRow) => r.pis_valor, type: 'currency' as const },
    { header: 'COFINS', accessor: (r: RetencaoRow) => r.cofins_valor, type: 'currency' as const },
    { header: 'CSLL', accessor: (r: RetencaoRow) => r.csll_valor, type: 'currency' as const },
    { header: 'Valor Líquido', accessor: (r: RetencaoRow) => r.valor_liquido, type: 'currency' as const },
  ];

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Relatório de Retenções',
      filename: `retencoes-${anoFilter}`,
      columns: exportColumns,
      data: filtered,
      dateRange: `Ano ${anoFilter}`,
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: 'Relatório de Retenções',
      filename: `retencoes-${anoFilter}`,
      columns: exportColumns,
      data: filtered,
      dateRange: `Ano ${anoFilter}`,
      subtotals: [
        { label: 'Total Bruto', value: totals.bruto, type: 'positive' },
        { label: 'Total IRRF', value: totals.irrf, type: 'negative' },
        { label: 'Total PIS', value: totals.pis, type: 'negative' },
        { label: 'Total COFINS', value: totals.cofins, type: 'negative' },
        { label: 'Total CSLL', value: totals.csll, type: 'negative' },
        { label: 'Total Líquido', value: totals.liquido, type: 'positive' },
      ],
    });
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Valor Bruto</p>
          <p className="text-lg font-bold">{formatCurrency(totals.bruto)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">IRRF</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.irrf)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">PIS</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.pis)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">COFINS</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.cofins)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">CSLL</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.csll)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Valor Líquido</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totals.liquido)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, CNPJ, NF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={anoFilter} onValueChange={v => { setAnoFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Exportar</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}><FileDown className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recebimento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>NF</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">IRRF</TableHead>
                <TableHead className="text-right">PIS</TableHead>
                <TableHead className="text-right">COFINS</TableHead>
                <TableHead className="text-right">CSLL</TableHead>
                <TableHead className="text-right">Valor Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhuma retenção encontrada</TableCell></TableRow>
              ) : (
                <>
                  {groupedByMonth.map(([monthKey, rows]) => {
                    const [yr, mn] = monthKey.split('-').map(Number);
                    const monthRows = rows.filter(r => paginated.some(p => p.id === r.id));
                    if (monthRows.length === 0) return null;

                    const monthTotals = {
                      bruto: rows.reduce((s, r) => s + r.valor_bruto, 0),
                      irrf: rows.reduce((s, r) => s + r.irrf_valor, 0),
                      pis: rows.reduce((s, r) => s + r.pis_valor, 0),
                      cofins: rows.reduce((s, r) => s + r.cofins_valor, 0),
                      csll: rows.reduce((s, r) => s + r.csll_valor, 0),
                      liquido: rows.reduce((s, r) => s + r.valor_liquido, 0),
                    };

                    return (
                      <React.Fragment key={monthKey}>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={11} className="font-semibold text-sm capitalize">
                            {getMonthLabel(mn, yr)}
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              ({rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'})
                            </span>
                          </TableCell>
                        </TableRow>
                        {monthRows.map(row => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap">{formatDate(row.data_recebimento)}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{row.cliente_razao_social}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs">{formatCnpj(row.cliente_cnpj)}</TableCell>
                            <TableCell className="max-w-[150px] truncate text-xs">{row.servicos}</TableCell>
                            <TableCell>{row.numero_nf || '-'}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(row.valor_bruto)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(row.irrf_valor)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(row.pis_valor)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(row.cofins_valor)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(row.csll_valor)}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">{formatCurrency(row.valor_liquido)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 border-b-2">
                          <TableCell colSpan={5} className="text-right font-semibold text-xs">Subtotal {getMonthLabel(mn, yr)}:</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(monthTotals.bruto)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatCurrency(monthTotals.irrf)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatCurrency(monthTotals.pis)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatCurrency(monthTotals.cofins)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatCurrency(monthTotals.csll)}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">{formatCurrency(monthTotals.liquido)}</TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                  {/* Grand Total */}
                  <TableRow className="bg-primary/5 font-bold">
                    <TableCell colSpan={5} className="text-right">TOTAL GERAL:</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.bruto)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(totals.irrf)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(totals.pis)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(totals.cofins)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(totals.csll)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(totals.liquido)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
        />
      </Card>
    </div>
  );
}
