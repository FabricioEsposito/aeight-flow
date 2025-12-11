import React, { useState, useEffect } from 'react';
import { Plus, Search, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { DateTypeFilter, DateFilterType } from '@/components/financeiro/DateTypeFilter';
import { ActionsDropdown } from '@/components/financeiro/ActionsDropdown';
import { ViewInfoDialog } from '@/components/financeiro/ViewInfoDialog';
import { EditParcelaDialog, EditParcelaData } from '@/components/financeiro/EditParcelaDialog';
import { SolicitarAjusteDialog } from '@/components/financeiro/SolicitarAjusteDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { TablePagination } from '@/components/ui/table-pagination';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  valor_original?: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  data_vencimento: string;
  data_competencia: string;
  data_recebimento?: string;
  numero_nf?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  conta_bancaria_id?: string;
  plano_conta_id?: string;
  centro_custo?: string;
  clientes?: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj_cpf: string;
  };
  contratos?: {
    numero: string;
    servicos: string[] | null;
    importancia: string;
    servicos_detalhes?: Array<{ codigo: string; nome: string }>;
  };
}

interface ContaBancaria {
  id: string;
  descricao: string;
  banco: string;
}

interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
}

export default function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('hoje');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('vencimento');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [contaBancariaFilter, setContaBancariaFilter] = useState<string>('todas');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [solicitarAjusteDialogOpen, setSolicitarAjusteDialogOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaReceber | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<string | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{ id: string; currentStatus: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_receber')
        .select(`
          *,
          clientes:cliente_id (
            razao_social,
            nome_fantasia,
            cnpj_cpf
          ),
          parcelas_contrato:parcela_id (
            contrato_id,
            contratos:contrato_id (
              numero_contrato,
              servicos,
              importancia_cliente_fornecedor
            )
          )
        `)
        .order('data_vencimento');

      if (error) throw error;
      
      // Buscar detalhes dos serviços
      const contasComServicos = await Promise.all((data || []).map(async (conta: any) => {
        const contratos = conta.parcelas_contrato?.contratos ? {
          numero: conta.parcelas_contrato.contratos.numero_contrato,
          servicos: conta.parcelas_contrato.contratos.servicos,
          importancia: conta.parcelas_contrato.contratos.importancia_cliente_fornecedor,
          servicos_detalhes: [] as Array<{ codigo: string; nome: string }>
        } : null;

        if (contratos?.servicos && Array.isArray(contratos.servicos) && contratos.servicos.length > 0) {
          const { data: servicosData } = await supabase
            .from('servicos')
            .select('id, codigo, nome')
            .in('id', contratos.servicos);
          
          if (servicosData) {
            contratos.servicos_detalhes = servicosData;
          }
        }

        return {
          ...conta,
          contratos
        };
      }));
      
      setContas(contasComServicos as ContaReceber[]);
    } catch (error) {
      console.error('Erro ao buscar contas a receber:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas a receber.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContasBancarias = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('id, descricao, banco')
        .eq('status', 'ativo')
        .order('descricao');

      if (error) throw error;
      setContasBancarias(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    }
  };

  const fetchCentrosCusto = async () => {
    try {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('id, codigo, descricao')
        .eq('status', 'ativo')
        .order('codigo');

      if (error) throw error;
      setCentrosCusto(data || []);
    } catch (error) {
      console.error('Erro ao buscar centros de custo:', error);
    }
  };

  useEffect(() => {
    fetchContas();
    fetchContasBancarias();
    fetchCentrosCusto();
  }, []);

  const handleView = (conta: ContaReceber) => {
    setSelectedConta(conta);
    setViewDialogOpen(true);
  };

  const handleEdit = (conta: ContaReceber) => {
    setSelectedConta(conta);
    if (isAdmin) {
      setEditDialogOpen(true);
    } else {
      setSolicitarAjusteDialogOpen(true);
    }
  };

  const handleSaveEdit = async (data: EditParcelaData) => {
    try {
      const { error } = await supabase
        .from('contas_receber')
        .update({
          data_vencimento: data.data_vencimento,
          descricao: data.descricao,
          plano_conta_id: data.plano_conta_id,
          centro_custo: data.centro_custo,
          conta_bancaria_id: data.conta_bancaria_id,
          valor: data.valor_total,
          juros: data.juros,
          multa: data.multa,
          desconto: data.desconto,
          valor_original: data.valor_original,
        })
        .eq('id', data.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Parcela atualizada com sucesso!",
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a parcela.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = (id: string) => {
    setContaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!contaToDelete) return;

    try {
      const { error } = await supabase
        .from('contas_receber')
        .delete()
        .eq('id', contaToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Parcela excluída com sucesso!",
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao excluir parcela:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a parcela.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setContaToDelete(null);
    }
  };

  const handleToggleStatusClick = (id: string, currentStatus: string) => {
    setStatusChangeData({ id, currentStatus });
    setStatusChangeDialogOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!statusChangeData) return;

    try {
      const { id, currentStatus } = statusChangeData;
      const newStatus = currentStatus === 'pago' ? 'pendente' : 'pago';
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'pago') {
        updateData.data_recebimento = new Date().toISOString().split('T')[0];
      } else {
        updateData.data_recebimento = null;
      }

      const { error } = await supabase
        .from('contas_receber')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Status alterado para ${newStatus}!`,
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    } finally {
      setStatusChangeDialogOpen(false);
      setStatusChangeData(null);
    }
  };

  const getStatusVariant = (status: string, dataVencimento: string) => {
    if (status === 'pago') return 'default';
    if (status === 'cancelado') return 'destructive';
    
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    
    if (vencimento < hoje && status === 'pendente') {
      return 'destructive'; // Vencido
    }
    
    return 'secondary'; // Pendente
  };

  const getStatusLabel = (status: string, dataVencimento: string) => {
    if (status === 'pago') return 'Pago';
    if (status === 'cancelado') return 'Cancelado';
    
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    
    if (vencimento < hoje && status === 'pendente') {
      return 'Vencido';
    }
    
    return 'Pendente';
  };

  const getDateRange = () => {
    const today = new Date();
    
    switch (datePreset) {
      case 'todo-periodo':
        return undefined; // Não aplica filtro de data
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
        return { from: startOfMonth(today), to: endOfMonth(today) };
    }
  };

  const filteredContas = contas.filter(conta => {
    const clienteNome = conta.clientes?.nome_fantasia || conta.clientes?.razao_social || '';
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clienteNome.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'todos') {
      if (statusFilter === 'vencido') {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(conta.data_vencimento + 'T00:00:00');
        matchesStatus = vencimento < hoje && conta.status === 'pendente';
      } else {
        matchesStatus = conta.status === statusFilter;
      }
    }

    let matchesDate = true;
    const dateRange = getDateRange();
    if (dateRange?.from && dateRange?.to) {
      let dateToCheck: Date;
      
      if (dateFilterType === 'vencimento') {
        dateToCheck = new Date(conta.data_vencimento + 'T00:00:00');
      } else if (dateFilterType === 'competencia') {
        dateToCheck = new Date(conta.data_competencia + 'T00:00:00');
      } else { // movimento
        if (conta.data_recebimento) {
          dateToCheck = new Date(conta.data_recebimento + 'T00:00:00');
        } else {
          return false;
        }
      }
      
      matchesDate = dateToCheck >= dateRange.from && dateToCheck <= dateRange.to;
    }

    let matchesContaBancaria = true;
    if (contaBancariaFilter !== 'todas') {
      matchesContaBancaria = conta.conta_bancaria_id === contaBancariaFilter;
    }

    return matchesSearch && matchesStatus && matchesDate && matchesContaBancaria;
  });

  // Paginação
  const totalItems = filteredContas.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContas = filteredContas.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatCnpjCpf = (value: string) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  // Cálculos para resumo - baseado em filteredContas para respeitar o período selecionado
  const totalPendente = filteredContas
    .filter(c => c.status === 'pendente')
    .reduce((acc, c) => acc + c.valor, 0);

  const totalVencido = filteredContas
    .filter(c => {
      const hoje = new Date();
      const vencimento = new Date(c.data_vencimento);
      return vencimento < hoje && c.status === 'pendente';
    })
    .reduce((acc, c) => acc + c.valor, 0);

  const totalRecebido = filteredContas
    .filter(c => c.status === 'pago')
    .reduce((acc, c) => acc + c.valor, 0);

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
          <h1 className="text-3xl font-bold text-foreground">Contas a Receber</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e recebimentos</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pendente</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendente)}</p>
            </div>
            <Calendar className="w-8 h-8 text-amber-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vencido</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalVencido)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRecebido)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <DateTypeFilter
            value={dateFilterType}
            onChange={setDateFilterType}
          />

          <DateRangeFilter
            value={datePreset}
            onChange={(preset, range) => {
              setDatePreset(preset);
              if (range) setCustomDateRange(range);
            }}
            customRange={customDateRange}
          />

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por descrição ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>

          <Select value={contaBancariaFilter} onValueChange={setContaBancariaFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Conta bancária" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todas">Todas as contas</SelectItem>
              {contasBancarias.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data de Competência</TableHead>
                <TableHead>Data de Vencimento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Centro de Custos</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>{formatDate(conta.data_competencia)}</TableCell>
                  <TableCell>{formatDate(conta.data_vencimento)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {conta.clientes?.nome_fantasia || conta.clientes?.razao_social || '-'}
                      </span>
                      {conta.clientes?.cnpj_cpf && (
                        <span className="text-sm text-muted-foreground">
                          {formatCnpjCpf(conta.clientes.cnpj_cpf)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {conta.contratos ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">{conta.contratos.numero}</Badge>
                        {conta.contratos.servicos_detalhes && conta.contratos.servicos_detalhes.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {conta.contratos.servicos_detalhes.map(s => `${s.codigo} - ${s.nome}`).join(', ')}
                          </span>
                        )}
                        {conta.contratos.importancia && (
                          <Badge variant="secondary" className="w-fit text-xs">
                            {conta.contratos.importancia === 'importante' ? 'Importante' : 
                             conta.contratos.importancia === 'mediano' ? 'Mediano' : 'Não Importante'}
                          </Badge>
                        )}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell>
                    {conta.centro_custo ? (
                      (() => {
                        const cc = centrosCusto.find(c => c.id === conta.centro_custo);
                        return cc ? `${cc.codigo} - ${cc.descricao}` : conta.centro_custo;
                      })()
                    ) : '-'}
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-600">
                    {formatCurrency(conta.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(conta.status, conta.data_vencimento)}>
                      {getStatusLabel(conta.status, conta.data_vencimento)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionsDropdown
                      status={conta.status}
                      onMarkAsPaid={() => handleToggleStatusClick(conta.id, 'pendente')}
                      onMarkAsOpen={() => handleToggleStatusClick(conta.id, 'pago')}
                      onView={() => handleView(conta)}
                      onEdit={() => handleEdit(conta)}
                      onDelete={() => handleDeleteConfirm(conta.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredContas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta a receber encontrada.</p>
          </div>
        )}

        {filteredContas.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </Card>

      <ViewInfoDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        data={selectedConta}
        type="receber"
      />

      <EditParcelaDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
        tipo="entrada"
        initialData={selectedConta ? {
          id: selectedConta.id,
          data_vencimento: selectedConta.data_vencimento,
          descricao: selectedConta.descricao,
          plano_conta_id: selectedConta.plano_conta_id,
          centro_custo: selectedConta.centro_custo,
          conta_bancaria_id: selectedConta.conta_bancaria_id,
          valor_original: selectedConta.valor_original || selectedConta.valor,
          juros: selectedConta.juros,
          multa: selectedConta.multa,
          desconto: selectedConta.desconto,
        } : undefined}
        contasBancarias={contasBancarias}
      />

      <SolicitarAjusteDialog 
        open={solicitarAjusteDialogOpen}
        onOpenChange={setSolicitarAjusteDialogOpen}
        onSuccess={fetchContas}
        lancamentoId={selectedConta?.id || ''}
        tipoLancamento="receber"
        tipo="entrada"
        initialData={selectedConta ? {
          data_vencimento: selectedConta.data_vencimento,
          descricao: selectedConta.descricao,
          valor: selectedConta.valor_original || selectedConta.valor,
          juros: selectedConta.juros || 0,
          multa: selectedConta.multa || 0,
          desconto: selectedConta.desconto || 0,
          conta_bancaria_id: selectedConta.conta_bancaria_id || '',
          plano_conta_id: selectedConta.plano_conta_id,
          centro_custo: selectedConta.centro_custo,
        } : {
          data_vencimento: '',
          descricao: '',
          valor: 0,
          juros: 0,
          multa: 0,
          desconto: 0,
          conta_bancaria_id: '',
        }}
        contasBancarias={contasBancarias}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta parcela? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              {statusChangeData?.currentStatus === 'pago' 
                ? 'Tem certeza que deseja marcar esta parcela como pendente?' 
                : 'Tem certeza que deseja marcar esta parcela como recebida?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}