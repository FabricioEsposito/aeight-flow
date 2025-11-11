import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CentroCustosTable from '@/components/centro-custos/CentroCustosTable';
import CentroCustosDialog from '@/components/centro-custos/CentroCustosDialog';

export interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
  status: string;
  created_at: string;
}

export default function CentroCustos() {
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCentroCusto, setEditingCentroCusto] = useState<CentroCusto | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCentrosCusto();
  }, []);

  const fetchCentrosCusto = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('centros_custo')
        .select('*')
        .order('codigo', { ascending: true });

      if (error) throw error;
      setCentrosCusto(data || []);
    } catch (error) {
      console.error('Erro ao buscar centros de custo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os centros de custo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('centros_custo')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Centro de custo excluído com sucesso.",
      });
      
      fetchCentrosCusto();
    } catch (error) {
      console.error('Erro ao excluir centro de custo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o centro de custo.",
        variant: "destructive",
      });
    }
  };

  const handleInactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('centros_custo')
        .update({ status: 'inativo' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Centro de custo inativado com sucesso.",
      });
      
      fetchCentrosCusto();
    } catch (error) {
      console.error('Erro ao inativar centro de custo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível inativar o centro de custo.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (centroCusto: CentroCusto) => {
    setEditingCentroCusto(centroCusto);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCentroCusto(null);
  };

  const handleSuccess = () => {
    fetchCentrosCusto();
    handleCloseDialog();
  };

  const filteredCentrosCusto = centrosCusto.filter(cc =>
    cc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cc.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Custos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os centros de custos da empresa
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Centro de Custo
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <CentroCustosTable
        centrosCusto={filteredCentrosCusto}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onInactivate={handleInactivate}
      />

      <CentroCustosDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        centroCusto={editingCentroCusto}
        onSuccess={handleSuccess}
      />
    </div>
  );
}