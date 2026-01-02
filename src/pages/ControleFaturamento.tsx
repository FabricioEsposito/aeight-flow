import React, { useState, useEffect } from 'react';
import { Search, Eye, ExternalLink, FileText, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useExportReport } from '@/hooks/useExportReport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { TablePagination } from '@/components/ui/table-pagination';
import { FaturamentoDetailsDialog } from '@/components/faturamento/FaturamentoDetailsDialog';
import CentroCustoSelect from '@/components/centro-custos/CentroCustoSelect';
import { format } from 'date-fns';

interface Faturamento {
  id: string;
  data_competencia: string;
  data_vencimento: string;
  cliente_id: string;
  cliente_razao_social: string;
  cliente_nome_fantasia: string | null;
  cliente_cnpj: string;
  servicos_detalhes: Array<{ codigo: string; nome: string }>;
  numero_nf: string | null;
  link_nf: string | null;
  valor_bruto: number;
  valor_liquido: number;
  status: string;
  contrato_id: string | null;
  numero_contrato: string | null;
  importancia: string | null;
  vendedor: string | null;
  link_contrato: string | null;
  tipo_pagamento: string | null;
  pis_percentual: number;
  cofins_percentual: number;
  irrf_percentual: number;
  csll_percentual: number;
  pis_cofins_percentual: number;
  desconto_percentual: number;
  desconto_valor: number;
  periodo_recorrencia: string | null;
  data_recebimento: string | null;
  centro_custo: string | null;
}

