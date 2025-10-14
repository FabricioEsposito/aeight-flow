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
import { ActionsDropdown } from '@/components/financeiro/ActionsDropdown';
import { ViewInfoDialog } from '@/components/financeiro/ViewInfoDialog';
import { EditParcelaDialog, EditParcelaData } from '@/components/financeiro/EditParcelaDialog';
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
  data_vencimento: string;
  data_competencia: string;
  data_recebimento?: string;
  numero_nf?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  conta_bancaria_id?: string;
  clientes?: {
    razao_social: string;
  };
  contratos?: {
    numero: string;
  };
}

interface ContaBancaria {
  id: string;
  descricao: string;
}

interface PlanoContas {
  id: string;
  descricao: string;
}

export default function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('este-mes');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [contaBancariaFilter, setContaBancariaFilter] = useState<string>('todas');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaReceber | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_receber')
        .select(`
          *,
          clientes:cliente_id (
            razao_social
          ),
          parcelas_contrato:parcela_id (
            contrato_id,
            contratos:contrato_id (
              numero_contrato
            )
          )
        `)
        .order('data_vencimento');

      if (error) throw error;
      
      // Map data to include contract number from nested relationship
      const mappedData = (data || []).map((conta: any) => ({
        ...conta,
        contratos: conta.parcelas_contrato?.contratos ? {
          numero: conta.parcelas_contrato.contratos.numero_contrato
        } : null
      }));
      
      setContas(mappedData);
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
        .select('id, descricao')
        .eq('status', 'ativo')
        .order('descricao');

      if (error) throw error;
      setContasBancarias(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    }
  };

  const fetchPlanoContas = async () => {
    try {
      const { data, error } = await supabase
        .from('plano_contas')
        .select('id, descricao')
        .eq('status', 'ativo')
        .order('descricao');

      if (error) throw error;
      setPlanoContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar plano de contas:', error);
    }
  };

  useEffect(() => {
    fetchContas();
    fetchContasBancarias();
    fetchPlanoContas();
  }, []);

  const handleView = (conta: ContaReceber) => {
    setSelectedConta(conta);
    setViewDialogOpen(true);
  };

  const handleEdit = (conta: ContaReceber) => {
    setSelectedConta(conta);
    setEditDialogOpen(true);
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

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
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
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conta.clientes?.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'todos') {
      if (statusFilter === 'vencido') {
        const hoje = new Date();
        const vencimento = new Date(conta.data_vencimento);
        matchesStatus = vencimento < hoje && conta.status === 'pendente';
      } else {
        matchesStatus = conta.status === statusFilter;
      }
    }

    let matchesDate = true;
    const dateRange = getDateRange();
    if (dateRange?.from && dateRange?.to) {
      const vencimento = new Date(conta.data_vencimento);
      matchesDate = vencimento >= dateRange.from && vencimento <= dateRange.to;
    }

    let matchesContaBancaria = true;
    if (contaBancariaFilter !== 'todas') {
      matchesContaBancaria = conta.conta_bancaria_id === contaBancariaFilter;
    }

    return matchesSearch && matchesStatus && matchesDate && matchesContaBancaria;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Cálculos para resumo
  const totalPendente = contas
    .filter(c => c.status === 'pendente')
    .reduce((acc, c) => acc + c.valor, 0);

  const totalVencido = contas
    .filter(c => {
      const hoje = new Date();
      const vencimento = new Date(c.data_vencimento);
      return vencimento < hoje && c.status === 'pendente';
    })
    .reduce((acc, c) => acc + c.valor, 0);

  const totalRecebido = contas
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
              className="pl-10"
            />
          </div>

          <Select value={contaBancariaFilter} onValueChange={setContaBancariaFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Conta bancária" />
            </SelectTrigger>
            <SelectContent>
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
            <SelectContent>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Número NF</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium">
                    {conta.clientes?.razao_social || '-'}
                  </TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell>
                    {conta.contratos?.numero ? (
                      <Badge variant="outline">{conta.contratos.numero}</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-600">
                    {formatCurrency(conta.valor)}
                  </TableCell>
                  <TableCell>{formatDate(conta.data_vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(conta.status, conta.data_vencimento)}>
                      {getStatusLabel(conta.status, conta.data_vencimento)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {conta.numero_nf || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionsDropdown
                      status={conta.status}
                      onMarkAsPaid={() => handleToggleStatus(conta.id, 'pendente')}
                      onMarkAsOpen={() => handleToggleStatus(conta.id, 'pago')}
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
        initialData={selectedConta ? {
          id: selectedConta.id,
          data_vencimento: selectedConta.data_vencimento,
          descricao: selectedConta.descricao,
          plano_conta_id: selectedConta.clientes ? undefined : undefined,
          centro_custo: undefined,
          conta_bancaria_id: selectedConta.conta_bancaria_id,
          valor_original: selectedConta.valor,
        } : undefined}
        contasBancarias={contasBancarias}
        planoContas={planoContas}
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
    </div>
  );
}