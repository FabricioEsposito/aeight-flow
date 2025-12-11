import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContratosTable } from '@/components/contratos/ContratosTable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { TablePagination } from '@/components/ui/table-pagination';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';

interface Contrato {
  id: string;
  numero_contrato: string;
  tipo_contrato: 'venda' | 'compra';
  data_inicio: string;
  valor_total: number;
  valor_bruto?: number;
  quantidade?: number;
  valor_unitario?: number;
  status: string;
  clientes?: { razao_social: string; nome_fantasia: string | null; cnpj_cpf: string };
  fornecedores?: { razao_social: string; nome_fantasia: string | null; cnpj_cpf: string };
  tem_go_live?: boolean;
}

export default function Contratos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterGoLive, setFilterGoLive] = useState<string>('todos');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('todo-periodo');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          *,
          clientes:cliente_id (razao_social, nome_fantasia, cnpj_cpf),
          fornecedores:fornecedor_id (razao_social, nome_fantasia, cnpj_cpf),
          parcelas_contrato (
            id,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Adicionar flag tem_go_live para cada contrato
      const contratosComGoLive = (data || []).map((contrato: any) => ({
        ...contrato,
        tem_go_live: contrato.parcelas_contrato?.some(
          (parcela: any) => parcela.status === 'aguardando_conclusao'
        ) || false
      }));
      
      setContratos(contratosComGoLive);
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

  const handleView = (id: string) => {
    navigate(`/contratos/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/contratos/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    try {
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

  const handleInactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contratos')
        .update({ status: 'inativo' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Contrato inativado com sucesso!",
      });
      fetchContratos();
    } catch (error) {
      console.error('Erro ao inativar contrato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível inativar o contrato.",
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

  const filteredContratos = contratos.filter(contrato => {
    const matchesSearch = 
      contrato.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contrato.clientes?.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contrato.fornecedores?.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'todos' || contrato.tipo_contrato === filterType;
    
    const matchesGoLive = 
      filterGoLive === 'todos' || 
      (filterGoLive === 'com-go-live' && contrato.tem_go_live) ||
      (filterGoLive === 'sem-go-live' && !contrato.tem_go_live);

    let matchesDate = true;
    const dateRange = getDateRange();
    if (dateRange?.from && dateRange?.to) {
      const dataInicio = new Date(contrato.data_inicio);
      matchesDate = dataInicio >= dateRange.from && dataInicio <= dateRange.to;
    }

    return matchesSearch && matchesType && matchesGoLive && matchesDate;
  });

  // Paginação
  const totalItems = filteredContratos.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContratos = filteredContratos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
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
          <h1 className="text-3xl font-bold text-foreground">Gestão de Contratos</h1>
          <p className="text-muted-foreground">Gerencie seus contratos de venda e compra</p>
        </div>
        
        <Button onClick={() => navigate('/contratos/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

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
              placeholder="Buscar por número do contrato ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo de Contrato" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Contratos</SelectItem>
              <SelectItem value="venda">Contratos de Venda</SelectItem>
              <SelectItem value="compra">Contratos de Compra</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterGoLive} onValueChange={setFilterGoLive}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Go Live" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os Contratos</SelectItem>
              <SelectItem value="com-go-live">Com Go Live</SelectItem>
              <SelectItem value="sem-go-live">Sem Go Live</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ContratosTable 
          contratos={paginatedContratos}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onInactivate={handleInactivate}
        />

        {filteredContratos.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </Card>
    </div>
  );
}