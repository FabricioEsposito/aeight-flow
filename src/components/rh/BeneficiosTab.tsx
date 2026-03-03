import React, { useState, useEffect } from 'react';
import { Search, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TablePagination } from '@/components/ui/table-pagination';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditBeneficioDialog } from './EditBeneficioDialog';
import { useSessionState } from '@/hooks/useSessionState';
import { CompanyTagWithPercent } from '@/components/centro-custos/CompanyBadge';

interface BeneficioParcelaRecord {
  parcela_id: string;
  contrato_id: string;
  fornecedor_id: string;
  fornecedor_razao_social: string;
  fornecedor_nome_fantasia: string | null;
  fornecedor_cnpj: string;
  tipo_beneficio: string;
  data_vencimento: string;
  data_competencia: string | null;
  valor: number;
  status: string;
  centros_custo: Array<{ centro_custo_id: string; codigo: string; descricao: string; percentual: number }>;
  conta_pagar_id: string | null;
  beneficio_id: string | null;
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

export function BeneficiosTab() {
  const [records, setRecords] = useState<BeneficioParcelaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useSessionState<string>('beneficios', 'search', '');
  const [statusFilter, setStatusFilter] = useSessionState<string>('beneficios', 'status', 'todos');
  const [mesFilter, setMesFilter] = useSessionState<string>('beneficios', 'mes', String(new Date().getMonth() + 1));
  const [anoFilter, setAnoFilter] = useSessionState<string>('beneficios', 'ano', String(new Date().getFullYear()));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BeneficioParcelaRecord | null>(null);
  const { toast } = useToast();

  const fetchRecords = async () => {
    try {
      setLoading(true);

      const mes = parseInt(mesFilter);
      const ano = parseInt(anoFilter);
      const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const endDate = mes === 12
        ? `${ano + 1}-01-01`
        : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;

      // 1. Get parcelas from contracts with is_beneficio_funcionario = true
      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas_contrato')
        .select(`
          id, valor, data_vencimento, status, contrato_id,
          contratos!inner (
            id, fornecedor_id, is_beneficio_funcionario,
            fornecedores (razao_social, nome_fantasia, cnpj_cpf)
          )
        `)
        .eq('contratos.is_beneficio_funcionario', true)
        .gte('data_vencimento', startDate)
        .lt('data_vencimento', endDate)
        .order('data_vencimento');

      if (parcelasError) throw parcelasError;
      if (!parcelas || parcelas.length === 0) {
        setRecords([]);
        return;
      }

      const contratoIds = [...new Set(parcelas.map((p: any) => p.contrato_id))];
      const parcelaIds = parcelas.map((p: any) => p.id);

      // 2. Fetch centros de custo rateio for contracts
      const { data: rateios } = await supabase
        .from('contratos_centros_custo')
        .select('contrato_id, centro_custo_id, percentual, centros_custo:centro_custo_id (codigo, descricao)')
        .in('contrato_id', contratoIds);

      // 3. Fetch contas_pagar linked to these parcelas
      const { data: contasPagar } = await supabase
        .from('contas_pagar')
        .select('id, parcela_id, status, data_competencia, data_pagamento')
        .in('parcela_id', parcelaIds);

      // 4. Fetch controle_beneficios for tipo_beneficio
      const { data: beneficios } = await supabase
        .from('controle_beneficios')
        .select('id, parcela_id, tipo_beneficio')
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

      const beneficioMap = new Map<string, any>();
      (beneficios || []).forEach((b: any) => {
        if (b.parcela_id) beneficioMap.set(b.parcela_id, b);
      });

      const today = new Date().toISOString().split('T')[0];

      const formatted: BeneficioParcelaRecord[] = parcelas.map((p: any) => {
        const contrato = p.contratos;
        const fornecedor = contrato?.fornecedores;
        const cp = contaPagarMap.get(p.id);
        const beneficio = beneficioMap.get(p.id);

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
          tipo_beneficio: beneficio?.tipo_beneficio || 'Outros',
          data_vencimento: p.data_vencimento,
          data_competencia: cp?.data_competencia || null,
          valor: Number(p.valor),
          status,
          centros_custo: rateioMap.get(p.contrato_id) || [],
          conta_pagar_id: cp?.id || null,
          beneficio_id: beneficio?.id || null,
        };
      });

      setRecords(formatted);
    } catch (error) {
      console.error('Erro ao buscar benefícios:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os benefícios.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [mesFilter, anoFilter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCnpj = (value: string) => {
    if (!value) return 'N/A';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 14) return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return value;
  };

  const formatDate = (date: string | null) => {
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

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.fornecedor_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fornecedor_nome_fantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fornecedor_cnpj.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredRecords.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por fornecedor ou CNPJ/CPF..."
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em_aberto">Em Aberto</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Data Vencimento</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Nome Fantasia</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : paginatedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum benefício encontrado. Marque contratos de compra como "Benefício para Funcionários" para que suas parcelas apareçam aqui.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRecords.map((r) => {
                const vencDate = new Date(r.data_vencimento + 'T00:00:00');
                const competencia = `${String(vencDate.getMonth() + 1).padStart(2, '0')}/${vencDate.getFullYear()}`;
                return (
                  <TableRow key={r.parcela_id}>
                    <TableCell>{competencia}</TableCell>
                    <TableCell className="text-sm">{formatDate(r.data_vencimento)}</TableCell>
                    <TableCell className="font-medium">{r.fornecedor_razao_social}</TableCell>
                    <TableCell className="text-sm">{r.fornecedor_nome_fantasia || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatCnpj(r.fornecedor_cnpj)}</TableCell>
                    <TableCell><Badge variant="outline">{r.tipo_beneficio}</Badge></TableCell>
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
                    <TableCell className="text-right font-medium">{formatCurrency(r.valor)}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedRecord(r); setEditDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
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

      <EditBeneficioDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        record={selectedRecord}
        onSaved={fetchRecords}
      />
    </div>
  );
}
