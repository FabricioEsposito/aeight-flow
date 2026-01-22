import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import CentroCustoSelect from "@/components/centro-custos/CentroCustoSelect";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CompanyTag } from "@/components/centro-custos/CompanyBadge";

interface Vendedor {
  id: string;
  nome: string;
  centro_custo: string | null;
  fornecedor_id: string | null;
  meta: number;
  percentual_comissao: number;
  status: string;
  created_at: string;
}

interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
}

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

export default function Vendedores() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    centro_custo: "",
    fornecedor_id: "",
    meta: 0,
    percentual_comissao: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vendedoresRes, centrosCustoRes, fornecedoresRes] = await Promise.all([
        supabase.from("vendedores").select("*").order("nome"),
        supabase.from("centros_custo").select("id, codigo, descricao").eq("status", "ativo"),
        supabase.from("fornecedores").select("id, razao_social, nome_fantasia").eq("status", "ativo").order("razao_social"),
      ]);

      if (vendedoresRes.error) throw vendedoresRes.error;
      if (centrosCustoRes.error) throw centrosCustoRes.error;
      if (fornecedoresRes.error) throw fornecedoresRes.error;

      setVendedores(vendedoresRes.data || []);
      setCentrosCusto(centrosCustoRes.data || []);
      setFornecedores(fornecedoresRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCentroCusto = (centroCustoId: string | null) => {
    if (!centroCustoId) return null;
    return centrosCusto.find((c) => c.id === centroCustoId) || null;
  };

  const getFornecedorDisplay = (fornecedorId: string | null) => {
    if (!fornecedorId) return "-";
    const f = fornecedores.find((f) => f.id === fornecedorId);
    return f ? (f.nome_fantasia || f.razao_social) : fornecedorId;
  };

  const handleOpenDialog = (vendedor?: Vendedor) => {
    if (vendedor) {
      setSelectedVendedor(vendedor);
      setFormData({
        nome: vendedor.nome,
        centro_custo: vendedor.centro_custo || "",
        fornecedor_id: vendedor.fornecedor_id || "",
        meta: vendedor.meta,
        percentual_comissao: vendedor.percentual_comissao,
      });
    } else {
      setSelectedVendedor(null);
      setFormData({
        nome: "",
        centro_custo: "",
        fornecedor_id: "",
        meta: 0,
        percentual_comissao: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do vendedor é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedVendedor) {
        const { error } = await supabase
          .from("vendedores")
          .update({
            nome: formData.nome,
            centro_custo: formData.centro_custo || null,
            fornecedor_id: formData.fornecedor_id || null,
            meta: formData.meta,
            percentual_comissao: formData.percentual_comissao,
          })
          .eq("id", selectedVendedor.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Vendedor atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase.from("vendedores").insert({
          nome: formData.nome,
          centro_custo: formData.centro_custo || null,
          fornecedor_id: formData.fornecedor_id || null,
          meta: formData.meta,
          percentual_comissao: formData.percentual_comissao,
        });

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Vendedor cadastrado com sucesso.",
        });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar vendedor:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o vendedor.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedVendedor) return;

    try {
      const { error } = await supabase
        .from("vendedores")
        .delete()
        .eq("id", selectedVendedor.id);

      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Vendedor excluído com sucesso.",
      });
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir vendedor:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o vendedor.",
        variant: "destructive",
      });
    }
  };

  const filteredVendedores = vendedores.filter((v) =>
    v.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVendedores.length / itemsPerPage);
  const paginatedVendedores = filteredVendedores.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vendedores</h1>
            <p className="text-muted-foreground">
              Gerencie sua equipe de vendas
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Vendedor
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Fornecedor Vinculado</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Comissão %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendedores.map((vendedor) => (
                  <TableRow key={vendedor.id}>
                    <TableCell className="font-medium">{vendedor.nome}</TableCell>
                    <TableCell>
                      {(() => {
                        const cc = getCentroCusto(vendedor.centro_custo);
                        return cc?.codigo ? (
                          <CompanyTag codigo={cc.codigo} />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{getFornecedorDisplay(vendedor.fornecedor_id)}</TableCell>
                    <TableCell>{formatCurrency(vendedor.meta)}</TableCell>
                    <TableCell>{vendedor.percentual_comissao}%</TableCell>
                    <TableCell>
                      <Badge
                        variant={vendedor.status === "ativo" ? "default" : "secondary"}
                      >
                        {vendedor.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(vendedor)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedVendedor(vendedor);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedVendedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum vendedor encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredVendedores.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          </CardContent>
        </Card>

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedVendedor ? "Editar Vendedor" : "Novo Vendedor"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Nome do vendedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="centro_custo">Centro de Custo</Label>
                <CentroCustoSelect
                  value={formData.centro_custo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, centro_custo: value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedor_id">Fornecedor Vinculado *</Label>
                <SearchableSelect
                  options={fornecedores.map((f) => ({
                    value: f.id,
                    label: f.nome_fantasia || f.razao_social,
                  }))}
                  value={formData.fornecedor_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, fornecedor_id: value })
                  }
                  placeholder="Selecione um fornecedor"
                />
                <p className="text-xs text-muted-foreground">
                  Vinculado ao lançamento da comissão no contas a pagar
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta">Meta Mensal (R$)</Label>
                <CurrencyInput
                  value={formData.meta}
                  onChange={(value) => setFormData({ ...formData, meta: value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comissao">Percentual de Comissão (%)</Label>
                <CurrencyInput
                  value={formData.percentual_comissao}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      percentual_comissao: value,
                    })
                  }
                  placeholder="0,00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o vendedor "{selectedVendedor?.nome}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}