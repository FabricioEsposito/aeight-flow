import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClienteDetalhesDialog } from './ClienteDetalhesDialog';

interface ClienteAnalise {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  aging_medio: number;
  total_a_receber: number;
  percentual_receita: number;
  score: string;
  score_color: string;
}

interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
}

export function AnaliseCreditoClientes() {
  const [clientes, setClientes] = useState<ClienteAnalise[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReceita, setTotalReceita] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCentroCusto, setSelectedCentroCusto] = useState<string>('todos');
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  
  // Dialog state
  const [selectedCliente, setSelectedCliente] = useState<{ id: string; nome: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchCentrosCusto();
  }, []);

  useEffect(() => {
    fetchAnalise();
  }, [selectedCentroCusto]);

  const fetchCentrosCusto = async () => {
    const { data } = await supabase
      .from('centros_custo')
      .select('id, codigo, descricao')
      .eq('status', 'ativo')
      .order('codigo');
    setCentrosCusto(data || []);
  };

  const getScoreInfo = (agingMedio: number): { score: string; color: string } => {
    if (agingMedio <= 1) return { score: 'Ótimo Pagador', color: 'bg-green-500' };
    if (agingMedio <= 3) return { score: 'Bom Pagador', color: 'bg-green-500' };
    if (agingMedio <= 5) return { score: 'Pagador Mediano', color: 'bg-yellow-500' };
    if (agingMedio <= 7) return { score: 'Péssimo Pagador', color: 'bg-red-500' };
    return { score: 'Péssimo Pagador', color: 'bg-red-500' };
  };

  const fetchAnalise = async () => {
    setLoading(true);
    try {
      // Buscar todas as contas a receber (todo o período)
      let query = supabase
        .from('contas_receber')
        .select('*, clientes(id, razao_social, nome_fantasia)')
        .eq('status', 'pendente');

      if (selectedCentroCusto && selectedCentroCusto !== 'todos') {
        query = query.eq('centro_custo', selectedCentroCusto);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calcular total de receita
      const receita = data?.reduce((sum, conta) => sum + (conta.valor || 0), 0) || 0;
      setTotalReceita(receita);

      // Agrupar por cliente e calcular métricas
      const clientesMap = new Map<string, any>();
      
      data?.forEach((conta: any) => {
        if (!conta.clientes) return;
        
        const clienteId = conta.clientes.id;
        const hoje = new Date();
        const vencimento = new Date(conta.data_vencimento_original || conta.data_vencimento);
        const aging = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

        if (!clientesMap.has(clienteId)) {
          clientesMap.set(clienteId, {
            id: clienteId,
            razao_social: conta.clientes.razao_social,
            nome_fantasia: conta.clientes.nome_fantasia,
            total_a_receber: 0,
            soma_aging: 0,
            count_parcelas: 0,
          });
        }

        const cliente = clientesMap.get(clienteId);
        cliente.total_a_receber += conta.valor || 0;
        cliente.soma_aging += aging;
        cliente.count_parcelas += 1;
      });

      // Converter para array e calcular aging médio
      const clientesAnalise: ClienteAnalise[] = Array.from(clientesMap.values())
        .map((cliente) => {
          const agingMedio = cliente.count_parcelas > 0 
            ? cliente.soma_aging / cliente.count_parcelas 
            : 0;
          const percentualReceita = receita > 0 
            ? (cliente.total_a_receber / receita) * 100 
            : 0;
          const scoreInfo = getScoreInfo(agingMedio);

          return {
            id: cliente.id,
            razao_social: cliente.razao_social,
            nome_fantasia: cliente.nome_fantasia,
            aging_medio: Math.round(agingMedio),
            total_a_receber: cliente.total_a_receber,
            percentual_receita: percentualReceita,
            score: scoreInfo.score,
            score_color: scoreInfo.color,
          };
        })
        .sort((a, b) => b.total_a_receber - a.total_a_receber);

      setClientes(clientesAnalise);
    } catch (error) {
      console.error('Erro ao buscar análise de crédito:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleViewDetails = (cliente: ClienteAnalise) => {
    setSelectedCliente({ id: cliente.id, nome: cliente.nome_fantasia || cliente.razao_social });
    setDialogOpen(true);
  };

  // Filtrar clientes pelo termo de busca
  const filteredClientes = clientes.filter(cliente =>
    (cliente.nome_fantasia || cliente.razao_social).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Crédito - Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Análise de Crédito - Clientes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Score baseado no aging médio das parcelas a receber (considera todo o período)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCentroCusto} onValueChange={setSelectedCentroCusto}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Centro de Custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Centros de Custo</SelectItem>
                {centrosCusto.map((cc) => (
                  <SelectItem key={cc.id} value={cc.codigo}>
                    {cc.codigo} - {cc.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Aging Médio</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-right">Total a Receber</TableHead>
                  <TableHead className="text-right">% Receita</TableHead>
                  <TableHead className="text-center w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome_fantasia || cliente.razao_social}</TableCell>
                      <TableCell className="text-center">
                        {cliente.aging_medio} dias
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cliente.score_color}>
                          {cliente.score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cliente.total_a_receber)}
                      </TableCell>
                      <TableCell className="text-right">
                        {cliente.percentual_receita.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(cliente)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de detalhes do cliente */}
      {selectedCliente && (
        <ClienteDetalhesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clienteId={selectedCliente.id}
          clienteNome={selectedCliente.nome}
        />
      )}
    </>
  );
}
