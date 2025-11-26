import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, MoreVertical, XCircle } from 'lucide-react';
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
import { ClienteForm } from '@/components/clientes/ClienteForm';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { TablePagination } from '@/components/ui/table-pagination';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';

interface Cliente {
  id: string;
  tipo_pessoa: 'fisica' | 'juridica' | 'internacional';
  razao_social: string;
  cnpj_cpf: string;
  email?: string[] | null;
  telefone?: string;
  endereco?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('todo-periodo');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { toast } = useToast();

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsDialogOpen(true);
  };

  const handleFormSuccess = () => {
    fetchClientes();
    setIsDialogOpen(false);
    setEditingCliente(null);
  };

  const handleFormClose = () => {
    setIsDialogOpen(false);
    setEditingCliente(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso!",
      });
      fetchClientes();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    }
  };

  const handleInactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ status: 'inativo' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente inativado com sucesso!",
      });
      fetchClientes();
    } catch (error) {
      console.error('Erro ao inativar cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível inativar o cliente.",
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

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = 
      cliente.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cnpj_cpf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.email && Array.isArray(cliente.email) && cliente.email.some(e => e.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = statusFilter === "todos" || cliente.status === statusFilter;
    const matchesTipo = tipoFilter === "todos" || cliente.tipo_pessoa === tipoFilter;
    
    const dateRange = getDateRange();
    const clienteDate = new Date(cliente.created_at);
    const matchesDateRange = !dateRange || (clienteDate >= dateRange.from! && clienteDate <= dateRange.to!);
    
    return matchesSearch && matchesStatus && matchesTipo && matchesDateRange;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tipoFilter, datePreset]);

  // Paginate filtered results
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClientes = filteredClientes.slice(startIndex, endIndex);

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
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        
        <Button onClick={() => {
          setEditingCliente(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0">
            <ClienteForm
              cliente={editingCliente}
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
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{cliente.razao_social}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCnpjCpf(cliente.cnpj_cpf)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cliente.tipo_pessoa === 'juridica' ? 'default' : cliente.tipo_pessoa === 'internacional' ? 'outline' : 'secondary'}>
                      {cliente.tipo_pessoa === 'juridica' ? 'PJ' : cliente.tipo_pessoa === 'internacional' ? 'INT' : 'PF'}
                    </Badge>
                  </TableCell>
                  <TableCell>{cliente.telefone || '-'}</TableCell>
                  <TableCell>
                    {cliente.email && Array.isArray(cliente.email) && cliente.email.length > 0
                      ? cliente.email.join(', ')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cliente.status === 'ativo' ? 'default' : 'destructive'}>
                      {cliente.status}
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
                        <DropdownMenuItem onClick={() => handleEdit(cliente)} className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2 text-blue-500" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleInactivate(cliente.id)} 
                          className="cursor-pointer"
                          disabled={cliente.status === 'inativo'}
                        >
                          <XCircle className="w-4 h-4 mr-2 text-amber-500" />
                          <span>Inativar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(cliente.id)} className="cursor-pointer text-destructive">
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
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredClientes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {filteredClientes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        )}
      </Card>
    </div>
  );
}
