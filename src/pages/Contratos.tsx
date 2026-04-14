import { useState, useEffect } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Download } from 'lucide-react';
import { useExportReport } from '@/hooks/useExportReport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContratosTable } from '@/components/contratos/ContratosTable';
import { ReativarContratoDialog } from '@/components/contratos/ReativarContratoDialog';
import { BatchEditContratosDialog } from '@/components/contratos/BatchEditContratosDialog';
import { InativarContratoDialog } from '@/components/contratos/InativarContratoDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { TablePagination } from '@/components/ui/table-pagination';
import { CentroCustoFilterSelect } from '@/components/financeiro/CentroCustoFilterSelect';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, format } from 'date-fns';
import { useContextualTutorial } from '@/hooks/useContextualTutorial';

interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
}

interface PlanoContas {
  id: string;
  codigo: string;
  descricao: string;
}

interface Contrato {
  id: string;
  numero_contrato: string;
  tipo_contrato: 'venda' | 'compra';
  data_inicio: string;
  valor_total: number;
  valor_bruto?: number;
  quantidade?: number;
  valor_unitario?: number;
  status: string;
  centro_custo?: string;
  recorrente?: boolean;
  periodo_recorrencia?: string;
  clientes?: { razao_social: string; nome_fantasia: string | null; cnpj_cpf: string };
  fornecedores?: { razao_social: string; nome_fantasia: string | null; cnpj_cpf: string };
  plano_contas?: PlanoContas;
  tem_go_live?: boolean;
  centro_custo_info?: CentroCusto;
}

