import React, { useState, useEffect } from 'react';
import { Search, Edit, CheckSquare, Mail, FileText, Loader2, Send, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TablePagination } from '@/components/ui/table-pagination';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditFolhaDialog } from './EditFolhaDialog';
import { EnviarHoleriteDialog } from './EnviarHoleriteDialog';
import { ImportarFolhaDialog } from './ImportarFolhaDialog';
import { useSessionState } from '@/hooks/useSessionState';
import { CentroCustoFilterSelect } from '@/components/financeiro/CentroCustoFilterSelect';
import { useUserRole } from '@/hooks/useUserRole';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CompanyTagWithPercent } from '@/components/centro-custos/CompanyBadge';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { CategoriaFilterSelect } from '@/components/financeiro/CategoriaFilterSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, endOfYear, subDays, subMonths, format,
  startOfDay, endOfDay
} from 'date-fns';

export interface FolhaParcelaRecord {
  parcela_id: string;
  contrato_id: string;
  fornecedor_id: string;
  fornecedor_razao_social: string;
  fornecedor_nome_fantasia: string | null;
  fornecedor_cnpj: string;
  data_vencimento: string;
  data_competencia: string | null;
  valor: number;
  status: string;
  centros_custo: Array<{ centro_custo_id: string; codigo: string; descricao: string; percentual: number }>;
  conta_pagar_id: string | null;
  folha_id: string | null;
  tipo_vinculo: string;
  salario_base: number;
  valor_liquido: number;
  folha_status: string;
  plano_contas_id: string | null;
  plano_contas_descricao: string;
  holerite_url: string | null;
  fornecedor_emails: string[];
}
const SALARIO_CLT_IDS = [
  '30a56eb0-cfba-4e09-9f43-bf3cd39873bc',
  'c1b3c1bf-c014-46f0-baa7-cdea1c3b0ac7',
];

