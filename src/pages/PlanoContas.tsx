import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<PlanoConta | null>(null);
  const [parentConta, setParentConta] = useState<PlanoConta | null>(null);
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
      if (!codigo && data.parent_id && data.parent_id !== 'none') {
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

      // Calcular nível baseado no parent
      let nivel = 1; // Grupo (raiz)
      if (data.parent_id && data.parent_id !== 'none') {
        // Buscar nível do parent
        const { data: parentData } = await supabase
          .from('plano_contas')
          .select('nivel')
          .eq('id', data.parent_id)
          .single();
        
        if (parentData) {
          nivel = parentData.nivel + 1;
        }
      }

      const formData = {
        ...data,
        codigo,
        parent_id: data.parent_id && data.parent_id !== 'none' ? data.parent_id : null,
        nivel,
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
      parent_id: conta.parent_id || 'none',
      status: conta.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Verificar se há contas filhas
      const { data: childAccounts } = await supabase
        .from('plano_contas')
        .select('id')
        .eq('parent_id', id);

      if (childAccounts && childAccounts.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Esta conta possui subcontas vinculadas. Exclua as subcontas primeiro.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se está sendo usada em contratos
      const { data: contratos } = await supabase
        .from('contratos')
        .select('id')
        .eq('plano_contas_id', id);

      if (contratos && contratos.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Esta conta está sendo usada em contratos. Remova os vínculos primeiro.",
          variant: "destructive",
        });
        return;
      }

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
    } catch (error: any) {
      console.error('Erro ao excluir conta:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a conta.",
        variant: "destructive",
      });
    }
  };

  const handleAddSubConta = (parent: PlanoConta) => {
    setParentConta(parent);
    setEditingConta(null);
    form.reset({
      codigo: '',
      descricao: '',
      tipo: parent.tipo,
      parent_id: parent.id,
      status: 'ativo',
    });
    setIsDialogOpen(true);
  };

  const handleAddNewCategory = (tipo: 'entrada' | 'saida') => {
    setParentConta(null);
    setEditingConta(null);
    form.reset({
      codigo: '',
      descricao: '',
      tipo,
      parent_id: 'none',
      status: 'ativo',
    });
    setIsDialogOpen(true);
  };

  const renderAccount = (account: PlanoConta, level = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    // Permitir até 3 níveis (0, 1, 2)
    const canHaveChildren = level < 2;
    
    return (
      <div key={account.id} className="space-y-2">
        <div 
          className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg transition-colors border border-border/50"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {account.codigo} - {account.descricao}
            </span>
            <span className="text-xs text-muted-foreground">
              {level === 0 && 'Grupo'}
              {level === 1 && 'Subgrupo'}
              {level === 2 && 'Categoria'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {canHaveChildren && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddSubConta(account)}
                className="h-8 px-3"
                title={level === 0 ? 'Adicionar Subgrupo' : 'Adicionar Categoria'}
              >
                <Plus className="h-4 w-4 mr-1" />
                {level === 0 ? 'Subgrupo' : 'Categoria'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(account)}
              className="h-8 w-8 p-0"
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(account.id)}
              className="h-8 w-8 p-0"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        
        {hasChildren && (
          <div className="space-y-2">
            {account.children!.map(child => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const contasEntrada = contas.filter(c => c.tipo === 'entrada');
  const contasSaida = contas.filter(c => c.tipo === 'saida');

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Plano de Contas</h1>
        <p className="text-muted-foreground">Gerencie a estrutura contábil da empresa</p>
      </div>

      {/* Categorias de Receita */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-primary">Categorias de receita</h2>
          <Button 
            onClick={() => handleAddNewCategory('entrada')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo de Receita
          </Button>
        </div>
        
        <div className="space-y-2">
          {contasEntrada.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TreePine className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma categoria de receita cadastrada.</p>
            </div>
          ) : (
            contasEntrada.map(conta => renderAccount(conta))
          )}
        </div>
      </Card>

      {/* Categorias de Despesa */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-primary">Categorias de despesa</h2>
          <Button 
            onClick={() => handleAddNewCategory('saida')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo de Despesa
          </Button>
        </div>
        
        <div className="space-y-2">
          {contasSaida.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TreePine className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma categoria de despesa cadastrada.</p>
            </div>
          ) : (
            contasSaida.map(conta => renderAccount(conta))
          )}
        </div>
      </Card>

      {/* Dialog para adicionar/editar conta */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingConta ? 'Editar Conta' : parentConta ? 'Nova Subconta' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingConta 
                ? 'Edite as informações da conta contábil.' 
                : parentConta 
                  ? `Adicionar ${parentConta.nivel === 1 ? 'subgrupo' : 'categoria'} em: ${parentConta.codigo} - ${parentConta.descricao}`
                  : 'Crie um novo grupo principal.'}
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
                        <Input 
                          placeholder={parentConta ? (parentConta.nivel === 1 ? "1.1" : "1.1.1") : "1"}
                          {...field} 
                        />
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Nenhuma (raiz)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                          {contas
                            .filter(c => c.tipo === form.watch('tipo'))
                            .map(conta => (
                              <SelectItem key={conta.id} value={conta.id}>
                                {conta.codigo} - {conta.descricao}
                              </SelectItem>
                            ))
                          }
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
  );
}