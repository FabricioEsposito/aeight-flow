import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Eye, FileText, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ContractWizard from '@/components/contratos/ContractWizard';
import ContractDetails from '@/components/contratos/ContractDetails';

interface Contrato {
  id: string;
  numero: string;
  data_inicio: string;
  valor_total: number;
  valor_liquido: number;
  status: 'ativo' | 'encerrado' | 'suspenso';
  clientes?: {
    razao_social: string;
  };
}

export default function ContratosClientes() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showWizard, setShowWizard] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const { toast } = useToast();

  const fetchContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          *,
          clientes:cliente_id (
            razao_social
          )
        `)
        .order('numero', { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os contratos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContratos();
  }, []);

  const handleEndContract = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contratos')
        .update({ status: 'encerrado' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Contrato encerrado com sucesso!",
      });
      fetchContratos();
    } catch (error) {
      console.error('Erro ao encerrar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível encerrar o contrato.",
        variant: "destructive",
      });
    }
  };

  const canDeleteContract = async (contractId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('contas_receber')
        .select('id')
        .eq('contrato_id', contractId)
        .eq('status', 'pago')
        .limit(1);

      if (error) throw error;
      return !data || data.length === 0;
    } catch (error) {
      console.error('Erro ao verificar parcelas:', error);
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const canDelete = await canDeleteContract(id);
      
      if (!canDelete) {
        toast({
          title: "Não é possível excluir",
          description: "Este contrato possui parcelas já recebidas e não pode ser excluído.",
          variant: "destructive",
        });
        return;
      }

      // Delete contract items first
      await supabase
        .from('contrato_itens')
        .delete()
        .eq('contrato_id', id);

      // Delete receivables
      await supabase
        .from('contas_receber')
        .delete()
        .eq('contrato_id', id);

      // Delete contract
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Contrato excluído com sucesso!",
      });
      fetchContratos();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o contrato.",
        variant: "destructive",
      });
    }
  };

  const handleViewContract = (id: string) => {
    setSelectedContractId(id);
    setShowDetails(true);
  };

  const handleNewContract = () => {
    setShowWizard(true);
  };

  const filteredContratos = contratos.filter(contrato => {
    const matchesSearch = contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contrato.clientes?.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || contrato.status === statusFilter;

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
          <h1 className="text-3xl font-bold text-foreground">Contratos de Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus contratos de vendas</p>
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
              placeholder="Buscar por número do contrato ou cliente..."
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
                <TableHead>Cliente</TableHead>
                <TableHead>Data Início</TableHead>
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
                  <TableCell>{contrato.clientes?.razao_social || '-'}</TableCell>
                  <TableCell>{formatDate(contrato.data_inicio)}</TableCell>
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
                        onClick={() => handleViewContract(contrato.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
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
                                Excluir Contrato
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este contrato permanentemente? Esta ação não pode ser desfeita.
                                  {contrato.status === 'ativo' && " Nota: Contratos ativos com parcelas recebidas não podem ser excluídos."}
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

      <ContractWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={fetchContratos}
      />

      <ContractDetails
        contractId={selectedContractId}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
    </div>
  );
}