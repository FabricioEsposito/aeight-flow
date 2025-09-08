import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_competencia: string;
  data_recebimento?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  clientes?: {
    razao_social: string;
  };
  contratos?: {
    numero: string;
  };
}

export default function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
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
          contratos:contrato_id (
            numero
          )
        `)
        .order('data_vencimento');

      if (error) throw error;
      setContas(data || []);
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

  useEffect(() => {
    fetchContas();
  }, []);

  const handleMarcarRecebido = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contas_receber')
        .update({
          status: 'pago',
          data_recebimento: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta marcada como recebida!",
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao marcar como recebido:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar como recebido.",
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
        
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
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
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por descrição ou cliente..."
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
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Contrato</TableHead>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {conta.status === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarcarRecebido(conta.id)}
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
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta a receber encontrada.</p>
          </div>
        )}
      </Card>
    </div>
  );
}