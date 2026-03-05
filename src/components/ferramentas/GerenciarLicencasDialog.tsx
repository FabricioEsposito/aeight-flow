import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, AlertTriangle, CheckCircle, Pencil } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import CentroCustoSelect from "@/components/centro-custos/CentroCustoSelect";
import { MOEDAS_DISPONIVEIS, formatCurrencyWithSymbol, convertToBRL } from "@/hooks/useCotacaoMoedas";

interface GerenciarLicencasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ferramenta: any;
  cotacoes?: Record<string, { cotacao: number; data: string } | null>;
}

export function GerenciarLicencasDialog({ open, onOpenChange, ferramenta, cotacoes }: GerenciarLicencasDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fornecedorId, setFornecedorId] = useState("");
  const [centroCustoId, setCentroCustoId] = useState("");
  const [descricaoUsuario, setDescricaoUsuario] = useState("");
  const [valorLicenca, setValorLicenca] = useState(0);
  const [moeda, setMoeda] = useState("BRL");
  const [saving, setSaving] = useState(false);

  const ferramentaId = ferramenta?.id;

  const { data: licencas = [], isLoading } = useQuery({
    queryKey: ["ferramentas-licencas", ferramentaId],
    queryFn: async () => {
      if (!ferramentaId) return [];
      const { data, error } = await supabase
        .from("ferramentas_software_licencas" as any)
        .select("*, fornecedores(razao_social, nome_fantasia), centros_custo(id, descricao, codigo)")
        .eq("ferramenta_id", ferramentaId)
        .eq("status", "ativo")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!ferramentaId && open,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, razao_social, nome_fantasia")
        .eq("status", "ativo")
        .order("razao_social");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const fornecedorOptions = fornecedores.map((f: any) => ({
    value: f.id,
    label: f.nome_fantasia || f.razao_social,
  }));

  // Calculate totals in BRL
  const somaLicencasBRL = (licencas as any[]).reduce((sum: number, l: any) => {
    return sum + convertToBRL(Number(l.valor_licenca || 0), l.moeda || "BRL", cotacoes);
  }, 0);

  const ferramentaMoeda = ferramenta?.moeda || "BRL";
  const valorMensal = Number(ferramenta?.valor_mensal || 0);
  const valorMensalBRL = convertToBRL(valorMensal, ferramentaMoeda, cotacoes);
  const diferenca = Math.abs(somaLicencasBRL - valorMensalBRL);
  const valido = diferenca < 0.01;

  // Cost center distribution (in BRL)
  const centroCustoDistribution = (() => {
    const map: Record<string, { descricao: string; codigo: string; valor: number }> = {};
    (licencas as any[]).forEach((l: any) => {
      const cc = l.centros_custo;
      if (!cc) return;
      if (!map[cc.id]) map[cc.id] = { descricao: cc.descricao, codigo: cc.codigo, valor: 0 };
      map[cc.id].valor += convertToBRL(Number(l.valor_licenca || 0), l.moeda || "BRL", cotacoes);
    });
    const total = somaLicencasBRL || 1;
    return Object.entries(map).map(([id, info]) => ({
      id,
      ...info,
      percentual: (info.valor / total) * 100,
    }));
  })();

  // Show exchange rate info
  const activeCotacao = cotacoes && ferramentaMoeda !== "BRL" ? cotacoes[ferramentaMoeda] : null;

  const resetForm = () => {
    setFornecedorId("");
    setCentroCustoId("");
    setDescricaoUsuario("");
    setValorLicenca(0);
    setMoeda("BRL");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (licenca: any) => {
    setEditingId(licenca.id);
    setFornecedorId(licenca.fornecedor_id);
    setCentroCustoId(licenca.centro_custo_id || "");
    setDescricaoUsuario(licenca.descricao_usuario || "");
    setValorLicenca(Number(licenca.valor_licenca));
    setMoeda(licenca.moeda || "BRL");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fornecedorId) {
      toast({ title: "Selecione um fornecedor", variant: "destructive" });
      return;
    }
    if (!centroCustoId) {
      toast({ title: "Selecione um centro de custo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const data = {
        ferramenta_id: ferramentaId,
        fornecedor_id: fornecedorId,
        centro_custo_id: centroCustoId,
        descricao_usuario: descricaoUsuario || null,
        valor_licenca: valorLicenca,
        moeda,
      };

      if (editingId) {
        const { error } = await supabase
          .from("ferramentas_software_licencas" as any)
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Licença atualizada" });
      } else {
        const { error } = await supabase
          .from("ferramentas_software_licencas" as any)
          .insert(data);
        if (error) throw error;
        toast({ title: "Licença adicionada" });
      }

      queryClient.invalidateQueries({ queryKey: ["ferramentas-licencas", ferramentaId] });
      queryClient.invalidateQueries({ queryKey: ["ferramentas-software"] });
      resetForm();
    } catch (error: any) {
      toast({ title: "Erro ao salvar licença", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ferramentas_software_licencas" as any)
        .update({ status: "inativo" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Licença removida" });
      queryClient.invalidateQueries({ queryKey: ["ferramentas-licencas", ferramentaId] });
      queryClient.invalidateQueries({ queryKey: ["ferramentas-software"] });
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  };

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Licenças — {ferramenta?.nome}
            {ferramentaMoeda !== "BRL" && (
              <Badge variant="outline">{ferramentaMoeda}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Exchange Rate Info */}
        {activeCotacao && (
          <p className="text-xs text-muted-foreground">
            Cotação {ferramentaMoeda}: {formatBRL(activeCotacao.cotacao)} 
            {activeCotacao.data && ` (${new Date(activeCotacao.data).toLocaleDateString("pt-BR")})`}
          </p>
        )}

        {/* Validation Alert */}
        <Alert variant={valido ? "default" : "destructive"} className="mb-2">
          <div className="flex items-center gap-2">
            {valido ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4" />}
            <AlertDescription className="flex-1">
              <span className="font-medium">
                Soma licenças (BRL): {formatBRL(somaLicencasBRL)}
              </span>
              {" / "}
              <span className="font-medium">
                Valor mensal (BRL): {formatBRL(valorMensalBRL)}
              </span>
              {!valido && (
                <span className="ml-2 text-destructive font-semibold">
                  (Diferença: {formatBRL(diferenca)})
                </span>
              )}
            </AlertDescription>
          </div>
        </Alert>

        {/* Cost Center Distribution */}
        {centroCustoDistribution.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {centroCustoDistribution.map((cc) => (
              <Badge key={cc.id} variant="outline" className="text-xs">
                {cc.descricao} — {cc.percentual.toFixed(1)}% ({formatBRL(cc.valor)})
              </Badge>
            ))}
          </div>
        )}

        {/* Licenças Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor/Pessoa</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Valor (BRL)</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : (licencas as any[]).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma licença cadastrada</TableCell>
                </TableRow>
              ) : (
                (licencas as any[]).map((licenca: any) => {
                  const licMoeda = licenca.moeda || "BRL";
                  const valorOrig = Number(licenca.valor_licenca);
                  const valorBRL = convertToBRL(valorOrig, licMoeda, cotacoes);
                  return (
                    <TableRow key={licenca.id}>
                      <TableCell className="font-medium">
                        {licenca.fornecedores?.nome_fantasia || licenca.fornecedores?.razao_social || "—"}
                      </TableCell>
                      <TableCell>{licenca.descricao_usuario || "—"}</TableCell>
                      <TableCell>
                        {licenca.centros_custo ? (
                          <Badge variant="outline" className="text-xs">{licenca.centros_custo.descricao}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrencyWithSymbol(valorOrig, licMoeda)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatBRL(valorBRL)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(licenca)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(licenca.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add/Edit Form */}
        {showForm ? (
          <div className="border rounded-md p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">{editingId ? "Editar Licença" : "Nova Licença"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fornecedor/Pessoa *</Label>
                <SearchableSelect
                  options={fornecedorOptions}
                  value={fornecedorId}
                  onValueChange={setFornecedorId}
                  placeholder="Selecione..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Centro de Custo *</Label>
                <CentroCustoSelect value={centroCustoId} onValueChange={setCentroCustoId} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Usuário da Licença</Label>
                <Input value={descricaoUsuario} onChange={(e) => setDescricaoUsuario(e.target.value)} placeholder="Nome do usuário" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Moeda</Label>
                <Select value={moeda} onValueChange={setMoeda}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOEDAS_DISPONIVEIS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor da Licença</Label>
                <CurrencyInput value={valorLicenca} onChange={setValorLicenca} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Licença
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
