import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, TreePine, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlanoConta {
  id: string;
  codigo: string;
  descricao: string;
  nivel: number;
  parent_id?: string;
  tipo: 'entrada' | 'saida';
  status: 'ativo' | 'inativo';
  children?: PlanoConta[];
}

export default function PlanoContas() {
  const [contas, setContas] = useState<PlanoConta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<PlanoConta | null>(null);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      codigo: '',
      descricao: '',
      tipo: 'entrada' as 'entrada' | 'saida',
      parent_id: '',
      status: 'ativo' as 'ativo' | 'inativo',
    }
  });

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('plano_contas')
        .select('*')
        .order('codigo');

      if (error) throw error;
      
      // Organizar em árvore hierárquica
      const organized = organizeHierarchy(data || []);
      setContas(organized);
    } catch (error) {
      console.error('Erro ao buscar plano de contas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o plano de contas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const organizeHierarchy = (accounts: PlanoConta[]): PlanoConta[] => {
    const accountMap = new Map<string, PlanoConta>();
    const rootAccounts: PlanoConta[] = [];

    // Criar mapa de contas
    accounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Organizar hierarquia
    accounts.forEach(account => {
      const accountWithChildren = accountMap.get(account.id);
      if (accountWithChildren) {
        if (account.parent_id) {
          const parent = accountMap.get(account.parent_id);
          if (parent) {
            parent.children!.push(accountWithChildren);
          }
        } else {
          rootAccounts.push(accountWithChildren);
        }
      }
    });

    return rootAccounts;
  };

  useEffect(() => {
    fetchContas();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      // Calcular próximo código se não especificado
      let codigo = data.codigo;
      if (!codigo && data.parent_id) {
        // Buscar contas filhas do parent para gerar próximo código
        const { data: siblings } = await supabase
          .from('plano_contas')
          .select('codigo')
          .eq('parent_id', data.parent_id)
          .order('codigo', { ascending: false })
          .limit(1);

        if (siblings && siblings.length > 0) {
          const lastCode = siblings[0].codigo;
          const parts = lastCode.split('.');
          const lastNumber = parseInt(parts[parts.length - 1]) + 1;
          parts[parts.length - 1] = lastNumber.toString();
          codigo = parts.join('.');
        }
      }

      const formData = {
        ...data,
        codigo,
        parent_id: data.parent_id || null,
        nivel: data.parent_id ? 2 : 1, // Simplificado para 2 níveis
      };

      if (editingConta) {
        const { error } = await supabase
          .from('plano_contas')
          .update(formData)
          .eq('id', editingConta.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Conta atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('plano_contas')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Conta cadastrada com sucesso!",
        });
      }

      fetchContas();
      setIsDialogOpen(false);
      setEditingConta(null);
      form.reset();
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a conta.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (conta: PlanoConta) => {
    setEditingConta(conta);
    form.reset({
      codigo: conta.codigo,
      descricao: conta.descricao,
      tipo: conta.tipo,
      parent_id: conta.parent_id || '',
      status: conta.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('plano_contas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso!",
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta.",
        variant: "destructive",
      });
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderAccountRows = (accounts: PlanoConta[], level = 0): JSX.Element[] => {
    const rows: JSX.Element[] = [];

    accounts.forEach(account => {
      const hasChildren = account.children && account.children.length > 0;
      const isExpanded = expandedItems.has(account.id);
      
      rows.push(
        <TableRow key={account.id}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(account.id)}
                  className="w-6 h-6 p-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              <Badge variant="outline" className="font-mono text-xs">
                {account.codigo}
              </Badge>
            </div>
          </TableCell>
          <TableCell className="font-medium">{account.descricao}</TableCell>
          <TableCell>
            <Badge variant={account.tipo === 'entrada' ? 'default' : 'secondary'}>
              {account.tipo === 'entrada' ? 'Receita' : 'Despesa'}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={account.status === 'ativo' ? 'default' : 'destructive'}>
              {account.status}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(account)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(account.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );

      if (hasChildren && isExpanded) {
        rows.push(...renderAccountRows(account.children!, level + 1));
      }
    });

    return rows;
  };

  const filteredContas = contas.filter(conta => {
    const searchInChildren = (acc: PlanoConta): boolean => {
      const matches = acc.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     acc.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (matches) return true;
      
      if (acc.children) {
        return acc.children.some(searchInChildren);
      }
      
      return false;
    };

    return searchInChildren(conta);
  });

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
          <h1 className="text-3xl font-bold text-foreground">Plano de Contas</h1>
          <p className="text-muted-foreground">Gerencie a estrutura contábil da empresa</p>
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
                {editingConta ? 'Editar Conta' : 'Nova Conta'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da conta contábil.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input placeholder="1.1.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="entrada">Receita</SelectItem>
                            <SelectItem value="saida">Despesa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da conta contábil" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="parent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta Pai (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contas.map(conta => (
                              <SelectItem key={conta.id} value={conta.id}>
                                {conta.codigo} - {conta.descricao}
                              </SelectItem>
                            ))}
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
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderAccountRows(filteredContas)}
            </TableBody>
          </Table>
        </div>

        {filteredContas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <TreePine className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta encontrada.</p>
          </div>
        )}
      </Card>
    </div>
  );
}