export function FolhaPagamentoTab() {
  const { permissions } = useUserRole();
  const [records, setRecords] = useState<FolhaParcelaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useSessionState<string>('folha', 'search', '');
  const [statusFilter, setStatusFilter] = useSessionState<string>('folha', 'status', 'todos');
  const [selectedCentroCusto, setSelectedCentroCusto] = useSessionState<string[]>('folha', 'centroCusto', []);
  const [datePreset, setDatePreset] = useSessionState<DateRangePreset>('folha', 'datePreset', 'este-mes');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedCategoria, setSelectedCategoria] = useSessionState<string[]>('folha', 'categoria', []);
  const [categoriaOptions, setCategoriaOptions] = useState<Array<{ id: string; codigo: string; descricao: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FolhaParcelaRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState<'change-date' | 'change-status' | null>(null);
  const [batchNewStatus, setBatchNewStatus] = useState<string>('');
  const [batchDateValue, setBatchDateValue] = useState('');
  const [sendingHoleriteId, setSendingHoleriteId] = useState<string | null>(null);
  const [batchHoleriteDialogOpen, setBatchHoleriteDialogOpen] = useState(false);
  const [batchHoleriteSending, setBatchHoleriteSending] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  const getDateRange = (): { from: Date; to: Date } | null => {
    if (datePreset === 'todo-periodo') return null;
    if (datePreset === 'periodo-personalizado' && customDateRange.from && customDateRange.to) {
      return { from: startOfDay(customDateRange.from), to: endOfDay(customDateRange.to) };
    }
    const today = new Date();
    switch (datePreset) {
      case 'hoje': return { from: startOfDay(today), to: endOfDay(today) };
      case 'esta-semana': return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'este-mes': return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'este-ano': return { from: startOfYear(today), to: endOfYear(today) };
      case 'ultimos-30-dias': return { from: subDays(today, 30), to: today };
      case 'ultimos-12-meses': return { from: subMonths(today, 12), to: today };
      default: return { from: startOfMonth(today), to: endOfMonth(today) };
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);

      const range = getDateRange();
      const startDate = range ? format(range.from, 'yyyy-MM-dd') : '1900-01-01';
      const endDate = range ? format(range.to, 'yyyy-MM-dd') : '2100-12-31';

      // 1. Get parcelas from contracts with is_folha_funcionario = true
      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas_contrato')
        .select(`
          id, valor, data_vencimento, status, contrato_id,
          contratos!inner (
            id, fornecedor_id, is_folha_funcionario, plano_contas_id,
            fornecedores (razao_social, nome_fantasia, cnpj_cpf, email),
            plano_contas:plano_contas_id (id, codigo, descricao)
          )
        `)
        .eq('contratos.is_folha_funcionario', true)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate)
        .order('data_vencimento');

      if (parcelasError) throw parcelasError;
      if (!parcelas || parcelas.length === 0) {
        setRecords([]);
        return;
      }

      const contratoIds = [...new Set(parcelas.map((p: any) => p.contrato_id))];
      const parcelaIds = parcelas.map((p: any) => p.id);

      // 2. Fetch centros de custo rateio
      const { data: rateios } = await supabase
        .from('contratos_centros_custo')
        .select('contrato_id, centro_custo_id, percentual, centros_custo:centro_custo_id (codigo, descricao)')
        .in('contrato_id', contratoIds);

      // 3. Fetch contas_pagar linked
      const { data: contasPagar } = await supabase
        .from('contas_pagar')
        .select('id, parcela_id, status, data_competencia, data_pagamento')
        .in('parcela_id', parcelaIds);

      // 4. Fetch folha_pagamento linked to these parcelas
      const { data: folhas } = await supabase
        .from('folha_pagamento')
        .select('id, parcela_id, tipo_vinculo, salario_base, valor_liquido, status, holerite_url')
        .in('parcela_id', parcelaIds);

      const rateioMap = new Map<string, Array<{ centro_custo_id: string; codigo: string; descricao: string; percentual: number }>>();
      (rateios || []).forEach((r: any) => {
        if (!rateioMap.has(r.contrato_id)) rateioMap.set(r.contrato_id, []);
        rateioMap.get(r.contrato_id)!.push({
          centro_custo_id: r.centro_custo_id,
          codigo: r.centros_custo?.codigo || '',
          descricao: r.centros_custo?.descricao || '',
          percentual: r.percentual,
        });
      });

      const contaPagarMap = new Map<string, any>();
      (contasPagar || []).forEach((cp: any) => {
        if (cp.parcela_id) contaPagarMap.set(cp.parcela_id, cp);
      });

      const folhaMap = new Map<string, any>();
      (folhas || []).forEach((f: any) => {
        if (f.parcela_id) folhaMap.set(f.parcela_id, f);
      });

      const today = new Date().toISOString().split('T')[0];

      const formatted: FolhaParcelaRecord[] = parcelas.map((p: any) => {
        const contrato = p.contratos;
        const fornecedor = contrato?.fornecedores;
        const cp = contaPagarMap.get(p.id);
        const folha = folhaMap.get(p.id);

        let status = 'em_aberto';
        if (cp?.status === 'pago') {
          status = 'pago';
        } else if (p.data_vencimento < today && cp?.status !== 'pago') {
          status = 'vencido';
        }

        return {
          parcela_id: p.id,
          contrato_id: p.contrato_id,
          fornecedor_id: contrato?.fornecedor_id || '',
          fornecedor_razao_social: fornecedor?.razao_social || 'N/A',
          fornecedor_nome_fantasia: fornecedor?.nome_fantasia || null,
          fornecedor_cnpj: fornecedor?.cnpj_cpf || 'N/A',
          data_vencimento: p.data_vencimento,
          data_competencia: cp?.data_competencia || null,
          valor: Number(p.valor),
          status,
          centros_custo: rateioMap.get(p.contrato_id) || [],
          conta_pagar_id: cp?.id || null,
          folha_id: folha?.id || null,
          tipo_vinculo: folha?.tipo_vinculo || 'PJ',
          salario_base: Number(folha?.salario_base || p.valor),
          valor_liquido: Number(folha?.valor_liquido || p.valor),
          folha_status: folha?.status || 'pendente',
          plano_contas_id: contrato?.plano_contas_id || null,
          plano_contas_descricao: contrato?.plano_contas ? `${contrato.plano_contas.codigo} - ${contrato.plano_contas.descricao}` : '-',
          holerite_url: folha?.holerite_url || null,
          fornecedor_emails: (fornecedor?.email || []).filter((e: string) => e && e.trim() !== ''),
        };
      });

      // Build categoria options from records
      const catMap = new Map<string, { id: string; codigo: string; descricao: string }>();
      formatted.forEach(r => {
        if (r.plano_contas_id && !catMap.has(r.plano_contas_id)) {
          const parts = r.plano_contas_descricao.split(' - ');
          catMap.set(r.plano_contas_id, { id: r.plano_contas_id, codigo: parts[0] || '', descricao: parts.slice(1).join(' - ') || '' });
        }
      });
      setCategoriaOptions(Array.from(catMap.values()));
      setRecords(formatted);
    } catch (error) {
      console.error('Erro ao buscar folha:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar a folha de pagamento.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [datePreset, customDateRange]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCnpj = (value: string) => {
    if (!value) return 'N/A';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 14) return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return value;
  };

  const formatDateStr = (date: string | null) => {
    if (!date) return '-';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
      case 'vencido': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Vencido</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Em Aberto</Badge>;
    }
  };

  const getFolhaStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>;
      case 'processado': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processado</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>;
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.fornecedor_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fornecedor_nome_fantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fornecedor_cnpj.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || r.status === statusFilter;
    const matchesCentroCusto = selectedCentroCusto.length === 0 ||
      r.centros_custo.some(cc => selectedCentroCusto.includes(cc.centro_custo_id));
    const matchesCategoria = selectedCategoria.length === 0 || (r.plano_contas_id && selectedCategoria.includes(r.plano_contas_id));
    return matchesSearch && matchesStatus && matchesCentroCusto && matchesCategoria;
  });

  const totalItems = filteredRecords.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  const allSelected = paginatedRecords.length > 0 && paginatedRecords.every(r => selectedIds.includes(r.parcela_id));
  const someSelected = selectedIds.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !paginatedRecords.find(r => r.parcela_id === id)));
    } else {
      const newIds = paginatedRecords.map(r => r.parcela_id);
      setSelectedIds(prev => [...new Set([...prev, ...newIds])]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectedRecords = filteredRecords.filter(r => selectedIds.includes(r.parcela_id));

  const handleBatchAction = async (data: any) => {
    try {
      if (batchActionType === 'change-date' && data.newDate) {
        for (const id of selectedIds) {
          await supabase.from('parcelas_contrato').update({ data_vencimento: data.newDate }).eq('id', id);
        }
        const recordsToUpdate = filteredRecords.filter(r => selectedIds.includes(r.parcela_id) && r.conta_pagar_id);
        for (const r of recordsToUpdate) {
          await supabase.from('contas_pagar').update({ data_vencimento: data.newDate, data_competencia: data.newDate }).eq('id', r.conta_pagar_id!);
        }
        const folhaRecords = filteredRecords.filter(r => selectedIds.includes(r.parcela_id) && r.folha_id);
        const newDateObj = new Date(data.newDate + 'T00:00:00');
        for (const r of folhaRecords) {
          await supabase.from('folha_pagamento').update({ mes_referencia: newDateObj.getMonth() + 1, ano_referencia: newDateObj.getFullYear() }).eq('id', r.folha_id!);
        }
        toast({ title: 'Sucesso', description: `Data de vencimento alterada para ${selectedIds.length} registro(s).` });
      } else if (batchActionType === 'change-status' && batchNewStatus) {
        for (const r of selectedRecords) {
          if (r.folha_id) {
            await supabase.from('folha_pagamento').update({ status: batchNewStatus }).eq('id', r.folha_id);
          } else {
            // Create folha_pagamento record if it doesn't exist
            const vencDate = new Date(r.data_vencimento + 'T00:00:00');
            await supabase.from('folha_pagamento').insert({
              parcela_id: r.parcela_id,
              contrato_id: r.contrato_id,
              fornecedor_id: r.fornecedor_id,
              mes_referencia: vencDate.getMonth() + 1,
              ano_referencia: vencDate.getFullYear(),
              salario_base: r.salario_base,
              valor_liquido: r.valor_liquido,
              tipo_vinculo: r.tipo_vinculo,
              status: batchNewStatus,
              conta_pagar_id: r.conta_pagar_id,
            });
          }
        }
        toast({ title: 'Sucesso', description: `Status da folha alterado para "${batchNewStatus}" em ${selectedIds.length} registro(s).` });
      }
      setSelectedIds([]);
      setBatchNewStatus('');
      fetchRecords();
    } catch (error) {
      console.error('Erro na ação em lote:', error);
      toast({ title: 'Erro', description: 'Não foi possível executar a ação em lote.', variant: 'destructive' });
    }
  };

  const handleDateRangeChange = (preset: DateRangePreset, range?: { from: Date | undefined; to: Date | undefined }) => {
    setDatePreset(preset);
    if (range) setCustomDateRange(range);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por funcionário ou CNPJ/CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <CategoriaFilterSelect value={selectedCategoria} onValueChange={setSelectedCategoria} options={categoriaOptions} />
          <DateRangeFilter
            value={datePreset}
            onChange={handleDateRangeChange}
            customRange={customDateRange}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em_aberto">Em Aberto</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
          <CentroCustoFilterSelect value={selectedCentroCusto} onValueChange={setSelectedCentroCusto} />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <FileSpreadsheet className="w-4 h-4" />
            Importar Planilha
          </Button>
        </div>

        {someSelected && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">{selectedIds.length} selecionado(s)</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Ações em Lote
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-background">
                <DropdownMenuItem onClick={() => { setBatchActionType('change-status'); setBatchNewStatus('pendente'); setBatchDialogOpen(true); }}>
                  Alterar Status da Folha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setBatchActionType('change-date'); setBatchDialogOpen(true); }}>
                  Alterar Data de Vencimento
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setBatchHoleriteDialogOpen(true)}
                  disabled={selectedRecords.filter(r => r.holerite_url && r.folha_id && r.plano_contas_id && SALARIO_CLT_IDS.includes(r.plano_contas_id)).length === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Holerites por E-mail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Limpar seleção</Button>
          </div>
        )}
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead>Competência</TableHead>
              <TableHead>Data Vencimento</TableHead>
              <TableHead>Razão Social</TableHead>
              <TableHead>Nome Fantasia</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead className="text-right">Salário Base</TableHead>
              <TableHead className="text-right">Valor Líquido</TableHead>
              <TableHead>Status Pgto</TableHead>
              <TableHead>Status Folha</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : paginatedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado. Marque contratos de compra como "Funcionário" para que suas parcelas apareçam aqui.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRecords.map((r) => {
                const vencDate = new Date(r.data_vencimento + 'T00:00:00');
                const competencia = `${String(vencDate.getMonth() + 1).padStart(2, '0')}/${vencDate.getFullYear()}`;
                return (
                  <TableRow key={r.parcela_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(r.parcela_id)}
                        onCheckedChange={() => toggleSelect(r.parcela_id)}
                      />
                    </TableCell>
                    <TableCell>{competencia}</TableCell>
                    <TableCell className="text-sm">{formatDateStr(r.data_vencimento)}</TableCell>
                    <TableCell className="font-medium">{r.fornecedor_razao_social}</TableCell>
                    <TableCell className="text-sm">{r.fornecedor_nome_fantasia || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatCnpj(r.fornecedor_cnpj)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.plano_contas_descricao}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.centros_custo.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.centros_custo.map(cc => (
                            <CompanyTagWithPercent key={cc.centro_custo_id} codigo={cc.codigo} percentual={cc.percentual} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.salario_base)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.valor_liquido)}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell>{getFolhaStatusBadge(r.folha_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.plano_contas_id && SALARIO_CLT_IDS.includes(r.plano_contas_id) && r.holerite_url && r.folha_id && (() => {
                          const holeriteDisabled = permissions.canSendHoleriteOnlyWhenPaid && r.status !== 'pago';
                          return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={sendingHoleriteId === r.folha_id || holeriteDisabled}
                            onClick={async () => {
                              setSendingHoleriteId(r.folha_id);
                              try {
                                const { data, error } = await supabase.functions.invoke('send-holerite-email', {
                                  body: { folha_id: r.folha_id },
                                });
                                if (error) throw error;
                                if (data && !data.success) throw new Error(data.error);
                                toast({ title: 'Sucesso', description: 'Holerite enviado por e-mail com sucesso.' });
                              } catch (err: any) {
                                console.error('Erro ao enviar holerite:', err);
                                toast({ title: 'Erro', description: err.message || 'Não foi possível enviar o holerite.', variant: 'destructive' });
                              } finally {
                                setSendingHoleriteId(null);
                              }
                            }}
                            title="Enviar holerite por e-mail"
                          >
                            {sendingHoleriteId === r.folha_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </Button>
                                </span>
                              </TooltipTrigger>
                              {holeriteDisabled && (
                                <TooltipContent>Envio de holerite disponível apenas após o lançamento estar pago.</TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          );
                        })()}
                        {r.plano_contas_id && SALARIO_CLT_IDS.includes(r.plano_contas_id) && r.holerite_url && (
                          <Button variant="ghost" size="icon" onClick={() => window.open(r.holerite_url!, '_blank')} title="Visualizar holerite">
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedRecord(r); setEditDialogOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </Card>

      <EditFolhaDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        record={selectedRecord}
        defaultMes={new Date().getMonth() + 1}
        defaultAno={new Date().getFullYear()}
        onSaved={fetchRecords}
      />

      <EnviarHoleriteDialog
        open={batchHoleriteDialogOpen}
        onOpenChange={setBatchHoleriteDialogOpen}
        holerites={selectedRecords
          .filter(r => r.holerite_url && r.folha_id && r.plano_contas_id && SALARIO_CLT_IDS.includes(r.plano_contas_id))
          .map(r => {
            const vencDate = new Date(r.data_vencimento + 'T00:00:00');
            return {
              folha_id: r.folha_id!,
              fornecedor_razao_social: r.fornecedor_razao_social,
              fornecedor_nome_fantasia: r.fornecedor_nome_fantasia,
              valor_liquido: r.valor_liquido,
              competencia: `${String(vencDate.getMonth() + 1).padStart(2, '0')}/${vencDate.getFullYear()}`,
              holerite_url: r.holerite_url!,
              fornecedor_emails: r.fornecedor_emails || [],
            };
          })}
        isLoading={batchHoleriteSending}
        onConfirm={async () => {
          setBatchHoleriteSending(true);
          try {
            const eligibleRecords = selectedRecords.filter(
              r => r.holerite_url && r.folha_id && r.plano_contas_id && SALARIO_CLT_IDS.includes(r.plano_contas_id)
            );
            let successCount = 0;
            let errorCount = 0;
            for (const r of eligibleRecords) {
              try {
                const { data, error } = await supabase.functions.invoke('send-holerite-email', {
                  body: { folha_id: r.folha_id },
                });
                if (error) throw error;
                if (data && !data.success) throw new Error(data.error);
                successCount++;
              } catch {
                errorCount++;
              }
            }
            if (successCount > 0) {
              toast({ title: 'Sucesso', description: `${successCount} holerite(s) enviado(s) com sucesso.${errorCount > 0 ? ` ${errorCount} falha(s).` : ''}` });
            } else {
              toast({ title: 'Erro', description: 'Nenhum holerite foi enviado.', variant: 'destructive' });
            }
            setSelectedIds([]);
          } catch (err: any) {
            toast({ title: 'Erro', description: err.message || 'Erro ao enviar holerites.', variant: 'destructive' });
          } finally {
            setBatchHoleriteSending(false);
            setBatchHoleriteDialogOpen(false);
          }
        }}
      />

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {batchActionType === 'change-date' ? 'Alterar Data de Vencimento' : `Alterar Status da Folha`}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {batchActionType === 'change-date'
                ? `Alterar a data de vencimento de ${selectedIds.length} lançamento(s) selecionado(s). As parcelas e contas a pagar vinculadas também serão atualizadas.`
                : `Alterar o status da folha de ${selectedIds.length} lançamento(s) selecionado(s).`}
            </p>
            {batchActionType === 'change-status' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={batchNewStatus} onValueChange={setBatchNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="processado">Processado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {batchActionType === 'change-date' && (
              <div className="space-y-2">
                <Label htmlFor="batch-new-date">Nova Data de Vencimento</Label>
                <Input
                  id="batch-new-date"
                  type="date"
                  value={batchDateValue}
                  onChange={(e) => setBatchDateValue(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (batchActionType === 'change-date') {
                  handleBatchAction({ newDate: batchDateValue });
                } else {
                  handleBatchAction({});
                }
                setBatchDialogOpen(false);
                setBatchDateValue('');
              }}
              disabled={(batchActionType === 'change-date' && !batchDateValue) || (batchActionType === 'change-status' && !batchNewStatus)}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarFolhaDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchRecords}
        records={filteredRecords}
      />
    </div>
  );
}