export default function Contratos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exportToExcel } = useExportReport();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useSessionState<string>('contratos', 'search', '');
  const [filterType, setFilterType] = useSessionState<string>('contratos', 'type', 'todos');
  const [filterGoLive, setFilterGoLive] = useSessionState<string>('contratos', 'goLive', 'todos');
  const [filterCentroCusto, setFilterCentroCusto] = useSessionState<string[]>('contratos', 'centroCusto', []);
  const [datePreset, setDatePreset] = useSessionState<DateRangePreset>('contratos', 'datePreset', 'todo-periodo');
  const [customDateRange, setCustomDateRange] = useSessionState<{ from: Date | undefined; to: Date | undefined }>('contratos', 'customDateRange', undefined as any);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchEditOpen, setBatchEditOpen] = useState(false);

  const fetchCentrosCusto = async () => {
    const { data } = await supabase
      .from('centros_custo')
      .select('id, codigo, descricao')
      .eq('status', 'ativo');
    setCentrosCusto(data || []);
  };

  const fetchContratos = async () => {
    try {
        const { data, error } = await supabase
        .from('contratos')
        .select(`
          *,
          clientes:cliente_id (razao_social, nome_fantasia, cnpj_cpf),
          fornecedores:fornecedor_id (razao_social, nome_fantasia, cnpj_cpf),
          plano_contas:plano_contas_id (id, codigo, descricao),
          parcelas_contrato (
            id,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setContratos((data || []) as Contrato[]);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os contratos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentrosCusto();
    fetchContratos();
  }, []);

  // Mapear centro de custo para cada contrato
  const contratosComCentroCusto = contratos.map(contrato => {
    const centroCustoInfo = centrosCusto.find(cc => cc.id === contrato.centro_custo);
    const temGoLive = (contrato as any).parcelas_contrato?.some(
      (parcela: any) => parcela.status === 'aguardando_conclusao'
    ) || false;
    return {
      ...contrato,
      centro_custo_info: centroCustoInfo,
      tem_go_live: temGoLive
    };
  });

  const handleView = (id: string) => {
    navigate(`/contratos/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/contratos/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Contrato excluído com sucesso!",
      });
      fetchContratos();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o contrato.",
        variant: "destructive",
      });
    }
  };

  const [inativarDialogOpen, setInativarDialogOpen] = useState(false);
  const [contratoParaInativar, setContratoParaInativar] = useState<{ id: string; numero: string } | null>(null);

  const handleInactivateClick = (id: string, numeroContrato: string) => {
    setContratoParaInativar({ id, numero: numeroContrato });
    setInativarDialogOpen(true);
  };

  const handleInactivate = async (dataInativacao: Date) => {
    if (!contratoParaInativar) return;
    
    const id = contratoParaInativar.id;
    const dataInativacaoStr = format(dataInativacao, 'yyyy-MM-dd');
    
    try {
      // 1. Buscar parcelas pendentes do contrato com vencimento >= data de inativação
      const { data: parcelas } = await supabase
        .from('parcelas_contrato')
        .select('id, tipo')
        .eq('contrato_id', id)
        .in('status', ['pendente', 'vencido'])
        .gte('data_vencimento', dataInativacaoStr);

      if (parcelas && parcelas.length > 0) {
        const parcelaIds = parcelas.map(p => p.id);

        // 2. Cancelar contas a receber vinculadas às parcelas com vencimento >= data de inativação
        const { error: errorReceber } = await supabase
          .from('contas_receber')
          .update({ status: 'cancelado' })
          .in('parcela_id', parcelaIds)
          .in('status', ['pendente', 'vencido']);

        if (errorReceber) console.error('Erro ao cancelar contas a receber:', errorReceber);

        // 3. Cancelar contas a pagar vinculadas às parcelas com vencimento >= data de inativação
        const { error: errorPagar } = await supabase
          .from('contas_pagar')
          .update({ status: 'cancelado' })
          .in('parcela_id', parcelaIds)
          .in('status', ['pendente', 'vencido']);

        if (errorPagar) console.error('Erro ao cancelar contas a pagar:', errorPagar);

        // 4. Cancelar as parcelas
        const { error: errorParcelas } = await supabase
          .from('parcelas_contrato')
          .update({ status: 'cancelado' })
          .in('id', parcelaIds);

        if (errorParcelas) console.error('Erro ao cancelar parcelas:', errorParcelas);
      }

      // 5. Inativar o contrato
      const { error } = await supabase
        .from('contratos')
        .update({ status: 'inativo', data_reativacao: null })
        .eq('id', id);

      if (error) throw error;

      const parcelasCount = parcelas?.length || 0;
      toast({
        title: "Sucesso",
        description: `Contrato inativado! ${parcelasCount} parcela(s) a partir de ${format(dataInativacao, 'dd/MM/yyyy')} foram canceladas.`,
      });
      fetchContratos();
      setContratoParaInativar(null);
    } catch (error) {
      console.error('Erro ao inativar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível inativar o contrato.",
        variant: "destructive",
      });
    }
  };

  const [reativarDialogOpen, setReativarDialogOpen] = useState(false);
  const [contratoParaReativar, setContratoParaReativar] = useState<{ id: string; numero: string } | null>(null);

  const handleReactivateClick = (id: string, numeroContrato: string) => {
    setContratoParaReativar({ id, numero: numeroContrato });
    setReativarDialogOpen(true);
  };

  const handleReactivate = async (dataReativacao: string) => {
    if (!contratoParaReativar) return;

    try {
      const { error } = await supabase
        .from('contratos')
        .update({ status: 'ativo', data_reativacao: dataReativacao })
        .eq('id', contratoParaReativar.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Contrato reativado com sucesso!",
      });
      fetchContratos();
      setContratoParaReativar(null);
    } catch (error) {
      console.error('Erro ao reativar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reativar o contrato.",
        variant: "destructive",
      });
    }
  };

  const getDateRange = () => {
    const today = new Date();
    
    switch (datePreset) {
      case 'todo-periodo':
        return undefined;
      case 'hoje':
        return { from: startOfDay(today), to: endOfDay(today) };
      case 'esta-semana':
        return { from: startOfWeek(today, { weekStartsOn: 0 }), to: endOfWeek(today, { weekStartsOn: 0 }) };
      case 'este-mes':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'este-ano':
        return { from: startOfYear(today), to: endOfYear(today) };
      case 'ultimos-30-dias':
        return { from: subDays(today, 30), to: today };
      case 'ultimos-12-meses':
        return { from: subMonths(today, 12), to: today };
      case 'periodo-personalizado':
        return customDateRange;
      default:
        return undefined;
    }
  };

  const filteredContratos = contratosComCentroCusto.filter(contrato => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      contrato.numero_contrato.toLowerCase().includes(searchLower) ||
      (contrato.clientes?.razao_social || '').toLowerCase().includes(searchLower) ||
      (contrato.clientes?.nome_fantasia || '').toLowerCase().includes(searchLower) ||
      (contrato.fornecedores?.razao_social || '').toLowerCase().includes(searchLower) ||
      (contrato.fornecedores?.nome_fantasia || '').toLowerCase().includes(searchLower) ||
      (contrato.plano_contas?.descricao || '').toLowerCase().includes(searchLower) ||
      (contrato.plano_contas?.codigo || '').toLowerCase().includes(searchLower);
    
    const matchesType = filterType === 'todos' || contrato.tipo_contrato === filterType;
    
    const matchesGoLive = 
      filterGoLive === 'todos' || 
      (filterGoLive === 'com-go-live' && contrato.tem_go_live) ||
      (filterGoLive === 'sem-go-live' && !contrato.tem_go_live);

    const matchesCentroCusto = filterCentroCusto.length === 0 || (!!contrato.centro_custo && filterCentroCusto.includes(contrato.centro_custo));

    let matchesDate = true;
    const dateRange = getDateRange();
    if (dateRange?.from && dateRange?.to) {
      const dataInicio = new Date(contrato.data_inicio);
      matchesDate = dataInicio >= dateRange.from && dataInicio <= dateRange.to;
    }

    return matchesSearch && matchesType && matchesGoLive && matchesCentroCusto && matchesDate;
  }).sort((a, b) => {
    const nomeA = (a.clientes?.nome_fantasia || a.clientes?.razao_social || a.fornecedores?.nome_fantasia || a.fornecedores?.razao_social || '').toLowerCase();
    const nomeB = (b.clientes?.nome_fantasia || b.clientes?.razao_social || b.fornecedores?.nome_fantasia || b.fornecedores?.razao_social || '').toLowerCase();
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });

  // Paginação
  const totalItems = filteredContratos.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContratos = filteredContratos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Contratos',
      filename: 'contratos',
      columns: [
        { header: 'Data Início', accessor: 'data_inicio', type: 'date' },
        { header: 'Razão Social', accessor: (row: any) => row.tipo_contrato === 'venda' ? (row.clientes?.razao_social || '') : (row.fornecedores?.razao_social || '') },
        { header: 'Nome Fantasia', accessor: (row: any) => row.tipo_contrato === 'venda' ? (row.clientes?.nome_fantasia || '-') : (row.fornecedores?.nome_fantasia || '-') },
        { header: 'Nº Contrato', accessor: 'numero_contrato' },
        { header: 'Tipo', accessor: (row: any) => row.tipo_contrato === 'venda' ? 'Venda' : 'Compra' },
        { header: 'Recorrência', accessor: (row: any) => {
          if (!row.recorrente) return 'Avulso';
          switch (row.periodo_recorrencia) {
            case 'mensal': return 'Mensal';
            case 'trimestral': return 'Trimestral';
            case 'semestral': return 'Semestral';
            case 'anual': return 'Anual';
            default: return 'Recorrente';
          }
        }},
        { header: 'Centro de Custo', accessor: (row: any) => row.centro_custo_info ? `${row.centro_custo_info.codigo} - ${row.centro_custo_info.descricao}` : '-' },
        { header: 'Importância', accessor: (row: any) => {
          switch (row.importancia_cliente_fornecedor) {
            case 'importante': return 'Importante';
            case 'mediano': return 'Mediano';
            case 'nao_importante': return 'Não Importante';
            default: return 'Mediano';
          }
        }},
        { header: 'Valor Bruto', accessor: (row: any) => row.valor_bruto || (row.quantidade && row.valor_unitario ? row.quantidade * row.valor_unitario : row.valor_total), type: 'currency' },
        { header: 'Valor Líquido', accessor: 'valor_total', type: 'currency' },
        { header: 'Status', accessor: 'status' },
      ],
      data: filteredContratos,
    });
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Contratos</h1>
          <p className="text-muted-foreground">Gerencie seus contratos de venda e compra</p>
        </div>
        
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="outline" onClick={() => setBatchEditOpen(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar em Lote ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={() => navigate('/contratos/novo')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Contrato
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <DateRangeFilter
            value={datePreset}
            onChange={(preset, range) => {
              setDatePreset(preset);
              if (range) setCustomDateRange(range);
            }}
            customRange={customDateRange}
          />

          <CentroCustoFilterSelect
            value={filterCentroCusto}
            onValueChange={setFilterCentroCusto}
            placeholder="Centro de Custo"
            className="w-56"
          />

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por contrato, nome fantasia ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo de Contrato" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Contratos</SelectItem>
              <SelectItem value="venda">Contratos de Venda</SelectItem>
              <SelectItem value="compra">Contratos de Compra</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterGoLive} onValueChange={setFilterGoLive}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Go Live" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Contratos</SelectItem>
              <SelectItem value="com-go-live">Com Go Live</SelectItem>
              <SelectItem value="sem-go-live">Sem Go Live</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ContratosTable 
          contratos={paginatedContratos}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onInactivate={handleInactivateClick}
          onReactivate={handleReactivateClick}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        {filteredContratos.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </Card>

      <InativarContratoDialog
        open={inativarDialogOpen}
        onOpenChange={setInativarDialogOpen}
        onConfirm={handleInactivate}
        contratoNumero={contratoParaInativar?.numero}
      />

      <ReativarContratoDialog
        open={reativarDialogOpen}
        onOpenChange={setReativarDialogOpen}
        onConfirm={handleReactivate}
        contratoNumero={contratoParaReativar?.numero}
      />

      <BatchEditContratosDialog
        open={batchEditOpen}
        onOpenChange={setBatchEditOpen}
        selectedIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([]);
          fetchContratos();
        }}
      />
    </div>
  );
}