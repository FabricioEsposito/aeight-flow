import React, { useState, useEffect } from 'react';
import { Search, Filter, BarChart3, Download, TrendingUp, TrendingDown, Plus, Calendar, CheckCircle, Copy, FileDown, FileSpreadsheet, FileCheck, FileX, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useExportReport } from '@/hooks/useExportReport';
import { NovoLancamentoDialog } from '@/components/financeiro/NovoLancamentoDialog';
import { ExtratoActionsDropdown } from '@/components/financeiro/ExtratoActionsDropdown';
import { ViewInfoDialog } from '@/components/financeiro/ViewInfoDialog';
import { EditParcelaDialog, EditParcelaData } from '@/components/financeiro/EditParcelaDialog';
import { SolicitarAjusteDialog } from '@/components/financeiro/SolicitarAjusteDialog';
import { PartialPaymentDialog } from '@/components/financeiro/PartialPaymentDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { DateTypeFilter, DateFilterType } from '@/components/financeiro/DateTypeFilter';
import { BatchActionsDialog } from '@/components/financeiro/BatchActionsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TablePagination } from '@/components/ui/table-pagination';
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
  parcela_id?: string | null;
  cliente_fornecedor?: string;
  numero_contrato?: string;
  servicos_contrato?: string[] | null;
  servicos_detalhes?: Array<{ codigo: string; nome: string }>;
  importancia_contrato?: string;
  centro_custo?: string;
  plano_conta_id?: string;
  conta_bancaria_id?: string;
  valor_original?: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  data_recebimento?: string;
  data_pagamento?: string;
  numero_nf?: string | null;
  link_nf?: string | null;
  link_boleto?: string | null;
}

