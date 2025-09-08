import React, { useState, useEffect } from 'react';
import { Search, Filter, BarChart3, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Movimentacao {
  id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data_movimento: string;
  descricao: string;
  conciliado: boolean;
  observacoes?: string;
  contas_bancarias?: {
    descricao: string;
    banco: string;
  };
  plano_contas?: {
    codigo: string;
    descricao: string;
  };
}

export default function Extrato() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [conciliadoFilter, setConciliadoFilter] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const { toast } = useToast();

  const fetchMovimentacoes = async () => {
    try {
      let query = supabase
        .from('movimentacoes')
        .select(`
          *,
          contas_bancarias:conta_bancaria_id (
            descricao,
            banco
          ),
          plano_contas:plano_conta_id (
            codigo,
            descricao
          )
        `)
        .order('data_movimento', { ascending: false });

      if (dataInicio) {
        query = query.gte('data_movimento', dataInicio);
      }
      if (dataFim) {
        query = query.lte('data_movimento', dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as movimentações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovimentacoes();
  }, [dataInicio, dataFim]);

  const handleConciliar = async (id: string) => {
    try {
      const { error } = await supabase
        .from('movimentacoes')
        .update({ conciliado: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Movimentação conciliada!",
      });
      fetchMovimentacoes();
    } catch (error) {
      console.error('Erro ao conciliar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível conciliar a movimentação.",
        variant: "destructive",
      });
    }
  };

  const filteredMovimentacoes = movimentacoes.filter(mov => {
    const matchesSearch = mov.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (mov.contas_bancarias?.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'todos' || mov.tipo === tipoFilter;
    const matchesConciliado = conciliadoFilter === 'todos' || 
                             (conciliadoFilter === 'sim' ? mov.conciliado : !mov.conciliado);

    return matchesSearch && matchesTipo && matchesConciliado;
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
  const totalEntradas = filteredMovimentacoes
    .filter(m => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.valor, 0);

  const totalSaidas = filteredMovimentacoes
    .filter(m => m.tipo === 'saida')
    .reduce((acc, m) => acc + m.valor, 0);

  const saldoLiquido = totalEntradas - totalSaidas;

  const naoConcialiados = filteredMovimentacoes.filter(m => !m.conciliado).length;

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
          <p className="text-muted-foreground">Visualize e concilie suas movimentações financeiras</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Importar OFX
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Entradas</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalEntradas)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Saídas</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalSaidas)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Líquido</p>
              <p className={`text-2xl font-bold ${saldoLiquido >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatCurrency(saldoLiquido)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Não Conciliados</p>
              <p className="text-2xl font-bold text-amber-600">{naoConcialiados}</p>
            </div>
            <Filter className="w-8 h-8 text-amber-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar movimentações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={conciliadoFilter} onValueChange={setConciliadoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Conciliação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sim">Conciliados</SelectItem>
              <SelectItem value="nao">Não Conciliados</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            placeholder="Data início"
          />

          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            placeholder="Data fim"
          />

          <Button variant="outline" onClick={fetchMovimentacoes}>
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta Bancária</TableHead>
                <TableHead>Plano de Contas</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Conciliado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovimentacoes.map((mov) => (
                <TableRow key={mov.id} className={!mov.conciliado ? 'bg-amber-50' : ''}>
                  <TableCell>{formatDate(mov.data_movimento)}</TableCell>
                  <TableCell>
                    <Badge variant={mov.tipo === 'entrada' ? 'default' : 'destructive'}>
                      {mov.tipo === 'entrada' ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{mov.descricao}</TableCell>
                  <TableCell>
                    {mov.contas_bancarias ? (
                      <div>
                        <p className="font-medium">{mov.contas_bancarias.descricao}</p>
                        <p className="text-xs text-muted-foreground">{mov.contas_bancarias.banco}</p>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {mov.plano_contas ? (
                      <div>
                        <Badge variant="outline" className="text-xs">{mov.plano_contas.codigo}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{mov.plano_contas.descricao}</p>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className={`font-semibold ${mov.tipo === 'entrada' ? 'text-emerald-600' : 'text-destructive'}`}>
                    {mov.tipo === 'entrada' ? '+' : '-'} {formatCurrency(mov.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={mov.conciliado ? 'default' : 'secondary'}>
                      {mov.conciliado ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!mov.conciliado && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConciliar(mov.id)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          Conciliar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredMovimentacoes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma movimentação encontrada no período.</p>
          </div>
        )}
      </Card>
    </div>
  );
}