export default function ControleFaturamento() {
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('este-mes');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedFaturamento, setSelectedFaturamento] = useState<Faturamento | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCentroCusto, setSelectedCentroCusto] = useState<string>('');
  const [showImpostosDetalhados, setShowImpostosDetalhados] = useState(false);
  const { toast } = useToast();
  const { exportToExcel } = useExportReport();

  const getDateRange = () => {
    const today = new Date();
    
    switch (datePreset) {
      case 'todo-periodo':
        return undefined;
      case 'hoje':
        return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'esta-semana': {
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: format(monday, 'yyyy-MM-dd'), end: format(sunday, 'yyyy-MM-dd') };
      }
      case 'este-mes': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
      }
      case 'este-ano': {
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear(), 11, 31);
        return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
      }
      case 'ultimos-30-dias': {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return { start: format(start, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      }
      case 'ultimos-12-meses': {
        const start = new Date(today);
        start.setMonth(today.getMonth() - 12);
        return { start: format(start, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      }
      case 'periodo-personalizado':
        if (customDateRange?.from && customDateRange?.to) {
          return {
            start: format(customDateRange.from, 'yyyy-MM-dd'),
            end: format(customDateRange.to, 'yyyy-MM-dd')
          };
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const fetchFaturamentos = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      
      let query = supabase
        .from('contas_receber')
        .select(`
          *,
          clientes:cliente_id (razao_social, nome_fantasia, cnpj_cpf),
          parcelas_contrato:parcela_id (
            contrato_id,
            contratos:contrato_id (
              id,
              numero_contrato,
              servicos,
              importancia_cliente_fornecedor,
              vendedor_responsavel,
              link_contrato,
              tipo_pagamento,
              pis_percentual,
              cofins_percentual,
              irrf_percentual,
              csll_percentual,
              pis_cofins_percentual,
              desconto_percentual,
              desconto_valor,
              periodo_recorrencia,
              valor_bruto,
              centro_custo
            )
          )
        `)
        .order('data_competencia', { ascending: true });

      if (dateRange) {
        query = query.gte('data_competencia', dateRange.start).lte('data_competencia', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar detalhes dos serviços
      const faturamentosFormatados = await Promise.all((data || []).map(async (item: any) => {
        const contrato = item.parcelas_contrato?.contratos;
        
        let servicosDetalhes: Array<{ codigo: string; nome: string }> = [];
        if (contrato?.servicos && Array.isArray(contrato.servicos) && contrato.servicos.length > 0) {
          const { data: servicosData } = await supabase
            .from('servicos')
            .select('id, codigo, nome')
            .in('id', contrato.servicos);
          
          if (servicosData) {
            servicosDetalhes = servicosData;
          }
        }

        const valorBruto = contrato?.valor_bruto || item.valor;
        
        return {
          id: item.id,
          data_competencia: item.data_competencia,
          data_vencimento: item.data_vencimento,
          cliente_id: item.cliente_id,
          cliente_razao_social: item.clientes?.razao_social || 'N/A',
          cliente_nome_fantasia: item.clientes?.nome_fantasia || null,
          cliente_cnpj: item.clientes?.cnpj_cpf || 'N/A',
          servicos_detalhes: servicosDetalhes,
          numero_nf: item.numero_nf,
          link_nf: item.link_nf,
          valor_bruto: valorBruto,
          valor_liquido: item.valor,
          status: item.status,
          contrato_id: contrato?.id || null,
          numero_contrato: contrato?.numero_contrato || null,
          importancia: contrato?.importancia_cliente_fornecedor || null,
          vendedor: contrato?.vendedor_responsavel || null,
          link_contrato: contrato?.link_contrato || null,
          tipo_pagamento: contrato?.tipo_pagamento || null,
          pis_percentual: contrato?.pis_percentual || 0,
          cofins_percentual: contrato?.cofins_percentual || 0,
          irrf_percentual: contrato?.irrf_percentual || 0,
          csll_percentual: contrato?.csll_percentual || 0,
          pis_cofins_percentual: contrato?.pis_cofins_percentual || 0,
          desconto_percentual: contrato?.desconto_percentual || 0,
          desconto_valor: contrato?.desconto_valor || 0,
          periodo_recorrencia: contrato?.periodo_recorrencia || null,
          data_recebimento: item.data_recebimento,
          centro_custo: contrato?.centro_custo || item.centro_custo || null,
        };
      }));

      setFaturamentos(faturamentosFormatados);
    } catch (error) {
      console.error('Erro ao buscar faturamentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os faturamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaturamentos();
  }, [datePreset, customDateRange]);

  const handleUpdateNF = async (id: string, numero_nf: string, link_nf: string) => {
    try {
      const { error } = await supabase
        .from('contas_receber')
        .update({ numero_nf, link_nf })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Nota fiscal atualizada!",
      });
      fetchFaturamentos();
    } catch (error) {
      console.error('Erro ao atualizar NF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a nota fiscal.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento + 'T00:00:00');
    
    if (status === 'pago' || status === 'recebido') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Recebido</Badge>;
    }
    if (vencimento < hoje) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Em dia</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatCnpj = (value: string) => {
    if (!value) return 'N/A';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const filteredFaturamentos = faturamentos.filter(f => {
    const matchesSearch = 
      f.cliente_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.cliente_nome_fantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cliente_cnpj.includes(searchTerm) ||
      (f.numero_nf && f.numero_nf.includes(searchTerm)) ||
      (f.numero_contrato && f.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'todos' || (() => {
      const hoje = new Date();
      const vencimento = new Date(f.data_vencimento + 'T00:00:00');
      if (statusFilter === 'recebido') return f.status === 'pago' || f.status === 'recebido';
      if (statusFilter === 'vencido') return f.status !== 'pago' && f.status !== 'recebido' && vencimento < hoje;
      if (statusFilter === 'em-dia') return f.status !== 'pago' && f.status !== 'recebido' && vencimento >= hoje;
      return true;
    })();

    const matchesCentroCusto = !selectedCentroCusto || f.centro_custo === selectedCentroCusto;
    
    return matchesSearch && matchesStatus && matchesCentroCusto;
  }).sort((a, b) => {
    // Ordenar por numero_nf - menor para maior
    const nfA = a.numero_nf ? parseInt(a.numero_nf.replace(/\D/g, '')) || 0 : 0;
    const nfB = b.numero_nf ? parseInt(b.numero_nf.replace(/\D/g, '')) || 0 : 0;
    return nfA - nfB;
  });

  const totalItems = filteredFaturamentos.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFaturamentos = filteredFaturamentos.slice(startIndex, endIndex);

  const handleViewDetails = (faturamento: Faturamento) => {
    setSelectedFaturamento(faturamento);
    setDetailsDialogOpen(true);
  };

  const getStatusText = (status: string, dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento + 'T00:00:00');
    if (status === 'pago' || status === 'recebido') return 'Recebido';
    if (vencimento < hoje) return 'Vencido';
    return 'Em dia';
  };

  const handleExportExcel = () => {
    const dateRange = getDateRange();
    const dateRangeText = dateRange 
      ? `${format(new Date(dateRange.start), 'dd/MM/yyyy')} a ${format(new Date(dateRange.end), 'dd/MM/yyyy')}`
      : 'Todo o período';

    const columns = [
      { header: 'Data Competência', accessor: (row: Faturamento) => row.data_competencia, type: 'date' as const },
      { header: 'Vencimento', accessor: (row: Faturamento) => row.data_vencimento, type: 'date' as const },
      { header: 'Razão Social', accessor: 'cliente_razao_social', type: 'text' as const },
      { header: 'Nome Fantasia', accessor: (row: Faturamento) => row.cliente_nome_fantasia || '-', type: 'text' as const },
      { header: 'Serviço', accessor: (row: Faturamento) => row.servicos_detalhes.length > 0 ? row.servicos_detalhes.map(s => `${s.codigo} - ${s.nome}`).join(', ') : 'N/A', type: 'text' as const },
      { header: 'CNPJ', accessor: (row: Faturamento) => formatCnpj(row.cliente_cnpj), type: 'text' as const },
      { header: 'Nº NF', accessor: (row: Faturamento) => row.numero_nf || '-', type: 'text' as const },
      { header: 'Valor Bruto', accessor: 'valor_bruto', type: 'currency' as const },
      { header: 'IRRF', accessor: (row: Faturamento) => row.valor_bruto * (row.irrf_percentual / 100), type: 'currency' as const },
      { header: 'PIS', accessor: (row: Faturamento) => row.valor_bruto * (row.pis_percentual / 100), type: 'currency' as const },
      { header: 'COFINS', accessor: (row: Faturamento) => row.valor_bruto * (row.cofins_percentual / 100), type: 'currency' as const },
      { header: 'CSLL', accessor: (row: Faturamento) => row.valor_bruto * (row.csll_percentual / 100), type: 'currency' as const },
      { header: 'Total Retenções', accessor: (row: Faturamento) => {
        const irrf = row.valor_bruto * (row.irrf_percentual / 100);
        const pis = row.valor_bruto * (row.pis_percentual / 100);
        const cofins = row.valor_bruto * (row.cofins_percentual / 100);
        const csll = row.valor_bruto * (row.csll_percentual / 100);
        return irrf + pis + cofins + csll;
      }, type: 'currency' as const },
      { header: 'Valor Líquido', accessor: 'valor_liquido', type: 'currency' as const },
      { header: 'Status', accessor: (row: Faturamento) => getStatusText(row.status, row.data_vencimento), type: 'text' as const },
      { header: 'Link NF', accessor: (row: Faturamento) => row.link_nf || '-', type: 'text' as const },
      { header: 'Contrato', accessor: (row: Faturamento) => row.numero_contrato || '-', type: 'text' as const },
      { header: 'Vendedor', accessor: (row: Faturamento) => row.vendedor || '-', type: 'text' as const },
      { header: 'Centro de Custo', accessor: (row: Faturamento) => row.centro_custo || '-', type: 'text' as const },
    ];

    exportToExcel({
      title: 'Controle de Faturamento',
      filename: `faturamento_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      data: filteredFaturamentos,
      dateRange: dateRangeText,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Faturamento</h1>
          <p className="text-muted-foreground">Gerencie as notas fiscais das parcelas de venda</p>
        </div>
        <Button variant="outline" onClick={handleExportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total em Dia</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(
                  filteredFaturamentos
                    .filter(f => {
                      const hoje = new Date();
                      const vencimento = new Date(f.data_vencimento + 'T00:00:00');
                      return f.status !== 'pago' && f.status !== 'recebido' && vencimento >= hoje;
                    })
                    .reduce((sum, f) => sum + f.valor_liquido, 0)
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vencido</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  filteredFaturamentos
                    .filter(f => {
                      const hoje = new Date();
                      const vencimento = new Date(f.data_vencimento + 'T00:00:00');
                      return f.status !== 'pago' && f.status !== 'recebido' && vencimento < hoje;
                    })
                    .reduce((sum, f) => sum + f.valor_liquido, 0)
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  filteredFaturamentos
                    .filter(f => f.status === 'pago' || f.status === 'recebido')
                    .reduce((sum, f) => sum + f.valor_liquido, 0)
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <DateRangeFilter
            value={datePreset}
            onChange={(preset, range) => {
              setDatePreset(preset);
              if (range) {
                setCustomDateRange(range);
              }
            }}
            customRange={customDateRange}
          />

          <div className="w-[250px]">
            <CentroCustoSelect
              value={selectedCentroCusto}
              onValueChange={setSelectedCentroCusto}
              placeholder="Empresa / Centro de Custo"
              showAllOption={true}
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por cliente, CNPJ, NF ou contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em-dia">Em dia</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Competência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Razão Social</TableHead>
              <TableHead>Nome Fantasia</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>NF</TableHead>
              <TableHead className="text-right">Valor Bruto</TableHead>
              {showImpostosDetalhados ? (
                <>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setShowImpostosDetalhados(false)}
                        title="Agrupar Impostos"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      IRRF
                    </div>
                  </TableHead>
                  <TableHead className="text-right">PIS</TableHead>
                  <TableHead className="text-right">COFINS</TableHead>
                  <TableHead className="text-right">CSLL</TableHead>
                </>
              ) : (
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setShowImpostosDetalhados(true)}
                      title="Detalhar Impostos (IRRF, PIS, COFINS, CSLL)"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    Retenções
                  </div>
                </TableHead>
              )}
              <TableHead className="text-right">Valor Líquido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Link NF</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedFaturamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showImpostosDetalhados ? 17 : 14} className="text-center text-muted-foreground py-8">
                  Nenhum faturamento encontrado no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              paginatedFaturamentos.map((faturamento) => {
                const irrfValor = faturamento.valor_bruto * (faturamento.irrf_percentual / 100);
                const csllValor = faturamento.valor_bruto * (faturamento.csll_percentual / 100);
                const cofinsValor = faturamento.valor_bruto * (faturamento.cofins_percentual / 100);
                const pisValor = faturamento.valor_bruto * (faturamento.pis_percentual / 100);
                const totalRetencoes = irrfValor + pisValor + cofinsValor + csllValor;
                
                return (
                <TableRow key={faturamento.id}>
                  <TableCell>{formatDate(faturamento.data_competencia)}</TableCell>
                  <TableCell>{formatDate(faturamento.data_vencimento)}</TableCell>
                  <TableCell className="font-medium">{faturamento.cliente_razao_social}</TableCell>
                  <TableCell>{faturamento.cliente_nome_fantasia || '-'}</TableCell>
                  <TableCell>
                    {faturamento.servicos_detalhes.length > 0 
                      ? faturamento.servicos_detalhes.map(s => `${s.codigo} - ${s.nome}`).join(', ')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{formatCnpj(faturamento.cliente_cnpj)}</TableCell>
                  <TableCell>
                    <Input
                      value={faturamento.numero_nf || ''}
                      onChange={(e) => {
                        const newFaturamentos = faturamentos.map(f => 
                          f.id === faturamento.id ? { ...f, numero_nf: e.target.value } : f
                        );
                        setFaturamentos(newFaturamentos);
                      }}
                      onBlur={() => handleUpdateNF(faturamento.id, faturamento.numero_nf || '', faturamento.link_nf || '')}
                      placeholder="Nº NF"
                      className="w-24 h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(faturamento.valor_bruto)}</TableCell>
                  {showImpostosDetalhados ? (
                    <>
                      <TableCell className="text-right text-xs">
                        {faturamento.irrf_percentual > 0 ? (
                          <span title={`${faturamento.irrf_percentual}%`}>
                            {formatCurrency(irrfValor)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {faturamento.pis_percentual > 0 ? (
                          <span title={`${faturamento.pis_percentual}%`}>
                            {formatCurrency(pisValor)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {faturamento.cofins_percentual > 0 ? (
                          <span title={`${faturamento.cofins_percentual}%`}>
                            {formatCurrency(cofinsValor)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {faturamento.csll_percentual > 0 ? (
                          <span title={`${faturamento.csll_percentual}%`}>
                            {formatCurrency(csllValor)}
                          </span>
                        ) : '-'}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="text-right text-xs">
                      <span 
                        className="cursor-help"
                        title={`IRRF: ${formatCurrency(irrfValor)}\nPIS: ${formatCurrency(pisValor)}\nCOFINS: ${formatCurrency(cofinsValor)}\nCSLL: ${formatCurrency(csllValor)}`}
                      >
                        {totalRetencoes > 0 ? formatCurrency(totalRetencoes) : '-'}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="text-right">{formatCurrency(faturamento.valor_liquido)}</TableCell>
                  <TableCell>{getStatusBadge(faturamento.status, faturamento.data_vencimento)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        value={faturamento.link_nf || ''}
                        onChange={(e) => {
                          const newFaturamentos = faturamentos.map(f => 
                            f.id === faturamento.id ? { ...f, link_nf: e.target.value } : f
                          );
                          setFaturamentos(newFaturamentos);
                        }}
                        onBlur={() => handleUpdateNF(faturamento.id, faturamento.numero_nf || '', faturamento.link_nf || '')}
                        placeholder="Link"
                        className="w-20 h-8"
                      />
                      {faturamento.link_nf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(faturamento.link_nf!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(faturamento)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );})
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
        />
      </Card>

      <FaturamentoDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        faturamento={selectedFaturamento}
      />
    </div>
  );
}
