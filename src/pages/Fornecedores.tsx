import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FornecedorForm } from '@/components/fornecedores/FornecedorForm';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';

interface Fornecedor {
  id: string;
  tipo_pessoa: 'fisica' | 'juridica';
  razao_social: string;
  cnpj_cpf: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
}

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('todo-periodo');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const { toast } = useToast();

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os fornecedores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setIsDialogOpen(true);
  };

  const handleFormSuccess = () => {
    fetchFornecedores();
    setIsDialogOpen(false);
    setEditingFornecedor(null);
  };

  const handleFormClose = () => {
    setIsDialogOpen(false);
    setEditingFornecedor(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Fornecedor excluído com sucesso!",
      });
      fetchFornecedores();
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o fornecedor.",
        variant: "destructive",
      });
    }
  };

  const getDateRange = () => {
    const today = new Date();
    
    switch (datePreset) {
      case 'todo-periodo':
        return undefined;
      case 'hoje':
        return { from: startOfDay(today), to: endOfDay(today) };
      case 'esta-semana':
        return { from: startOfWeek(today, { weekStartsOn: 0 }), to: endOfWeek(today, { weekStartsOn: 0 }) };
      case 'este-mes':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'este-ano':
        return { from: startOfYear(today), to: endOfYear(today) };
      case 'ultimos-30-dias':
        return { from: subDays(today, 30), to: today };
      case 'ultimos-12-meses':
        return { from: subMonths(today, 12), to: today };
      case 'periodo-personalizado':
        return customDateRange;
      default:
        return undefined;
    }
  };

  const filteredFornecedores = fornecedores.filter(fornecedor => {
    const matchesSearch = fornecedor.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fornecedor.cnpj_cpf.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || fornecedor.status === statusFilter;
    const matchesTipo = tipoFilter === 'todos' || fornecedor.tipo_pessoa === tipoFilter;

    let matchesDate = true;
    const dateRange = getDateRange();
    if (dateRange?.from && dateRange?.to) {
      const createdAt = new Date(fornecedor.created_at);
      matchesDate = createdAt >= dateRange.from && createdAt <= dateRange.to;
    }

    return matchesSearch && matchesStatus && matchesTipo && matchesDate;
  });

  const formatCnpjCpf = (value: string) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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
          <h1 className="text-3xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores</p>
        </div>
        
        <Button onClick={() => {
          setEditingFornecedor(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <FornecedorForm
              fornecedor={editingFornecedor}
              onClose={handleFormClose}
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      )}

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <DateRangeFilter
            value={datePreset}
            onChange={(preset, range) => {
              setDatePreset(preset);
              if (range) setCustomDateRange(range);
            }}
            customRange={customDateRange}
          />

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou CNPJ/CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          
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

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="fisica">Pessoa Física</SelectItem>
              <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFornecedores.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{fornecedor.razao_social}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCnpjCpf(fornecedor.cnpj_cpf)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={fornecedor.tipo_pessoa === 'juridica' ? 'default' : 'secondary'}>
                      {fornecedor.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
                    </Badge>
                  </TableCell>
                  <TableCell>{fornecedor.telefone || '-'}</TableCell>
                  <TableCell>{fornecedor.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={fornecedor.status === 'ativo' ? 'default' : 'destructive'}>
                      {fornecedor.status}
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
                        <DropdownMenuItem onClick={() => handleEdit(fornecedor)} className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2 text-blue-500" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(fornecedor.id)} className="cursor-pointer text-destructive">
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

        {filteredFornecedores.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum fornecedor encontrado.
          </div>
        )}
      </Card>
    </div>
  );
}