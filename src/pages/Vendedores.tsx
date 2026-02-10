import { useState, useEffect } from "react";
import { useClearFiltersOnAreaChange } from '@/hooks/useSessionState';
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
  fornecedor_id: string | null;
  status: string;
  created_at: string;
  is_merged?: boolean;
}

interface VendedorCentroCustoLink {
  id: string;
  vendedor_id: string;
  centro_custo_id: string;
  meta: number;
  percentual_comissao: number;
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
  useClearFiltersOnAreaChange('vendedores');
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [links, setLinks] = useState<VendedorCentroCustoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    fornecedor_id: "",
    status: "ativo" as 'ativo' | 'inativo',
  });

  const [formCentros, setFormCentros] = useState<Record<string, { selected: boolean; meta: number; percentual_comissao: number }>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const sb = supabase as any;
      const [vendedoresRes, centrosCustoRes, fornecedoresRes] = await Promise.all([
        sb.from("vendedores").select("*").eq('is_merged', false).order("nome"),
        sb.from("centros_custo").select("id, codigo, descricao").eq("status", "ativo"),
        sb.from("fornecedores").select("id, razao_social, nome_fantasia").eq("status", "ativo").order("razao_social"),
      ]);

      if (vendedoresRes.error) throw vendedoresRes.error;
      if (centrosCustoRes.error) throw centrosCustoRes.error;
      if (fornecedoresRes.error) throw fornecedoresRes.error;

      setVendedores(vendedoresRes.data || []);
      setCentrosCusto(centrosCustoRes.data || []);
      setFornecedores(fornecedoresRes.data || []);

      const vendedorIds = (vendedoresRes.data || []).map((v: any) => v.id);
      if (vendedorIds.length > 0) {
        const linksRes = await sb
          .from('vendedores_centros_custo')
          .select('id, vendedor_id, centro_custo_id, meta, percentual_comissao')
          .in('vendedor_id', vendedorIds);

        if (linksRes.error) throw linksRes.error;
        setLinks(linksRes.data || []);
      } else {
        setLinks([]);
      }
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
        fornecedor_id: vendedor.fornecedor_id || "",
        status: (vendedor.status as any) || 'ativo',
      });

      const vendedorLinks = links.filter((l) => l.vendedor_id === vendedor.id);
      const next: Record<string, { selected: boolean; meta: number; percentual_comissao: number }> = {};
      centrosCusto.forEach((cc) => {
        const link = vendedorLinks.find((l) => l.centro_custo_id === cc.id);
        next[cc.id] = {
          selected: !!link,
          meta: Number(link?.meta ?? 0),
          percentual_comissao: Number(link?.percentual_comissao ?? 0),
        };
      });
      setFormCentros(next);
    } else {
      setSelectedVendedor(null);
      setFormData({
        nome: "",
        fornecedor_id: "",
        status: 'ativo',
      });

      const next: Record<string, { selected: boolean; meta: number; percentual_comissao: number }> = {};
      centrosCusto.forEach((cc) => {
        next[cc.id] = { selected: false, meta: 0, percentual_comissao: 0 };
      });
      setFormCentros(next);
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
      const sb = supabase as any;
      const selectedCentroIds = Object.entries(formCentros)
        .filter(([, v]) => v.selected)
        .map(([ccId]) => ccId);

      if (selectedCentroIds.length === 0) {
        toast({
          title: 'Erro',
          description: 'Selecione pelo menos um Centro de Custo para o vendedor.',
          variant: 'destructive',
        });
        return;
      }

      let vendedorId = selectedVendedor?.id;

      if (selectedVendedor) {
        const { error } = await supabase
          .from("vendedores")
          .update({
            nome: formData.nome,
            fornecedor_id: formData.fornecedor_id || null,
            status: formData.status,
          })
          .eq("id", selectedVendedor.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Vendedor atualizado com sucesso.",
        });
      } else {
        const { data, error } = await supabase
          .from("vendedores")
          .insert({
            nome: formData.nome,
            fornecedor_id: formData.fornecedor_id || null,
            status: formData.status,
            // Mantemos defaults globais como fallback legado
            meta: 0,
            percentual_comissao: 0,
            centro_custo: null,
            is_merged: false,
          } as any)
          .select('id')
          .single();

        if (error) throw error;
        vendedorId = data?.id;
        toast({
          title: "Sucesso",
          description: "Vendedor cadastrado com sucesso.",
        });
      }

      if (vendedorId) {
        const upserts = selectedCentroIds.map((ccId) => ({
          vendedor_id: vendedorId,
          centro_custo_id: ccId,
          meta: Number(formCentros[ccId]?.meta ?? 0),
          percentual_comissao: Number(formCentros[ccId]?.percentual_comissao ?? 0),
        }));

        const upsertRes = await sb
          .from('vendedores_centros_custo')
          .upsert(upserts, { onConflict: 'vendedor_id,centro_custo_id' });
        if (upsertRes.error) throw upsertRes.error;

        // Remove vínculos desmarcados
        if (selectedCentroIds.length > 0) {
          const delRes = await sb
            .from('vendedores_centros_custo')
            .delete()
            .eq('vendedor_id', vendedorId)
            .not('centro_custo_id', 'in', `(${selectedCentroIds.map((id) => `"${id}"`).join(',')})`);
          if (delRes.error) throw delRes.error;
        }
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

  const linksByVendedor = useState(() => new Map<string, VendedorCentroCustoLink[]>())[0];
  linksByVendedor.clear();
  links.forEach((l) => {
    const arr = linksByVendedor.get(l.vendedor_id) || [];
    arr.push(l);
    linksByVendedor.set(l.vendedor_id, arr);
  });

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
                  <TableHead>Centros de Custo</TableHead>
                  <TableHead>Fornecedor Vinculado</TableHead>
                  <TableHead>Meta (soma)</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendedores.map((vendedor) => (
                  <TableRow key={vendedor.id}>
                    <TableCell className="font-medium">{vendedor.nome}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {(linksByVendedor.get(vendedor.id) || []).length > 0 ? (
                          (linksByVendedor.get(vendedor.id) || []).map((l) => {
                            const cc = getCentroCusto(l.centro_custo_id);
                            return cc?.codigo ? (
                              <CompanyTag key={l.id} codigo={cc.codigo} />
                            ) : null;
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getFornecedorDisplay(vendedor.fornecedor_id)}</TableCell>
                    <TableCell>
                      {formatCurrency(
                        (linksByVendedor.get(vendedor.id) || []).reduce((acc, l) => acc + Number(l.meta || 0), 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {(linksByVendedor.get(vendedor.id) || []).length > 1
                        ? 'Múltipla'
                        : `${(linksByVendedor.get(vendedor.id) || [])[0]?.percentual_comissao ?? 0}%`}
                    </TableCell>
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
                <Label>Nível/Status</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.status === 'ativo' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, status: 'ativo' })}
                  >
                    Ativo
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status === 'inativo' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, status: 'inativo' })}
                  >
                    Inativo
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Centros de Custo do vendedor *</Label>
                  <p className="text-xs text-muted-foreground">
                    Marque os centros que este vendedor atende e defina Meta/Comissão por centro.
                  </p>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-auto pr-2">
                  {centrosCusto.map((cc) => {
                    const current = formCentros[cc.id] || { selected: false, meta: 0, percentual_comissao: 0 };
                    return (
                      <div key={cc.id} className="rounded-md border p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{cc.codigo} - {cc.descricao}</div>
                          </div>
                          <Button
                            type="button"
                            variant={current.selected ? 'default' : 'outline'}
                            onClick={() =>
                              setFormCentros((prev) => ({
                                ...prev,
                                [cc.id]: { ...current, selected: !current.selected },
                              }))
                            }
                          >
                            {current.selected ? 'Selecionado' : 'Selecionar'}
                          </Button>
                        </div>

                        {current.selected && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Meta Mensal (R$)</Label>
                              <CurrencyInput
                                value={current.meta}
                                onChange={(value) =>
                                  setFormCentros((prev) => ({
                                    ...prev,
                                    [cc.id]: { ...current, meta: value },
                                  }))
                                }
                                placeholder="0,00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Comissão (%)</Label>
                              <CurrencyInput
                                value={current.percentual_comissao}
                                onChange={(value) =>
                                  setFormCentros((prev) => ({
                                    ...prev,
                                    [cc.id]: { ...current, percentual_comissao: value },
                                  }))
                                }
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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