export default function Extrato() {
  const [lancamentos, setLancamentos] = useState<LancamentoExtrato[]>([]);
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: string; descricao: string; banco: string; saldo_atual: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [contaBancariaFilter, setContaBancariaFilter] = useState<string>('todas');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('hoje');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('vencimento');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [novoLancamentoOpen, setNovoLancamentoOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [solicitarAjusteDialogOpen, setSolicitarAjusteDialogOpen] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState<'change-date' | 'mark-paid' | 'clone' | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [partialPaymentDialogOpen, setPartialPaymentDialogOpen] = useState(false);
  const [lancamentoToDelete, setLancamentoToDelete] = useState<LancamentoExtrato | null>(null);
  const [statusChangeData, setStatusChangeData] = useState<{ lancamento: LancamentoExtrato; newStatus: string } | null>(null);
  const [partialPaymentLancamento, setPartialPaymentLancamento] = useState<LancamentoExtrato | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const { exportToPDF, exportToExcel } = useExportReport();

  const formatCurrencyExport = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateExport = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getDateRangeLabel = () => {
    const dateRange = getDateRange();
    if (!dateRange) return 'Todo período';
    return `${dateRange.start} - ${dateRange.end}`;
  };

  const exportColumns = [
    { header: 'Data Vencimento', accessor: (row: LancamentoExtrato) => row.data_vencimento, type: 'date' as const },
    { header: 'Data Competência', accessor: (row: LancamentoExtrato) => row.data_competencia, type: 'date' as const },
    { header: 'Data Movimentação', accessor: (row: LancamentoExtrato) => row.data_recebimento || row.data_pagamento || '', type: 'date' as const },
    { header: 'Tipo', accessor: (row: LancamentoExtrato) => row.tipo === 'entrada' ? 'Entrada' : 'Saída' },
    { header: 'Cliente/Fornecedor', accessor: (row: LancamentoExtrato) => row.cliente_fornecedor || '-' },
    { header: 'Descrição', accessor: 'descricao' },
    { header: 'Valor', accessor: (row: LancamentoExtrato) => row.valor, type: 'currency' as const },
    { header: 'Status', accessor: (row: LancamentoExtrato) => {
      const status = getDisplayStatus(row);
      if (status === 'recebido') return 'Recebido';
      if (status === 'pago') return 'Pago';
      if (status === 'vencido') return 'Vencido';
      return 'Em dia';
    }},
  ];

  const handleExportPDF = () => {
    exportToPDF({
      title: 'Relatório de Extrato e Conciliação',
      filename: `extrato-${format(new Date(), 'yyyy-MM-dd')}`,
      columns: exportColumns,
      data: filteredLancamentos,
      dateRange: getDateRangeLabel(),
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Extrato e Conciliação',
      filename: `extrato-${format(new Date(), 'yyyy-MM-dd')}`,
      columns: exportColumns,
      data: filteredLancamentos,
      dateRange: getDateRangeLabel(),
    });
  };

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
          clientes:cliente_id (razao_social, nome_fantasia, cnpj_cpf),
          parcelas_contrato:parcela_id (contratos:contrato_id(numero_contrato, servicos, importancia_cliente_fornecedor, status, data_reativacao))
        `)
        .order('data_vencimento', { ascending: true });

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
          fornecedores:fornecedor_id (razao_social, nome_fantasia, cnpj_cpf),
          parcelas_contrato:parcela_id (contratos:contrato_id(numero_contrato, servicos, importancia_cliente_fornecedor, status, data_reativacao))
        `)
        .order('data_vencimento', { ascending: true });

      if (dateRange) {
        queryPagar = queryPagar.gte('data_vencimento', dateRange.start).lte('data_vencimento', dateRange.end);
      }

      const { data: dataPagar, error: errorPagar } = await queryPagar;
      if (errorPagar) throw errorPagar;

      // Filtrar parcelas de contratos inativos - Contas a Receber
      const dataReceberFiltrado = (dataReceber || []).filter((r: any) => {
        const contrato = r.parcelas_contrato?.contratos;
        if (!contrato) return true;
        if (contrato.status === 'ativo') {
          if (contrato.data_reativacao) {
            return r.data_vencimento >= contrato.data_reativacao;
          }
          return true;
        }
        return false;
      });

      // Buscar detalhes dos serviços para contas a receber
      const receberComServicos = await Promise.all(dataReceberFiltrado.map(async (r: any) => {
        const lancamento: any = {
          id: r.id,
          tipo: 'entrada' as const,
          valor: r.valor,
          data_vencimento: r.data_vencimento,
          data_competencia: r.data_competencia,
          descricao: r.descricao,
          status: r.status,
          origem: 'receber' as const,
          parcela_id: r.parcela_id,
          cliente_fornecedor: r.clientes?.nome_fantasia || r.clientes?.razao_social,
          numero_contrato: r.parcelas_contrato?.contratos?.numero_contrato,
          servicos_contrato: r.parcelas_contrato?.contratos?.servicos,
          importancia_contrato: r.parcelas_contrato?.contratos?.importancia_cliente_fornecedor,
          centro_custo: r.centro_custo,
          plano_conta_id: r.plano_conta_id,
          conta_bancaria_id: r.conta_bancaria_id,
          valor_original: r.valor_original,
          juros: r.juros,
          multa: r.multa,
          desconto: r.desconto,
          data_recebimento: r.data_recebimento,
          numero_nf: r.numero_nf,
          link_nf: r.link_nf,
          link_boleto: r.link_boleto,
        };

        if (r.parcelas_contrato?.contratos?.servicos && Array.isArray(r.parcelas_contrato.contratos.servicos) && r.parcelas_contrato.contratos.servicos.length > 0) {
          const { data: servicosData } = await supabase
            .from('servicos')
            .select('id, codigo, nome')
            .in('id', r.parcelas_contrato.contratos.servicos);
          
          if (servicosData) {
            lancamento.servicos_detalhes = servicosData;
          }
        }

        return lancamento;
      }));

      // Filtrar parcelas de contratos inativos - Contas a Pagar
      const dataPagarFiltrado = (dataPagar || []).filter((p: any) => {
        const contrato = p.parcelas_contrato?.contratos;
        if (!contrato) return true;
        if (contrato.status === 'ativo') {
          if (contrato.data_reativacao) {
            return p.data_vencimento >= contrato.data_reativacao;
          }
          return true;
        }
        return false;
      });

      // Buscar detalhes dos serviços para contas a pagar
      const pagarComServicos = await Promise.all(dataPagarFiltrado.map(async (p: any) => {
        const lancamento: any = {
          id: p.id,
          tipo: 'saida' as const,
          valor: p.valor,
          data_vencimento: p.data_vencimento,
          data_competencia: p.data_competencia,
          descricao: p.descricao,
          status: p.status,
          origem: 'pagar' as const,
          parcela_id: p.parcela_id,
          cliente_fornecedor: p.fornecedores?.nome_fantasia || p.fornecedores?.razao_social,
          numero_contrato: p.parcelas_contrato?.contratos?.numero_contrato,
          servicos_contrato: p.parcelas_contrato?.contratos?.servicos,
          importancia_contrato: p.parcelas_contrato?.contratos?.importancia_cliente_fornecedor,
          centro_custo: p.centro_custo,
          plano_conta_id: p.plano_conta_id,
          conta_bancaria_id: p.conta_bancaria_id,
          valor_original: p.valor_original,
          juros: p.juros,
          multa: p.multa,
          desconto: p.desconto,
          data_pagamento: p.data_pagamento,
          link_nf: p.link_nf,
          link_boleto: p.link_boleto,
        };

        if (p.parcelas_contrato?.contratos?.servicos && Array.isArray(p.parcelas_contrato.contratos.servicos) && p.parcelas_contrato.contratos.servicos.length > 0) {
          const { data: servicosData } = await supabase
            .from('servicos')
            .select('id, codigo, nome')
            .in('id', p.parcelas_contrato.contratos.servicos);
          
          if (servicosData) {
            lancamento.servicos_detalhes = servicosData;
          }
        }

        return lancamento;
      }));

      // Buscar contas bancárias
      const { data: dataContas, error: errorContas } = await supabase
        .from('contas_bancarias')
        .select('id, descricao, banco, saldo_atual')
        .eq('status', 'ativo')
        .order('descricao');

      if (errorContas) throw errorContas;
      setContasBancarias(dataContas || []);

      const todosLancamentos = [...receberComServicos, ...pagarComServicos].sort(
        (a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
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

  const handleMarkAsPaidClick = (lancamento: LancamentoExtrato) => {
    setPartialPaymentLancamento(lancamento);
    setPartialPaymentDialogOpen(true);
  };

  const handleMarkAsOpenClick = (lancamento: LancamentoExtrato) => {
    setStatusChangeData({ lancamento, newStatus: 'pendente' });
    setStatusChangeDialogOpen(true);
  };

  const handlePartialPayment = async (data: {
    isPartial: boolean;
    paymentDate: string;
    paidAmount?: number;
    remainingDueDate?: string;
  }) => {
    if (!partialPaymentLancamento) return;

    try {
      const lancamento = partialPaymentLancamento;
      const table = lancamento.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
      const dateField = lancamento.origem === 'receber' ? 'data_recebimento' : 'data_pagamento';
      
      if (data.isPartial && data.paidAmount && data.remainingDueDate) {
        // Baixa parcial: atualizar o lançamento atual com valor parcial e criar novo para o residual
        const remainingAmount = lancamento.valor - data.paidAmount;
        
        // Buscar dados completos do lançamento
        const { data: fullData, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq('id', lancamento.id)
          .single();

        if (fetchError) throw fetchError;

        // Atualizar o lançamento atual com o valor pago
        const { error: updateError } = await supabase
          .from(table)
          .update({ 
            status: 'pago',
            valor: data.paidAmount,
            [dateField]: data.paymentDate
          })
          .eq('id', lancamento.id);

        if (updateError) throw updateError;

        // Criar novo lançamento para o valor residual
        const novoLancamento: any = { ...fullData };
        delete novoLancamento.id;
        delete novoLancamento.created_at;
        delete novoLancamento.updated_at;
        delete novoLancamento[dateField];
        delete novoLancamento.parcela_id; // Remove vínculo para permitir exclusão
        
        novoLancamento.valor = remainingAmount;
        novoLancamento.valor_original = remainingAmount;
        novoLancamento.data_vencimento = data.remainingDueDate;
        novoLancamento.data_vencimento_original = data.remainingDueDate;
        novoLancamento.status = 'pendente';
        novoLancamento.descricao = `${lancamento.descricao} (Residual)`;
        novoLancamento.juros = 0;
        novoLancamento.multa = 0;
        novoLancamento.desconto = 0;

        const { error: insertError } = await supabase
          .from(table)
          .insert(novoLancamento);

        if (insertError) throw insertError;

        toast({
          title: "Sucesso",
          description: `Baixa parcial realizada! Novo lançamento de valor residual criado.`,
        });
      } else {
        // Baixa total: apenas marcar como pago
        const { error } = await supabase
          .from(table)
          .update({ 
            status: 'pago',
            [dateField]: data.paymentDate
          })
          .eq('id', lancamento.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: lancamento.tipo === 'entrada' ? "Marcado como recebido!" : "Marcado como pago!",
        });
      }
      
      fetchLancamentos();
    } catch (error) {
      console.error('Erro ao processar baixa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a baixa.",
        variant: "destructive",
      });
    } finally {
      setPartialPaymentDialogOpen(false);
      setPartialPaymentLancamento(null);
    }
  };

  const handleMarkAsOpen = async () => {
    if (!statusChangeData) return;

    try {
      const { lancamento } = statusChangeData;
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
    } finally {
      setStatusChangeDialogOpen(false);
      setStatusChangeData(null);
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
      delete dadosClone.parcela_id; // Remove vínculo com contrato para permitir exclusão
      
      console.log('Clonando lançamento - parcela_id removido:', !dadosClone.parcela_id);
      
      const { error: insertError } = await supabase
        .from(table)
        .insert({
          ...dadosClone,
          status: 'pendente',
          parcela_id: null, // Garante que parcela_id seja null
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
    if (isAdmin) {
      setEditDialogOpen(true);
    } else {
      setSolicitarAjusteDialogOpen(true);
    }
  };

  const handleSaveEdit = async (data: EditParcelaData) => {
    if (!selectedLancamento) return;

    try {
      const table = selectedLancamento.cliente_id ? 'contas_receber' : 'contas_pagar';
      
      const updateData: any = {
        data_vencimento: data.data_vencimento,
        descricao: data.descricao,
        plano_conta_id: data.plano_conta_id,
        centro_custo: data.centro_custo,
        conta_bancaria_id: data.conta_bancaria_id,
        juros: data.juros,
        multa: data.multa,
        desconto: data.desconto,
        valor: data.valor_total,
      };
      
      // Adicionar link_nf e link_boleto apenas para contas a pagar
      if (!selectedLancamento.cliente_id) {
        updateData.link_nf = data.link_nf;
        updateData.link_boleto = data.link_boleto;
      }
      
      const { error } = await supabase
        .from(table)
        .update(updateData)
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

  // Funções de seleção em lote
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredLancamentos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLancamentos.map(l => l.id)));
    }
  };

  const handleBatchAction = async (data?: any) => {
    if (!batchActionType) return;
    
    const selectedLancamentos = lancamentos.filter(l => selectedIds.has(l.id));
    
    try {
      if (batchActionType === 'change-date' && data?.newDate) {
        // Se não for admin, criar solicitações de ajuste
        if (!isAdmin) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Usuário não autenticado');

          // Criar uma solicitação para cada lançamento
          for (const lanc of selectedLancamentos) {
            await supabase
              .from('solicitacoes_ajuste_financeiro')
              .insert({
                tipo_lancamento: lanc.origem === 'receber' ? 'receber' : 'pagar',
                lancamento_id: lanc.id,
                data_vencimento_atual: lanc.data_vencimento,
                data_vencimento_solicitada: data.newDate,
                solicitante_id: user.id,
                motivo_solicitacao: 'Alteração em lote de data de vencimento',
                status: 'pendente',
                valor_original: lanc.valor || 0,
                juros_atual: lanc.juros || 0,
                juros_solicitado: lanc.juros || 0,
                multa_atual: lanc.multa || 0,
                multa_solicitada: lanc.multa || 0,
                desconto_atual: lanc.desconto || 0,
                desconto_solicitado: lanc.desconto || 0,
                plano_conta_id: lanc.plano_conta_id || null,
                centro_custo: lanc.centro_custo || null,
                conta_bancaria_id: lanc.conta_bancaria_id || null,
              });
          }
          
          toast({
            title: "Solicitações enviadas",
            description: `${selectedLancamentos.length} solicitação(ões) de ajuste enviada(s) para aprovação do administrador`,
          });
        } else {
          // Admin pode executar diretamente
          for (const lanc of selectedLancamentos) {
            const table = lanc.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
            
            // Atualiza a conta a receber/pagar
            await supabase
              .from(table)
              .update({ data_vencimento: data.newDate })
              .eq('id', lanc.id);
            
            // Se tiver parcela_id, atualiza também a parcela do contrato
            if (lanc.parcela_id) {
              await supabase
                .from('parcelas_contrato')
                .update({ data_vencimento: data.newDate })
                .eq('id', lanc.parcela_id);
            }
          }
          toast({
            title: "Sucesso",
            description: `Data de vencimento alterada para ${selectedLancamentos.length} lançamento(s)!`,
          });
        }
      } else if (batchActionType === 'mark-paid') {
        // Verifica se todos os lançamentos selecionados já estão pagos
        const allPaid = selectedLancamentos.every(l => l.status === 'pago');
        const paymentDate = data?.paymentDate || format(new Date(), 'yyyy-MM-dd');
        
        for (const lanc of selectedLancamentos) {
          const table = lanc.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
          const dateField = lanc.origem === 'receber' ? 'data_recebimento' : 'data_pagamento';
          
          if (allPaid) {
            // Reverte para pendente
            await supabase
              .from(table)
              .update({ 
                status: 'pendente',
                [dateField]: null
              })
              .eq('id', lanc.id);
            
            // Se tiver parcela_id, atualiza também a parcela do contrato
            if (lanc.parcela_id) {
              await supabase
                .from('parcelas_contrato')
                .update({ status: 'pendente' })
                .eq('id', lanc.parcela_id);
            }
          } else {
            // Marca como pago usando a data fornecida
            await supabase
              .from(table)
              .update({ 
                status: 'pago',
                [dateField]: paymentDate
              })
              .eq('id', lanc.id);
            
            // Se tiver parcela_id, atualiza também a parcela do contrato
            if (lanc.parcela_id) {
              await supabase
                .from('parcelas_contrato')
                .update({ status: 'pago' })
                .eq('id', lanc.parcela_id);
            }
          }
        }
        toast({
          title: "Sucesso",
          description: allPaid 
            ? `${selectedLancamentos.length} lançamento(s) voltado(s) para em aberto!`
            : `${selectedLancamentos.length} lançamento(s) marcado(s) como pago/recebido!`,
        });
      } else if (batchActionType === 'clone') {
        for (const lanc of selectedLancamentos) {
          const table = lanc.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
          const { data: originalData, error: fetchError } = await supabase
            .from(table)
            .select('*')
            .eq('id', lanc.id)
            .single();

          if (!fetchError && originalData) {
            const cloneData: any = { ...originalData };
            delete cloneData.id;
            delete cloneData.created_at;
            delete cloneData.updated_at;
            delete cloneData.data_recebimento;
            delete cloneData.data_pagamento;
            delete cloneData.parcela_id; // Remove vínculo com contrato para permitir exclusão
            
            await supabase
              .from(table)
              .insert({
                ...cloneData,
                status: 'pendente',
                parcela_id: null, // Garante que parcela_id seja null
              });
          }
        }
        toast({
          title: "Sucesso",
          description: `${selectedLancamentos.length} lançamento(s) clonado(s)!`,
        });
      }
      
      setSelectedIds(new Set());
      setBatchDialogOpen(false);
      fetchLancamentos();
    } catch (error) {
      console.error('Erro na ação em lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir a ação em lote.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = (lancamento: LancamentoExtrato) => {
    setLancamentoToDelete(lancamento);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!lancamentoToDelete) return;

    try {
      const table = lancamentoToDelete.origem === 'receber' ? 'contas_receber' : 'contas_pagar';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', lancamentoToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso!",
      });
      fetchLancamentos();
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lançamento.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setLancamentoToDelete(null);
    }
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
    
    const displayStatus = getDisplayStatus(lanc);
    const matchesStatus = statusFilter === 'todos' || 
                         (statusFilter === 'pago' && (displayStatus === 'pago' || displayStatus === 'recebido')) ||
                         (statusFilter === 'vencido' && displayStatus === 'vencido') ||
                         (statusFilter === 'em dia' && displayStatus === 'em dia');
    
    const matchesConta = contaBancariaFilter === 'todas' || 
                        lanc.conta_bancaria_id === contaBancariaFilter;

    let matchesDate = true;
    const dateRange = getDateRange();
    if (dateRange) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      let dateToCheck: Date | null = null;

      if (dateFilterType === 'vencimento') {
        dateToCheck = new Date(lanc.data_vencimento);
      } else if (dateFilterType === 'competencia') {
        dateToCheck = new Date(lanc.data_competencia);
      } else if (dateFilterType === 'movimento') {
        const movDate = lanc.data_recebimento || lanc.data_pagamento;
        if (movDate) {
          dateToCheck = new Date(movDate);
        } else {
          return false;
        }
      }

      if (dateToCheck) {
        matchesDate = dateToCheck >= startDate && dateToCheck <= endDate;
      }
    }

    return matchesSearch && matchesTipo && matchesStatus && matchesConta && matchesDate;
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

  // Cálculos para resumo - baseado em filteredLancamentos para respeitar o período selecionado
  const saldoContas = contasBancarias.reduce((acc, conta) => acc + conta.saldo_atual, 0);
  
  // Considerar todos os lançamentos pendentes dentro do período filtrado
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const totalReceber = filteredLancamentos
    .filter(l => l.tipo === 'entrada' && l.status === 'pendente')
    .reduce((acc, l) => acc + l.valor, 0);

  const totalPagar = filteredLancamentos
    .filter(l => l.tipo === 'saida' && l.status === 'pendente')
    .reduce((acc, l) => acc + l.valor, 0);

  const saldoFinal = saldoContas + totalReceber - totalPagar;

  const lancamentosPendentes = filteredLancamentos.filter(l => l.status === 'pendente').length;

  // Paginação
  const totalItems = filteredLancamentos.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLancamentos = filteredLancamentos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set()); // Limpa seleção ao mudar de página
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Volta para primeira página
    setSelectedIds(new Set()); // Limpa seleção
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
          <h1 className="text-3xl font-bold text-foreground">Extrato e Conciliação</h1>
          <p className="text-muted-foreground">Visualize e gerencie seus lançamentos financeiros</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setNovoLancamentoOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Lançamento
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar Excel (.xls)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <SelectItem value="pago">Pago/Recebido</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="em dia">Em dia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.size} lançamento(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBatchActionType('change-date');
                    setBatchDialogOpen(true);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Alterar Data
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBatchActionType('mark-paid');
                    setBatchDialogOpen(true);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {lancamentos.filter(l => selectedIds.has(l.id)).every(l => l.status === 'pago')
                    ? 'Voltar para Em Aberto'
                    : 'Marcar como Pago'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBatchActionType('clone');
                    setBatchDialogOpen(true);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Clonar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={paginatedLancamentos.length > 0 && paginatedLancamentos.every(l => selectedIds.has(l.id))}
                    onCheckedChange={handleToggleSelectAll}
                  />
                </TableHead>
                <TableHead>Data de Vencimento</TableHead>
                <TableHead>Data da Movimentação</TableHead>
                <TableHead>Cliente/Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Serviço / Importância</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="text-right">Saldo (R$)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLancamentos.map((lanc, index) => {
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
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lanc.id)}
                        onCheckedChange={() => handleToggleSelect(lanc.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{formatDate(lanc.data_vencimento)}</TableCell>
                    <TableCell className="font-medium">
                      {lanc.status === 'pago' 
                        ? formatDate(lanc.origem === 'receber' ? lanc.data_recebimento || '' : lanc.data_pagamento || '')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {lanc.cliente_fornecedor || '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lanc.descricao}</p>
                        {lanc.numero_contrato && (
                          <p className="text-xs text-muted-foreground">Contrato: {lanc.numero_contrato}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lanc.origem === 'receber' && lanc.numero_nf ? lanc.numero_nf : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lanc.link_nf ? (
                          <a 
                            href={lanc.link_nf} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                            title="Ver NF"
                          >
                            <FileCheck className="w-4 h-4" />
                            <span className="text-xs">NF</span>
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground" title="NF não anexada">
                            <FileX className="w-4 h-4" />
                            <span className="text-xs">NF</span>
                          </span>
                        )}
                        {lanc.link_boleto ? (
                          <a 
                            href={lanc.link_boleto} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                            title="Ver Boleto"
                          >
                            <FileCheck className="w-4 h-4" />
                            <span className="text-xs">Bol</span>
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground" title="Boleto não anexado">
                            <FileX className="w-4 h-4" />
                            <span className="text-xs">Bol</span>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {lanc.servicos_detalhes && lanc.servicos_detalhes.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {lanc.servicos_detalhes.map(s => `${s.codigo} - ${s.nome}`).join(', ')}
                          </span>
                        )}
                        {lanc.importancia_contrato && (
                          <Badge variant="secondary" className="w-fit text-xs">
                            {lanc.importancia_contrato === 'importante' ? 'Importante' : 
                             lanc.importancia_contrato === 'mediano' ? 'Mediano' : 'Não Importante'}
                          </Badge>
                        )}
                        {!lanc.servicos_detalhes && !lanc.importancia_contrato && '-'}
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
                        isAvulso={!lanc.parcela_id}
                        onEdit={() => handleEdit(lanc)}
                      onMarkAsPaid={() => handleMarkAsPaidClick(lanc)}
                      onMarkAsOpen={() => handleMarkAsOpenClick(lanc)}
                        onView={() => handleView(lanc)}
                        onClone={() => handleClone(lanc)}
                        onDelete={!lanc.parcela_id ? () => handleDeleteConfirm(lanc) : undefined}
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

        {filteredLancamentos.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
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
      />

      <SolicitarAjusteDialog 
        open={solicitarAjusteDialogOpen}
        onOpenChange={setSolicitarAjusteDialogOpen}
        onSuccess={fetchLancamentos}
        lancamentoId={selectedLancamento?.id || ''}
        tipoLancamento={selectedLancamento?.origem || 'receber'}
        tipo={selectedLancamento?.tipo || 'entrada'}
        initialData={selectedLancamento ? {
          data_vencimento: selectedLancamento.data_vencimento,
          descricao: selectedLancamento.descricao,
          valor: selectedLancamento.valor_original || selectedLancamento.valor,
          juros: selectedLancamento.juros || 0,
          multa: selectedLancamento.multa || 0,
          desconto: selectedLancamento.desconto || 0,
          conta_bancaria_id: selectedLancamento.conta_bancaria_id || '',
          plano_conta_id: selectedLancamento.plano_conta_id,
          centro_custo: selectedLancamento.centro_custo,
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

      <BatchActionsDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        selectedCount={selectedIds.size}
        actionType={batchActionType}
        onConfirm={handleBatchAction}
        tipo={lancamentos.find(l => selectedIds.has(l.id))?.tipo}
        allPaid={
          batchActionType === 'mark-paid' &&
          lancamentos.filter(l => selectedIds.has(l.id)).every(l => l.status === 'pago')
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
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
              Tem certeza que deseja marcar este lançamento como pendente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsOpen}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PartialPaymentDialog
        open={partialPaymentDialogOpen}
        onOpenChange={setPartialPaymentDialogOpen}
        tipo={partialPaymentLancamento?.tipo || 'entrada'}
        valorTotal={partialPaymentLancamento?.valor || 0}
        onConfirm={handlePartialPayment}
      />
    </div>
  );
}