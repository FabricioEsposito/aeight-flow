import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Eye, Edit, X, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SupplierContractWizard from '@/components/contratos/SupplierContractWizard';
import ContractDetails from '@/components/contratos/ContractDetails';

interface ContratoFornecedor {
  id: string;
  numero: string;
  data_inicio: string;
  data_fim?: string;
  valor_total: number;
  valor_liquido: number;
  status: string;
  fornecedores?: {
    razao_social: string;
    cnpj_cpf: string;
  } | null;
}

export default function ContratosFornecedores() {
  const [contratos, setContratos] = useState<ContratoFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [editingContract, setEditingContract] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchContratos();
  }, []);

  const fetchContratos = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('contratos')
        .select(`
          id,
          numero,
          data_inicio,
          data_fim,
          valor_total,
          valor_liquido,
          status,
          fornecedores (
            razao_social,
            cnpj_cpf
          )
        `)
        .eq('tipo_contrato', 'fornecedor')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contratos de fornecedores.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndContract = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('contratos')
        .update({ status: 'encerrado' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Contrato encerrado com sucesso.",
      });

      fetchContratos();
    } catch (error) {
      console.error('Erro ao encerrar contrato:', error);
      toast({
        title: "Erro",
        description: "Erro ao encerrar contrato.",
        variant: "destructive"
      });
    }
  };

  const canDeleteContract = async (contractId: string): Promise<boolean> => {
    try {
      const { count, error } = await (supabase as any)
        .from('contas_pagar')
        .select('*', { count: 'exact', head: true })
        .eq('contrato_id', contractId)
        .eq('status', 'pago');

      if (error) {
        console.error('Erro ao verificar pagamentos:', error);
        return false;
      }

      return count === 0;
    } catch (error) {
      console.error('Erro ao verificar pagamentos:', error);
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const canDelete = await canDeleteContract(id);
      
      if (!canDelete) {
        toast({
          title: "Não é possível excluir",
          description: "Este contrato possui parcelas já pagas e não pode ser excluído.",
          variant: "destructive"
        });
        return;
      }

      // Excluir contas a pagar relacionadas
      await (supabase as any)
        .from('contas_pagar')
        .delete()
        .eq('contrato_id', id);

      // Excluir itens do contrato
      await (supabase as any)
        .from('contrato_itens')
        .delete()
        .eq('contrato_id', id);

      // Excluir contrato
      const { error } = await (supabase as any)
        .from('contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Contrato excluído com sucesso.",
      });

      fetchContratos();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir contrato.",
        variant: "destructive"
      });
    }
  };

  const handleViewContract = (id: string) => {
    setSelectedContractId(id);
    setShowDetails(true);
  };

  const handleNewContract = () => {
    setEditingContract(null);
    setWizardOpen(true);
  };

  const handleEditContract = async (id: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('contratos')
        .select(`
          *,
          contrato_itens (
            descricao,
            quantidade,
            valor_unitario,
            valor_total,
            servico_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setEditingContract(data);
      setWizardOpen(true);
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do contrato.",
        variant: "destructive",
      });
    }
  };

  const filteredContratos = contratos.filter(contrato => {
    const matchesSearch = 
      contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contrato.fornecedores?.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contrato.status === statusFilter;
    
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
          <h1 className="text-3xl font-bold text-foreground">Contratos de Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus contratos de compras</p>
        </div>
        
        <Button onClick={handleNewContract}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por número do contrato ou fornecedor..."
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
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="encerrado">Encerrados</SelectItem>
              <SelectItem value="suspenso">Suspensos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data Início</TableHead>
                <TableHead>Data Fim</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Valor Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContratos.map((contrato) => (
                <TableRow key={contrato.id}>
                  <TableCell className="font-medium">{contrato.numero}</TableCell>
                  <TableCell>{contrato.fornecedores?.razao_social || '-'}</TableCell>
                  <TableCell>{formatDate(contrato.data_inicio)}</TableCell>
                  <TableCell>{contrato.data_fim ? formatDate(contrato.data_fim) : 'Indeterminado'}</TableCell>
                  <TableCell>{formatCurrency(contrato.valor_total)}</TableCell>
                  <TableCell>{formatCurrency(contrato.valor_liquido)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        contrato.status === 'ativo' ? 'default' : 
                        contrato.status === 'encerrado' ? 'secondary' : 'destructive'
                      }
                    >
                      {contrato.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Visualizar"
                        onClick={() => handleViewContract(contrato.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Editar"
                        onClick={() => handleEditContract(contrato.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {contrato.status === 'ativo' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <X className="w-4 h-4 mr-2" />
                                  Encerrar Contrato
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Encerrar Contrato</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja encerrar este contrato? Esta ação irá bloquear novas parcelas e recorrências futuras.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleEndContract(contrato.id)}>
                                    Encerrar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir Contrato
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este contrato permanentemente? Esta ação não pode ser desfeita. Contratos com parcelas pagas não podem ser excluídos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(contrato.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredContratos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum contrato encontrado.</p>
            <Button variant="ghost" className="mt-2" onClick={handleNewContract}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro contrato
            </Button>
          </div>
        )}
      </Card>

      <SupplierContractWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={fetchContratos}
        editContract={editingContract}
      />
      
      <ContractDetails
        contractId={selectedContractId}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
    </div>
  );
}