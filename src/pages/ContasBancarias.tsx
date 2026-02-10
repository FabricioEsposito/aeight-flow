import React, { useState, useEffect } from 'react';
import { useClearFiltersOnAreaChange } from '@/hooks/useSessionState';
import { Plus, Search, Edit, Trash2, CreditCard, Wallet, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CurrencyInput } from '@/components/ui/currency-input';

interface ContaBancaria {
  id: string;
  tipo_conta: 'corrente' | 'poupanca' | 'investimento';
  banco: string;
  descricao: string;
  saldo_inicial: number;
  saldo_atual: number;
  data_inicio: string;
  status: 'ativo' | 'inativo';
  created_at: string;
}

export default function ContasBancarias() {
  useClearFiltersOnAreaChange('contasBancarias');
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      tipo_conta: 'corrente' as 'corrente' | 'poupanca' | 'investimento',
      banco: '',
      descricao: '',
      saldo_inicial: 0,
      saldo_atual: 0,
      data_inicio: new Date().toISOString().split('T')[0],
      status: 'ativo' as 'ativo' | 'inativo',
    }
  });

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .order('descricao');

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas bancárias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      const formData = {
        ...data,
        saldo_atual: editingConta ? data.saldo_inicial : data.saldo_inicial,
      };

      if (editingConta) {
        const { error } = await supabase
          .from('contas_bancarias')
          .update(formData)
          .eq('id', editingConta.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Conta bancária atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('contas_bancarias')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Conta bancária cadastrada com sucesso!",
        });
      }

      fetchContas();
      setIsDialogOpen(false);
      setEditingConta(null);
      form.reset();
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a conta bancária.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (conta: ContaBancaria) => {
    setEditingConta(conta);
    form.reset({
      tipo_conta: conta.tipo_conta,
      banco: conta.banco,
      descricao: conta.descricao,
      saldo_inicial: conta.saldo_inicial,
      saldo_atual: conta.saldo_atual,
      data_inicio: conta.data_inicio,
      status: conta.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta bancária excluída com sucesso!",
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao excluir conta bancária:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta bancária.",
        variant: "destructive",
      });
    }
  };

  const filteredContas = contas.filter(conta => {
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conta.banco.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || conta.status === statusFilter;
    const matchesTipo = tipoFilter === 'todos' || conta.tipo_conta === tipoFilter;

    return matchesSearch && matchesStatus && matchesTipo;
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

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'corrente':
        return <CreditCard className="w-4 h-4" />;
      case 'poupanca':
        return <Wallet className="w-4 h-4" />;
      case 'investimento':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
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
          <h1 className="text-3xl font-bold text-foreground">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie suas contas bancárias</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingConta(null);
              form.reset();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingConta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da conta bancária abaixo.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tipo_conta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Conta</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="corrente">Conta Corrente</SelectItem>
                            <SelectItem value="poupanca">Poupança</SelectItem>
                            <SelectItem value="investimento">Investimento</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="banco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Banco do Brasil, Itaú..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Conta Corrente Principal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="saldo_inicial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saldo Inicial</FormLabel>
                        <FormControl>
                          <CurrencyInput 
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="0,00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingConta ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por descrição ou banco..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="corrente">Conta Corrente</SelectItem>
              <SelectItem value="poupanca">Poupança</SelectItem>
              <SelectItem value="investimento">Investimento</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Saldo Inicial</TableHead>
                <TableHead>Saldo Atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTipoIcon(conta.tipo_conta)}
                      <Badge variant="outline">
                        {conta.tipo_conta === 'corrente' ? 'C.C.' : 
                         conta.tipo_conta === 'poupanca' ? 'Poup.' : 'Invest.'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{conta.banco}</TableCell>
                  <TableCell className="font-medium">{conta.descricao}</TableCell>
                  <TableCell>{formatCurrency(conta.saldo_inicial)}</TableCell>
                  <TableCell className={conta.saldo_atual >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                    {formatCurrency(conta.saldo_atual)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={conta.status === 'ativo' ? 'default' : 'destructive'}>
                      {conta.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                        <DropdownMenuItem onClick={() => handleEdit(conta)} className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2 text-blue-500" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(conta.id)} className="cursor-pointer text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredContas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta bancária encontrada.</p>
            <Button variant="ghost" className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira conta
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}