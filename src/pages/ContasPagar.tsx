import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContaPagar {
  id: string;
  descricao: string;
  valor_parcela: number;
  numero_parcela: number;
  status_pagamento: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  data_vencimento: string;
  data_competencia: string;
  data_pagamento?: string;
  fornecedores?: {
    razao_social: string;
  };
  contratos?: {
    numero: string;
  };
}

export default function ContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const { toast } = useToast();

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          fornecedores:fornecedor_id (
            razao_social
          ),
          parcelas_contrato:parcela_id (
            numero_parcela,
            contratos:contrato_id (
              numero_contrato
            )
          )
        `)
        .order('data_vencimento');

      if (error) throw error;
      
      // Map data to match the interface
      const contasMapeadas = (data || []).map((item: any) => ({
        id: item.id,
        descricao: item.descricao,
        valor_parcela: item.valor,
        numero_parcela: item.parcelas_contrato?.numero_parcela || 0,
        status_pagamento: item.status,
        data_vencimento: item.data_vencimento,
        data_competencia: item.data_competencia,
        data_pagamento: item.data_pagamento,
        fornecedores: item.fornecedores,
        contratos: item.parcelas_contrato?.contratos ? {
          numero: item.parcelas_contrato.contratos.numero_contrato
        } : null
      }));
      
      setContas(contasMapeadas);
    } catch (error) {
      console.error('Erro ao buscar contas a pagar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas a pagar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();
  }, []);

  const handleMarcarPago = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contas_pagar')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta marcada como paga!",
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar como pago.",
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

  const filteredContas = contas.filter(conta => {
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conta.fornecedores?.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'todos') {
      if (statusFilter === 'vencido') {
        const hoje = new Date();
        const vencimento = new Date(conta.data_vencimento);
        matchesStatus = vencimento < hoje && conta.status_pagamento === 'pendente';
      } else {
        matchesStatus = conta.status_pagamento === statusFilter;
      }
    }

    return matchesSearch && matchesStatus;
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
    .filter(c => c.status_pagamento === 'pendente')
    .reduce((acc, c) => acc + c.valor_parcela, 0);

  const totalVencido = contas
    .filter(c => {
      const hoje = new Date();
      const vencimento = new Date(c.data_vencimento);
      return vencimento < hoje && c.status_pagamento === 'pendente';
    })
    .reduce((acc, c) => acc + c.valor_parcela, 0);

  const totalPago = contas
    .filter(c => c.status_pagamento === 'pago')
    .reduce((acc, c) => acc + c.valor_parcela, 0);

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
          <h1 className="text-3xl font-bold text-foreground">Contas a Pagar</h1>
          <p className="text-muted-foreground">Gerencie suas despesas e pagamentos</p>
        </div>
        
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
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
            <TrendingDown className="w-8 h-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pago</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPago)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por descrição ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
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
                <TableHead>Fornecedor</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium">
                    {conta.fornecedores?.razao_social || '-'}
                  </TableCell>
                  <TableCell>{conta.contratos?.numero || '-'}</TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell>{conta.numero_parcela}</TableCell>
                  <TableCell className="font-semibold text-destructive">
                    {formatCurrency(conta.valor_parcela)}
                  </TableCell>
                  <TableCell>{formatDate(conta.data_vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(conta.status_pagamento, conta.data_vencimento)}>
                      {getStatusLabel(conta.status_pagamento, conta.data_vencimento)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {conta.status_pagamento === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarcarPago(conta.id)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredContas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta a pagar encontrada.</p>
          </div>
        )}
      </Card>
    </div>
  );
}