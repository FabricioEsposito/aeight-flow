import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, FileDown } from "lucide-react";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any>(null);
  const { toast } = useToast();

  const carregarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social");

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const clientesFiltrados = clientes.filter((cliente) => {
    const matchesSearch = 
      cliente.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cnpj_cpf?.includes(searchTerm);
    
    const matchesStatus = 
      statusFilter === "todos" ||
      (statusFilter === "ativo" && cliente.status === "ativo") ||
      (statusFilter === "inativo" && cliente.status === "inativo");

    return matchesSearch && matchesStatus;
  });

  const handleNovoCliente = () => {
    setClienteEditando(null);
    setIsFormOpen(true);
  };

  const handleEditarCliente = (cliente: any) => {
    setClienteEditando(cliente);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setClienteEditando(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setClienteEditando(null);
    carregarClientes();
  };

  const handleExcluirCliente = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso.",
      });

      carregarClientes();
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie seus clientes cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={handleNovoCliente} className="bg-gradient-primary hover:bg-primary-hover">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por Razão Social ou CNPJ..."
                  className="pl-10 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
            </div>
          </CardContent>
        </Card>

        {/* Clientes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes ({clientesFiltrados.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando clientes...</div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== "todos" 
                  ? "Nenhum cliente encontrado com os filtros aplicados." 
                  : "Nenhum cliente cadastrado ainda."}
              </div>
            ) : (
              <div className="space-y-4">
                {clientesFiltrados.map((cliente) => (
                  <div key={cliente.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="font-medium text-foreground">{cliente.razao_social}</p>
                        <p className="text-sm text-muted-foreground">{cliente.cnpj_cpf}</p>
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{cliente.email || "-"}</p>
                        <p className="text-sm text-muted-foreground">{cliente.telefone || "-"}</p>
                      </div>
                      <div>
                        <Badge variant={cliente.status === "ativo" ? "default" : "secondary"}>
                          {cliente.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditarCliente(cliente)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleExcluirCliente(cliente.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ClienteForm
              cliente={clienteEditando}
              onClose={handleFormClose}
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}