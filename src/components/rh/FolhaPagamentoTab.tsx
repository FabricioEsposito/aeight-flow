import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TablePagination } from '@/components/ui/table-pagination';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { EditFolhaDialog } from './EditFolhaDialog';
import { useSessionState } from '@/hooks/useSessionState';
import { CentroCustoFilterSelect } from '@/components/financeiro/CentroCustoFilterSelect';
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

interface FolhaRecord {
  id: string;
  fornecedor_id: string;
  fornecedor_razao_social: string;
  fornecedor_cnpj: string;
  contrato_id: string | null;
  parcela_id: string | null;
  conta_pagar_id: string | null;
  mes_referencia: number;
  ano_referencia: number;
  tipo_vinculo: string;
  salario_base: number;
  inss_percentual: number;
  inss_valor: number;
  fgts_percentual: number;
  fgts_valor: number;
  irrf_percentual: number;
  irrf_valor: number;
  vale_transporte_desconto: number;
  outros_descontos: number;
  outros_proventos: number;
  iss_percentual: number;
  iss_valor: number;
  pis_percentual: number;
  pis_valor: number;
  cofins_percentual: number;
  cofins_valor: number;
  csll_percentual: number;
  csll_valor: number;
  irrf_pj_percentual: number;
  irrf_pj_valor: number;
  valor_liquido: number;
  observacoes: string | null;
  status: string;
  centro_custo: string | null;
}

const meses = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export function FolhaPagamentoTab() {
  const [records, setRecords] = useState<FolhaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useSessionState<string>('folha', 'search', '');
  const [tipoVinculoFilter, setTipoVinculoFilter] = useSessionState<string>('folha', 'tipoVinculo', 'todos');
  const [statusFilter, setStatusFilter] = useSessionState<string>('folha', 'status', 'todos');
  const [mesFilter, setMesFilter] = useSessionState<string>('folha', 'mes', String(new Date().getMonth() + 1));
  const [anoFilter, setAnoFilter] = useSessionState<string>('folha', 'ano', String(new Date().getFullYear()));
  const [selectedCentroCusto, setSelectedCentroCusto] = useSessionState<string[]>('folha', 'centroCusto', []);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FolhaRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<FolhaRecord | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('folha_pagamento')
        .select('*, fornecedores:fornecedor_id (razao_social, cnpj_cpf), contratos:contrato_id (centro_custo)')
        .eq('mes_referencia', parseInt(mesFilter))
        .eq('ano_referencia', parseInt(anoFilter))
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: FolhaRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        fornecedor_id: item.fornecedor_id,
        fornecedor_razao_social: item.fornecedores?.razao_social || 'N/A',
        fornecedor_cnpj: item.fornecedores?.cnpj_cpf || 'N/A',
        contrato_id: item.contrato_id,
        parcela_id: item.parcela_id,
        conta_pagar_id: item.conta_pagar_id,
        mes_referencia: item.mes_referencia,
        ano_referencia: item.ano_referencia,
        tipo_vinculo: item.tipo_vinculo,
        salario_base: Number(item.salario_base),
        inss_percentual: Number(item.inss_percentual),
        inss_valor: Number(item.inss_valor),
        fgts_percentual: Number(item.fgts_percentual),
        fgts_valor: Number(item.fgts_valor),
        irrf_percentual: Number(item.irrf_percentual),
        irrf_valor: Number(item.irrf_valor),
        vale_transporte_desconto: Number(item.vale_transporte_desconto),
        outros_descontos: Number(item.outros_descontos),
        outros_proventos: Number(item.outros_proventos),
        iss_percentual: Number(item.iss_percentual),
        iss_valor: Number(item.iss_valor),
        pis_percentual: Number(item.pis_percentual),
        pis_valor: Number(item.pis_valor),
        cofins_percentual: Number(item.cofins_percentual),
        cofins_valor: Number(item.cofins_valor),
        csll_percentual: Number(item.csll_percentual),
        csll_valor: Number(item.csll_valor),
        irrf_pj_percentual: Number(item.irrf_pj_percentual),
        irrf_pj_valor: Number(item.irrf_pj_valor),
        valor_liquido: Number(item.valor_liquido),
        observacoes: item.observacoes,
        status: item.status,
        centro_custo: item.contratos?.centro_custo || null,
      }));

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
  }, [mesFilter, anoFilter]);

  const handleDelete = async () => {
    if (!recordToDelete) return;
    try {
      const { error } = await supabase.from('folha_pagamento').delete().eq('id', recordToDelete.id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Registro excluído.' });
      fetchRecords();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCnpj = (value: string) => {
    if (!value) return 'N/A';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 14) return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return value;
  };

  const getTotalImpostos = (r: FolhaRecord) => {
    if (r.tipo_vinculo === 'CLT') {
      return r.inss_valor + r.fgts_valor + r.irrf_valor + r.vale_transporte_desconto + r.outros_descontos - r.outros_proventos;
    }
    return r.iss_valor + r.pis_valor + r.cofins_valor + r.csll_valor + r.irrf_pj_valor;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>;
      case 'processado': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processado</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>;
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.fornecedor_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fornecedor_cnpj.includes(searchTerm);
    const matchesTipo = tipoVinculoFilter === 'todos' || r.tipo_vinculo === tipoVinculoFilter;
    const matchesStatus = statusFilter === 'todos' || r.status === statusFilter;
    const matchesCentroCusto = selectedCentroCusto.length === 0 || (!!r.centro_custo && selectedCentroCusto.includes(r.centro_custo));
    return matchesSearch && matchesTipo && matchesStatus && matchesCentroCusto;
  });

  const totalItems = filteredRecords.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  return (
    <div className="space-y-4">
      {/* Filters */}
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
          <Select value={mesFilter} onValueChange={setMesFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              {meses.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={anoFilter} onValueChange={setAnoFilter}>
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tipoVinculoFilter} onValueChange={setTipoVinculoFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="CLT">CLT</SelectItem>
              <SelectItem value="PJ">PJ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="processado">Processado</SelectItem>
            </SelectContent>
          </Select>
          <CentroCustoFilterSelect value={selectedCentroCusto} onValueChange={setSelectedCentroCusto} />
          <Button onClick={() => { setSelectedRecord(null); setIsCreating(true); setEditDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Salário Base</TableHead>
              <TableHead className="text-right">Impostos/Descontos</TableHead>
              <TableHead className="text-right">Valor Líquido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : paginatedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell>
              </TableRow>
            ) : (
              paginatedRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{String(r.mes_referencia).padStart(2, '0')}/{r.ano_referencia}</TableCell>
                  <TableCell className="font-medium">{r.fornecedor_razao_social}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCnpj(r.fornecedor_cnpj)}</TableCell>
                  <TableCell>
                    <Badge variant={r.tipo_vinculo === 'CLT' ? 'default' : 'secondary'}>
                      {r.tipo_vinculo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(r.salario_base)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(getTotalImpostos(r))}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(r.valor_liquido)}</TableCell>
                  <TableCell>{getStatusBadge(r.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedRecord(r); setIsCreating(false); setEditDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setRecordToDelete(r); setDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
        record={isCreating ? null : selectedRecord}
        defaultMes={parseInt(mesFilter)}
        defaultAno={parseInt(anoFilter)}
        onSaved={fetchRecords}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de folha de pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
