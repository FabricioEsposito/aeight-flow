import React, { useState, useEffect } from 'react';
import { Search, Filter, BarChart3, Download, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NovoLancamentoDialog } from '@/components/financeiro/NovoLancamentoDialog';
import { ExtratoActionsDropdown } from '@/components/financeiro/ExtratoActionsDropdown';
import { ViewInfoDialog } from '@/components/financeiro/ViewInfoDialog';
import { EditParcelaDialog, EditParcelaData } from '@/components/financeiro/EditParcelaDialog';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { format } from 'date-fns';

interface LancamentoExtrato {
  id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data_vencimento: string;
  data_competencia: string;
  descricao: string;
  status: string;
  origem: 'receber' | 'pagar';
  cliente_fornecedor?: string;
  numero_contrato?: string;
  centro_custo?: string;
  plano_conta_id?: string;
  conta_bancaria_id?: string;
  valor_original?: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  data_recebimento?: string;
  data_pagamento?: string;
}

export default function Extrato() {
  const [lancamentos, setLancamentos] = useState<LancamentoExtrato[]>([]);
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: string; descricao: string; saldo_atual: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [contaBancariaFilter, setContaBancariaFilter] = useState<string>('todas');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('hoje');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [novoLancamentoOpen, setNovoLancamentoOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState<any>(null);
  const { toast } = useToast();

  const getDateRange = () => {
    const today = new Date();
    
    switch (datePreset) {
      case 'todo-periodo':
        return undefined;
      case 'hoje':
        return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'esta-semana': {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
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

  const fetchLancamentos = async () => {
    try {
      const dateRange = getDateRange();
      
      // Buscar contas a receber
      let queryReceber = supabase
        .from('contas_receber')
        .select(`
          *,
          clientes:cliente_id (razao_social, cnpj_cpf),
          parcelas_contrato:parcela_id (contratos:contrato_id(numero_contrato))
        `)
        .order('data_vencimento', { ascending: false });

      if (dateRange) {
        queryReceber = queryReceber.gte('data_vencimento', dateRange.start).lte('data_vencimento', dateRange.end);
      }

      const { data: dataReceber, error: errorReceber } = await queryReceber;
      if (errorReceber) throw errorReceber;

      // Buscar contas a pagar
      let queryPagar = supabase
        .from('contas_pagar')
        .select(`
          *,
          fornecedores:fornecedor_id (razao_social, cnpj_cpf),
          parcelas_contrato:parcela_id (contratos:contrato_id(numero_contrato))
        `)
        .order('data_vencimento', { ascending: false });

      if (dateRange) {
        queryPagar = queryPagar.gte('data_vencimento', dateRange.start).lte('data_vencimento', dateRange.end);
      }

      const { data: dataPagar, error: errorPagar } = await queryPagar;
      if (errorPagar) throw errorPagar;

      // Buscar contas bancárias
      const { data: dataContas, error: errorContas } = await supabase
        .from('contas_bancarias')
        .select('id, descricao, saldo_atual')
        .eq('status', 'ativo');

      if (errorContas) throw errorContas;
      setContasBancarias(dataContas || []);

      // Combinar e formatar os lançamentos
      const lancamentosReceber: LancamentoExtrato[] = (dataReceber || []).map((r: any) => ({
        id: r.id,
        tipo: 'entrada' as const,
        valor: r.valor,
        data_vencimento: r.data_vencimento,
        data_competencia: r.data_competencia,
        descricao: r.descricao,
        status: r.status,
        origem: 'receber' as const,
        cliente_fornecedor: r.clientes?.razao_social,
        numero_contrato: r.parcelas_contrato?.contratos?.numero_contrato,
        centro_custo: r.centro_custo,
        plano_conta_id: r.plano_conta_id,
        conta_bancaria_id: r.conta_bancaria_id,
        valor_original: r.valor_original,
        juros: r.juros,
        multa: r.multa,
        desconto: r.desconto,
        data_recebimento: r.data_recebimento,
      }));

      const lancamentosPagar: LancamentoExtrato[] = (dataPagar || []).map((p: any) => ({
        id: p.id,
        tipo: 'saida' as const,
        valor: p.valor,
        data_vencimento: p.data_vencimento,
        data_competencia: p.data_competencia,
        descricao: p.descricao,
        status: p.status,
        origem: 'pagar' as const,
        cliente_fornecedor: p.fornecedores?.razao_social,
        numero_contrato: p.parcelas_contrato?.contratos?.numero_contrato,
        centro_custo: p.centro_custo,
        plano_conta_id: p.plano_conta_id,
        conta_bancaria_id: p.conta_bancaria_id,
        valor_original: p.valor_original,
        juros: p.juros,
        multa: p.multa,
        desconto: p.desconto,
        data_pagamento: p.data_pagamento,
      }));

      const todosLancamentos = [...lancamentosReceber, ...lancamentosPagar].sort(
        (a, b) => new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()
      );

      setLancamentos(todosLancamentos);
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os lançamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLancamentos();
  }, [datePreset, customDateRange]);

  const handleMarkAsPaid = async (lancamento: LancamentoExtrato) => {
    try {
      const table = lancamento.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
      const dateField = lancamento.origem === 'receber' ? 'data_recebimento' : 'data_pagamento';
      
      const { error } = await supabase
        .from(table)
        .update({ 
          status: 'pago',
          [dateField]: format(new Date(), 'yyyy-MM-dd')
        })
        .eq('id', lancamento.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: lancamento.tipo === 'entrada' ? "Marcado como recebido!" : "Marcado como pago!",
      });
      fetchLancamentos();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsOpen = async (lancamento: LancamentoExtrato) => {
    try {
      const table = lancamento.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
      const dateField = lancamento.origem === 'receber' ? 'data_recebimento' : 'data_pagamento';
      
      const { error } = await supabase
        .from(table)
        .update({ 
          status: 'pendente',
          [dateField]: null
        })
        .eq('id', lancamento.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Voltado para em aberto!",
      });
      fetchLancamentos();
    } catch (error) {
      console.error('Erro ao marcar como aberto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const handleClone = async (lancamento: LancamentoExtrato) => {
    try {
      const table = lancamento.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
      
      // Buscar dados completos do lançamento
      const { data, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', lancamento.id)
        .single();

      if (fetchError) throw fetchError;

      // Criar novo lançamento sem campos de controle e com status pendente
      const dadosClone: any = { ...data };
      delete dadosClone.id;
      delete dadosClone.created_at;
      delete dadosClone.updated_at;
      delete dadosClone.data_recebimento;
      delete dadosClone.data_pagamento;
      
      const { error: insertError } = await supabase
        .from(table)
        .insert({
          ...dadosClone,
          status: 'pendente',
        });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Lançamento clonado com sucesso!",
      });
      fetchLancamentos();
    } catch (error) {
      console.error('Erro ao clonar lançamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível clonar o lançamento.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (lancamento: LancamentoExtrato) => {
    const table = lancamento.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', lancamento.id)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do lançamento.",
        variant: "destructive",
      });
      return;
    }

    setSelectedLancamento(data);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (data: EditParcelaData) => {
    if (!selectedLancamento) return;

    try {
      const table = selectedLancamento.cliente_id ? 'contas_receber' : 'contas_pagar';
      
      const { error } = await supabase
        .from(table)
        .update({
          data_vencimento: data.data_vencimento,
          descricao: data.descricao,
          plano_conta_id: data.plano_conta_id,
          centro_custo: data.centro_custo,
          conta_bancaria_id: data.conta_bancaria_id,
          juros: data.juros,
          multa: data.multa,
          desconto: data.desconto,
          valor: data.valor_total,
        })
        .eq('id', data.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lançamento atualizado!",
      });
      fetchLancamentos();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const handleView = async (lancamento: LancamentoExtrato) => {
    const table = lancamento.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
    
    const { data, error } = await supabase
      .from(table)
      .select(`
        *,
        ${lancamento.origem === 'receber' ? 'clientes:cliente_id (razao_social, cnpj_cpf)' : 'fornecedores:fornecedor_id (razao_social, cnpj_cpf)'}
      `)
      .eq('id', lancamento.id)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes.",
        variant: "destructive",
      });
      return;
    }

    setSelectedLancamento(data);
    setViewDialogOpen(true);
  };

  // Função para determinar o status de exibição
  const getDisplayStatus = (lanc: LancamentoExtrato) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVencimento = new Date(lanc.data_vencimento + 'T00:00:00');
    
    if (lanc.status === 'pago') {
      return lanc.tipo === 'entrada' ? 'recebido' : 'pago';
    }
    
    if (dataVencimento < hoje) {
      return 'vencido';
    }
    
    return 'em dia';
  };

  const filteredLancamentos = lancamentos.filter(lanc => {
    const matchesSearch = lanc.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lanc.cliente_fornecedor || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'todos' || lanc.tipo === tipoFilter;
    const matchesStatus = statusFilter === 'todos' || lanc.status === statusFilter;
    const matchesConta = contaBancariaFilter === 'todas' || 
                        lanc.conta_bancaria_id === contaBancariaFilter;

    return matchesSearch && matchesTipo && matchesStatus && matchesConta;
  });

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

  // Cálculos para resumo
  const saldoContas = contasBancarias.reduce((acc, conta) => acc + conta.saldo_atual, 0);
  
  // Considerar apenas lançamentos em dia (não vencidos) para o saldo previsto
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const totalReceber = filteredLancamentos
    .filter(l => {
      const dataVenc = new Date(l.data_vencimento + 'T00:00:00');
      return l.tipo === 'entrada' && l.status === 'pendente' && dataVenc >= hoje;
    })
    .reduce((acc, l) => acc + l.valor, 0);

  const totalPagar = filteredLancamentos
    .filter(l => {
      const dataVenc = new Date(l.data_vencimento + 'T00:00:00');
      return l.tipo === 'saida' && l.status === 'pendente' && dataVenc >= hoje;
    })
    .reduce((acc, l) => acc + l.valor, 0);

  const saldoFinal = saldoContas + totalReceber - totalPagar;

  const lancamentosPendentes = filteredLancamentos.filter(l => l.status === 'pendente').length;

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
          <h1 className="text-3xl font-bold text-foreground">Extrato e Conciliação</h1>
          <p className="text-muted-foreground">Visualize e gerencie seus lançamentos financeiros</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setNovoLancamentoOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Lançamento
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo em Contas</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(saldoContas)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">A Receber</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceber)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">A Pagar</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPagar)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Previsto</p>
              <p className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatCurrency(saldoFinal)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary" />
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
              placeholder="Buscar movimentações..."
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

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Em dia / Vencido</SelectItem>
              <SelectItem value="pago">Pago/Recebido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="text-right">Saldo (R$)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLancamentos.map((lanc, index) => {
                const displayStatus = getDisplayStatus(lanc);
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const dataVenc = new Date(lanc.data_vencimento + 'T00:00:00');
                const isVencido = displayStatus === 'vencido';
                
                // Calcular saldo acumulado considerando APENAS lançamentos pagos/recebidos
                const lancamentosAteAqui = filteredLancamentos.slice(0, index + 1);
                const saldoRealizado = saldoContas + 
                  lancamentosAteAqui.filter(l => l.status === 'pago' && l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0) -
                  lancamentosAteAqui.filter(l => l.status === 'pago' && l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);

                // Calcular saldo previsto (realizado + em dia)
                const saldoPrevisto = saldoRealizado +
                  lancamentosAteAqui.filter(l => {
                    const dataV = new Date(l.data_vencimento + 'T00:00:00');
                    return l.status === 'pendente' && dataV >= hoje && l.tipo === 'entrada';
                  }).reduce((acc, l) => acc + l.valor, 0) -
                  lancamentosAteAqui.filter(l => {
                    const dataV = new Date(l.data_vencimento + 'T00:00:00');
                    return l.status === 'pendente' && dataV >= hoje && l.tipo === 'saida';
                  }).reduce((acc, l) => acc + l.valor, 0);

                return (
                  <TableRow key={lanc.id}>
                    <TableCell className="font-medium">{formatDate(lanc.data_vencimento)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lanc.descricao}</p>
                        {lanc.cliente_fornecedor && (
                          <p className="text-xs text-muted-foreground">{lanc.cliente_fornecedor}</p>
                        )}
                        {lanc.numero_contrato && (
                          <p className="text-xs text-muted-foreground">Contrato: {lanc.numero_contrato}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        displayStatus === 'pago' || displayStatus === 'recebido' ? 'default' : 
                        displayStatus === 'vencido' ? 'destructive' : 
                        'secondary'
                      }>
                        {displayStatus === 'pago' ? 'Pago' : 
                         displayStatus === 'recebido' ? 'Recebido' : 
                         displayStatus === 'vencido' ? 'Vencido' :
                         'Em dia'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${lanc.tipo === 'entrada' ? 'text-emerald-600' : 'text-destructive'}`}>
                      {lanc.tipo === 'entrada' ? '+' : '-'} {formatCurrency(lanc.valor)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <div className="flex flex-col items-end">
                        {lanc.status === 'pago' ? (
                          <span>{formatCurrency(saldoRealizado)}</span>
                        ) : isVencido ? (
                          <span className="text-muted-foreground">{formatCurrency(saldoRealizado)}</span>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">Previsto:</span>
                            <span>{formatCurrency(saldoPrevisto)}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ExtratoActionsDropdown
                        tipo={lanc.tipo}
                        status={lanc.status}
                        onEdit={() => handleEdit(lanc)}
                        onMarkAsPaid={() => handleMarkAsPaid(lanc)}
                        onMarkAsOpen={() => handleMarkAsOpen(lanc)}
                        onView={() => handleView(lanc)}
                        onClone={() => handleClone(lanc)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredLancamentos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum lançamento encontrado no período.</p>
          </div>
        )}
      </Card>

      <NovoLancamentoDialog 
        open={novoLancamentoOpen}
        onOpenChange={setNovoLancamentoOpen}
        onSave={fetchLancamentos}
      />

      <ViewInfoDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        data={selectedLancamento}
        type={selectedLancamento?.cliente_id ? 'receber' : 'pagar'}
      />

      <EditParcelaDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
        tipo={selectedLancamento?.cliente_id ? 'entrada' : 'saida'}
        initialData={selectedLancamento}
        contasBancarias={contasBancarias}
      />
    </div>
  );
}