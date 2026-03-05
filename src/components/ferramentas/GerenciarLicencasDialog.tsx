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
import { CentroCustoRateio, RateioItem } from "@/components/contratos/CentroCustoRateio";
import { MOEDAS_DISPONIVEIS, formatCurrencyWithSymbol, convertToBRL } from "@/hooks/useCotacaoMoedas";
import { CompanyTagWithPercent } from "@/components/centro-custos/CompanyBadge";

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
  const [descricaoUsuario, setDescricaoUsuario] = useState("");
  const [valorLicenca, setValorLicenca] = useState(0);
  const [moeda, setMoeda] = useState("BRL");
  const [rateio, setRateio] = useState<RateioItem[]>([]);
  const [saving, setSaving] = useState(false);

  const ferramentaId = ferramenta?.id;

  // Fetch licenses with their cost center allocations
  const { data: licencas = [], isLoading } = useQuery({
    queryKey: ["ferramentas-licencas", ferramentaId],
    queryFn: async () => {
      if (!ferramentaId) return [];
      const { data, error } = await supabase
        .from("ferramentas_software_licencas" as any)
        .select("*, fornecedores(razao_social, nome_fantasia)")
        .eq("ferramenta_id", ferramentaId)
        .eq("status", "ativo")
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch cost center allocations for all licenses
      const licIds = (data || []).map((l: any) => l.id);
      if (licIds.length === 0) return [];

      const { data: ccData, error: ccError } = await supabase
        .from("ferramentas_licencas_centros_custo" as any)
        .select("*, centros_custo(id, descricao, codigo)")
        .in("licenca_id", licIds);
      if (ccError) throw ccError;

      // Group CC allocations by license
      const ccMap: Record<string, any[]> = {};
      (ccData || []).forEach((cc: any) => {
        if (!ccMap[cc.licenca_id]) ccMap[cc.licenca_id] = [];
        ccMap[cc.licenca_id].push(cc);
      });

      return (data || []).map((l: any) => ({
        ...l,
        centros_custo_rateio: ccMap[l.id] || [],
      }));
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

  // Aggregate cost center distribution across all licenses (in BRL)
  const centroCustoDistribution = (() => {
    const map: Record<string, { descricao: string; codigo: string; valor: number }> = {};
    (licencas as any[]).forEach((l: any) => {
      const valorBRL = convertToBRL(Number(l.valor_licenca || 0), l.moeda || "BRL", cotacoes);
      (l.centros_custo_rateio || []).forEach((cc: any) => {
        const ccInfo = cc.centros_custo;
        if (!ccInfo) return;
        if (!map[ccInfo.id]) map[ccInfo.id] = { descricao: ccInfo.descricao, codigo: ccInfo.codigo, valor: 0 };
        map[ccInfo.id].valor += valorBRL * (Number(cc.percentual) / 100);
      });
    });
    const total = somaLicencasBRL || 1;
    return Object.entries(map).map(([id, info]) => ({
      id,
      ...info,
      percentual: (info.valor / total) * 100,
    }));
  })();

  const activeCotacao = cotacoes && ferramentaMoeda !== "BRL" ? cotacoes[ferramentaMoeda] : null;

  const resetForm = () => {
    setFornecedorId("");
    setDescricaoUsuario("");
    setValorLicenca(0);
    setMoeda("BRL");
    setRateio([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (licenca: any) => {
    setEditingId(licenca.id);
    setFornecedorId(licenca.fornecedor_id);
    setDescricaoUsuario(licenca.descricao_usuario || "");
    setValorLicenca(Number(licenca.valor_licenca));
    setMoeda(licenca.moeda || "BRL");
    // Load existing rateio
    const existingRateio = (licenca.centros_custo_rateio || []).map((cc: any) => ({
      centro_custo_id: cc.centro_custo_id,
      codigo: cc.centros_custo?.codigo || "",
      descricao: cc.centros_custo?.descricao || "",
      percentual: Number(cc.percentual),
    }));
    setRateio(existingRateio);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fornecedorId) {
      toast({ title: "Selecione um fornecedor", variant: "destructive" });
      return;
    }
    if (rateio.length === 0) {
      toast({ title: "Adicione pelo menos um centro de custo", variant: "destructive" });
      return;
    }
    const totalPerc = rateio.reduce((s, r) => s + r.percentual, 0);
    if (Math.abs(totalPerc - 100) > 0.01) {
      toast({ title: "A soma dos percentuais deve ser 100%", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const licData = {
        ferramenta_id: ferramentaId,
        fornecedor_id: fornecedorId,
        descricao_usuario: descricaoUsuario || null,
        valor_licenca: valorLicenca,
        moeda,
      };

      let licencaId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("ferramentas_software_licencas" as any)
          .update(licData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("ferramentas_software_licencas" as any)
          .insert(licData)
          .select("id")
          .single();
        if (error) throw error;
        licencaId = (data as any).id;
      }

      // Update rateio: delete existing, insert new
      await supabase
        .from("ferramentas_licencas_centros_custo" as any)
        .delete()
        .eq("licenca_id", licencaId);

      const ccInserts = rateio.map((r) => ({
        licenca_id: licencaId,
        centro_custo_id: r.centro_custo_id,
        percentual: r.percentual,
      }));

      const { error: ccError } = await supabase
        .from("ferramentas_licencas_centros_custo" as any)
        .insert(ccInserts);
      if (ccError) throw ccError;

      toast({ title: editingId ? "Licença atualizada" : "Licença adicionada" });
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
                <TableHead>Centros de Custo</TableHead>
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
                  const ccRateio = licenca.centros_custo_rateio || [];
                  return (
                    <TableRow key={licenca.id}>
                      <TableCell className="font-medium">
                        {licenca.fornecedores?.nome_fantasia || licenca.fornecedores?.razao_social || "—"}
                      </TableCell>
                      <TableCell>{licenca.descricao_usuario || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ccRateio.length > 0 ? ccRateio.map((cc: any) => (
                            <CompanyTagWithPercent
                              key={cc.id}
                              codigo={cc.centros_custo?.codigo || ""}
                              percentual={Number(cc.percentual)}
                              className="text-xs"
                            />
                          )) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
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
                <Label className="text-xs">Usuário da Licença</Label>
                <Input value={descricaoUsuario} onChange={(e) => setDescricaoUsuario(e.target.value)} placeholder="Nome do usuário" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="pt-2">
              <CentroCustoRateio
                value={rateio}
                onChange={setRateio}
                valorTotal={convertToBRL(valorLicenca, moeda, cotacoes)}
              />
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
