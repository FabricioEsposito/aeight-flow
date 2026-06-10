import { useState, useEffect, useMemo } from "react";
import { useSessionState } from "@/hooks/useSessionState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, X, Send, Eye, RotateCcw, Pencil } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subDays, subMonths, lastDayOfMonth } from "date-fns";
import { DateRangeFilter, DateRangePreset } from "@/components/financeiro/DateRangeFilter";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ContaBancariaSelect } from "@/components/financeiro/ContaBancariaSelect";

interface Parceiro {
  id: string;
  nome: string;
  percentual_comissao: number;
  fornecedor_id: string | null;
}

interface SolicitacaoComissao {
  id: string;
  vendedor_id: string;
  solicitante_id: string;
  mes_referencia: number;
  ano_referencia: number;
  valor_total_vendas: number;
  valor_comissao: number;
  percentual_comissao: number;
  status: string;
  aprovador_id: string | null;
  data_aprovacao: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  parceiro?: Parceiro;
}

interface ParcelaPaga {
  id: string;
  valor: number;
  data_recebimento: string;
  cliente: string;
  contrato_numero: string;
  percentual_comissao: number;
  valor_comissao: number;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const meses = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" }, { value: 3, label: "Março" },
  { value: 4, label: "Abril" }, { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" }, { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" }, { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

export default function ComissionamentoParceiros() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParceiro, setSelectedParceiro] = useState<string>("");
  const [parcelasPagas, setParcelasPagas] = useState<ParcelaPaga[]>([]);
  const [loadingParcelas, setLoadingParcelas] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [dateRangePreset, setDateRangePreset] = useSessionState<DateRangePreset>("comissao-parceiros", "datePreset", "este-mes");
  const [customDateRange, setCustomDateRange] = useSessionState<DateRange>("comissao-parceiros", "customDateRange", { from: undefined, to: undefined });

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoComissao | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [aprovacaoDataVencimento, setAprovacaoDataVencimento] = useState<string>("");
  const [aprovacaoContaBancariaId, setAprovacaoContaBancariaId] = useState<string>("");
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);

  // Edição inline de percentual de comissão
  const [editingComissaoId, setEditingComissaoId] = useState<string | null>(null);
  const [editingComissaoValue, setEditingComissaoValue] = useState<string>("");

  const { user } = useAuth();
  const { permissions } = useUserRole();
  const { toast } = useToast();

  const canApproveCommissions = permissions.canApproveCommissions;

  const getDateRange = (): { start: Date; end: Date } | null => {
    const today = new Date();
    if (dateRangePreset === "periodo-personalizado" && customDateRange.from && customDateRange.to) {
      return { start: customDateRange.from, end: customDateRange.to };
    }
    switch (dateRangePreset) {
      case "hoje": return { start: today, end: today };
      case "esta-semana": return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case "este-mes": return { start: startOfMonth(today), end: endOfMonth(today) };
      case "este-ano": return { start: startOfYear(today), end: endOfYear(today) };
      case "ultimos-30-dias": return { start: subDays(today, 30), end: today };
      case "ultimos-12-meses": return { start: subMonths(today, 12), end: today };
      case "todo-periodo": return null;
      default: return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  };

  const getReferencePeriod = () => {
    const r = getDateRange();
    if (r) return { mes: r.start.getMonth() + 1, ano: r.start.getFullYear() };
    const t = new Date();
    return { mes: t.getMonth() + 1, ano: t.getFullYear() };
  };

  const handleDateRangeChange = (preset: DateRangePreset, range?: DateRange) => {
    setDateRangePreset(preset);
    if (range) setCustomDateRange(range);
  };

  useEffect(() => {
    fetchParceiros();
    fetchSolicitacoes();
  }, [dateRangePreset, customDateRange]);

  useEffect(() => {
    if (selectedParceiro) fetchParcelasPagas();
  }, [selectedParceiro, dateRangePreset, customDateRange]);

  const fetchParceiros = async () => {
    try {
      const sb: any = supabase;
      const { data, error } = await sb
        .from("vendedores")
        .select("id, nome, percentual_comissao, fornecedor_id")
        .eq("status", "ativo")
        .eq("is_merged", false)
        .eq("tipo", "parceiro")
        .order("nome");
      if (error) throw error;
      setParceiros(data || []);
    } catch (e) {
      console.error("Erro ao carregar parceiros:", e);
    }
  };

  const fetchSolicitacoes = async () => {
    try {
      const { mes, ano } = getReferencePeriod();
      let query = supabase.from("solicitacoes_comissao").select("*").order("created_at", { ascending: false });
      if (dateRangePreset !== "todo-periodo") {
        query = query.eq("mes_referencia", mes).eq("ano_referencia", ano);
      }
      const { data, error } = await query;
      if (error) throw error;

      const ids = [...new Set(data?.map((s) => s.vendedor_id) || [])];
      if (ids.length === 0) {
        setSolicitacoes([]);
        return;
      }
      const sb: any = supabase;
      const { data: parc } = await sb
        .from("vendedores")
        .select("id, nome, percentual_comissao, fornecedor_id, tipo")
        .in("id", ids)
        .eq("tipo", "parceiro");
      const map = new Map((parc || []).map((p: any) => [p.id, p]));
      const onlyParceiros = (data || [])
        .filter((s) => map.has(s.vendedor_id))
        .map((s) => ({ ...s, parceiro: map.get(s.vendedor_id) as Parceiro }));
      setSolicitacoes(onlyParceiros);
    } catch (e) {
      console.error("Erro ao carregar solicitações:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchParcelasPagas = async () => {
    if (!selectedParceiro) return;
    const dateRange = getDateRange();
    if (!dateRange) {
      setParcelasPagas([]);
      return;
    }
    setLoadingParcelas(true);
    try {
      const parceiro = parceiros.find((p) => p.id === selectedParceiro);
      const percentual = Number(parceiro?.percentual_comissao || 0);

      const sb: any = supabase;
      const { data: contratos, error: cErr } = await sb
        .from("contratos")
        .select("id, numero_contrato, cliente_id, clientes(razao_social, nome_fantasia)")
        .eq("parceiro_id", selectedParceiro)
        .eq("tipo_contrato", "venda");
      if (cErr) throw cErr;

      if (!contratos || contratos.length === 0) {
        setParcelasPagas([]);
        return;
      }
      const contratoIds = contratos.map((c: any) => c.id);
      const { data: parcelas, error: pErr } = await supabase
        .from("parcelas_contrato")
        .select("id, contrato_id, valor")
        .in("contrato_id", contratoIds);
      if (pErr) throw pErr;

      const parcelaIds = (parcelas || []).map((p) => p.id);
      if (parcelaIds.length === 0) {
        setParcelasPagas([]);
        return;
      }

      const { data: contasReceber, error: crErr } = await supabase
        .from("contas_receber")
        .select("id, parcela_id, valor, data_recebimento, clientes(razao_social, nome_fantasia)")
        .in("parcela_id", parcelaIds)
        .eq("status", "pago")
        .gte("data_recebimento", format(dateRange.start, "yyyy-MM-dd"))
        .lte("data_recebimento", format(dateRange.end, "yyyy-MM-dd"));
      if (crErr) throw crErr;

      const result: ParcelaPaga[] = (contasReceber || []).map((cr: any) => {
        const parcela = parcelas?.find((p) => p.id === cr.parcela_id);
        const contrato = contratos?.find((c: any) => c.id === parcela?.contrato_id);
        const valorComissao = Number(cr.valor) * (percentual / 100);
        return {
          id: cr.id,
          valor: Number(cr.valor),
          data_recebimento: cr.data_recebimento || "",
          cliente: cr.clientes?.nome_fantasia || cr.clientes?.razao_social || "N/A",
          contrato_numero: contrato?.numero_contrato || "N/A",
          percentual_comissao: percentual,
          valor_comissao: valorComissao,
        };
      });
      setParcelasPagas(result);
    } catch (e) {
      console.error("Erro ao carregar parcelas:", e);
    } finally {
      setLoadingParcelas(false);
    }
  };

  const calculo = useMemo(() => {
    const parceiro = parceiros.find((p) => p.id === selectedParceiro);
    const total = parcelasPagas.reduce((acc, p) => acc + p.valor, 0);
    const comissao = parcelasPagas.reduce((acc, p) => acc + p.valor_comissao, 0);
    return { total, comissao, percentual: Number(parceiro?.percentual_comissao || 0) };
  }, [parcelasPagas, selectedParceiro, parceiros]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleSolicitarAprovacao = async () => {
    if (!selectedParceiro || !user) return;
    const { mes, ano } = getReferencePeriod();
    try {
      const { data: existing } = await supabase
        .from("solicitacoes_comissao")
        .select("id")
        .eq("vendedor_id", selectedParceiro)
        .eq("mes_referencia", mes)
        .eq("ano_referencia", ano)
        .in("status", ["pendente", "aprovado"])
        .maybeSingle();
      if (existing) {
        toast({ title: "Atenção", description: "Já existe uma solicitação para este período.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("solicitacoes_comissao").insert({
        vendedor_id: selectedParceiro,
        solicitante_id: user.id,
        mes_referencia: mes,
        ano_referencia: ano,
        valor_total_vendas: calculo.total,
        valor_comissao: calculo.comissao,
        percentual_comissao: calculo.percentual,
      });
      if (error) throw error;

      const { data: approvers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "finance_manager", "commercial_manager"]);
      if (approvers && approvers.length > 0) {
        const parceiro = parceiros.find((p) => p.id === selectedParceiro);
        await supabase.from("notificacoes").insert(
          approvers.map((a) => ({
            user_id: a.user_id,
            titulo: "Nova solicitação de comissão (Parceiro)",
            mensagem: `${parceiro?.nome} (parceiro) solicitou aprovação de comissão de ${formatCurrency(calculo.comissao)} referente a ${meses.find((m) => m.value === mes)?.label}/${ano}.`,
            tipo: "info",
            referencia_tipo: "solicitacao_comissao",
          }))
        );
      }
      toast({ title: "Sucesso", description: "Solicitação enviada para aprovação." });
      setSubmitDialogOpen(false);
      fetchSolicitacoes();
    } catch (e) {
      console.error("Erro ao solicitar:", e);
      toast({ title: "Erro", description: "Não foi possível enviar a solicitação.", variant: "destructive" });
    }
  };

  const handleAprovar = async () => {
    if (!selectedSolicitacao || !user) return;
    if (!aprovacaoDataVencimento) {
      toast({ title: "Atenção", description: "Informe a data de vencimento.", variant: "destructive" });
      return;
    }
    if (!aprovacaoContaBancariaId) {
      toast({ title: "Atenção", description: "Selecione a conta bancária.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from("solicitacoes_comissao")
        .update({
          status: "aprovado",
          aprovador_id: user.id,
          data_aprovacao: new Date().toISOString(),
          conta_pagar_gerada: true,
        })
        .eq("id", selectedSolicitacao.id);
      if (error) throw error;

      const { data: planoContas } = await supabase
        .from("plano_contas")
        .select("id")
        .eq("codigo", "2.1.7")
        .maybeSingle();

      const parceiro = selectedSolicitacao.parceiro;
      const fornecedorId = parceiro?.fornecedor_id;
      if (!fornecedorId) {
        toast({
          title: "Erro",
          description: "O parceiro não possui um fornecedor vinculado. Vincule um fornecedor no cadastro de parceiros.",
          variant: "destructive",
        });
        return;
      }

      const mesLabel = meses.find((m) => m.value === selectedSolicitacao.mes_referencia)?.label;
      const descricao = `Comissão Parceiro ${parceiro?.nome} - ${mesLabel}/${selectedSolicitacao.ano_referencia}`;
      const dataCompetencia = format(new Date(selectedSolicitacao.ano_referencia, selectedSolicitacao.mes_referencia - 1, 1), "yyyy-MM-dd");

      const { error: cpErr } = await supabase.from("contas_pagar").insert({
        descricao,
        valor: selectedSolicitacao.valor_comissao,
        data_competencia: dataCompetencia,
        data_vencimento: aprovacaoDataVencimento,
        fornecedor_id: fornecedorId,
        plano_conta_id: planoContas?.id || null,
        conta_bancaria_id: aprovacaoContaBancariaId,
        status: "pendente",
        observacoes: `Comissão de parceiro aprovada em ${format(new Date(), "dd/MM/yyyy")}. Solicitação ID: ${selectedSolicitacao.id}`,
      });
      if (cpErr) console.error("Erro ao criar conta a pagar:", cpErr);

      await supabase.from("notificacoes").insert({
        user_id: selectedSolicitacao.solicitante_id,
        titulo: "Comissão de parceiro aprovada",
        mensagem: `Solicitação de comissão de ${formatCurrency(selectedSolicitacao.valor_comissao)} referente a ${mesLabel}/${selectedSolicitacao.ano_referencia} foi aprovada.`,
        tipo: "success",
        referencia_tipo: "solicitacao_comissao",
        referencia_id: selectedSolicitacao.id,
      });

      toast({ title: "Sucesso", description: "Comissão aprovada e lançada em Contas a Pagar." });
      setApprovalDialogOpen(false);
      setSelectedSolicitacao(null);
      fetchSolicitacoes();
    } catch (e) {
      console.error("Erro ao aprovar:", e);
      toast({ title: "Erro", description: "Não foi possível aprovar.", variant: "destructive" });
    }
  };

  const handleRejeitar = async () => {
    if (!selectedSolicitacao || !user || !motivoRejeicao.trim()) return;
    try {
      const { error } = await supabase
        .from("solicitacoes_comissao")
        .update({
          status: "rejeitado",
          aprovador_id: user.id,
          data_aprovacao: new Date().toISOString(),
          motivo_rejeicao: motivoRejeicao,
        })
        .eq("id", selectedSolicitacao.id);
      if (error) throw error;

      await supabase.from("notificacoes").insert({
        user_id: selectedSolicitacao.solicitante_id,
        titulo: "Comissão de parceiro rejeitada",
        mensagem: `Solicitação de comissão de ${formatCurrency(selectedSolicitacao.valor_comissao)} foi rejeitada. Motivo: ${motivoRejeicao}`,
        tipo: "error",
        referencia_tipo: "solicitacao_comissao",
        referencia_id: selectedSolicitacao.id,
      });
      toast({ title: "Sucesso", description: "Comissão rejeitada." });
      setRejectionDialogOpen(false);
      setMotivoRejeicao("");
      setSelectedSolicitacao(null);
      fetchSolicitacoes();
    } catch (e) {
      console.error("Erro ao rejeitar:", e);
      toast({ title: "Erro", description: "Não foi possível rejeitar.", variant: "destructive" });
    }
  };

  const handleReverter = async () => {
    if (!selectedSolicitacao || !user) return;
    try {
      const mesLabel = meses.find((m) => m.value === selectedSolicitacao.mes_referencia)?.label;
      const descricao = `Comissão Parceiro ${selectedSolicitacao.parceiro?.nome} - ${mesLabel}/${selectedSolicitacao.ano_referencia}`;
      await supabase.from("contas_pagar").delete().ilike("descricao", `%${descricao}%`);

      const { error } = await supabase
        .from("solicitacoes_comissao")
        .update({ status: "pendente", aprovador_id: null, data_aprovacao: null, conta_pagar_gerada: false })
        .eq("id", selectedSolicitacao.id);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Aprovação revertida." });
      setRevertDialogOpen(false);
      setSelectedSolicitacao(null);
      fetchSolicitacoes();
    } catch (e) {
      console.error("Erro ao reverter:", e);
      toast({ title: "Erro", description: "Não foi possível reverter.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="secondary">Pendente</Badge>;
      case "aprovado": return <Badge className="bg-green-500">Aprovado</Badge>;
      case "rejeitado": return <Badge variant="destructive">Rejeitado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(solicitacoes.length / itemsPerPage);
  const paginated = solicitacoes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comissionamento de Parceiros</h1>
          <p className="text-muted-foreground">
            Comissões de parceiros indicadores sobre os recebimentos dos contratos indicados
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <DateRangeFilter value={dateRangePreset} onChange={handleDateRangeChange} customRange={customDateRange} />
          <div className="w-[240px]">
            <SearchableSelect
              value={selectedParceiro}
              onValueChange={setSelectedParceiro}
              options={parceiros.map((p) => ({ value: p.id, label: p.nome }))}
              placeholder="Selecione um parceiro"
              searchPlaceholder="Buscar parceiro..."
              emptyMessage="Nenhum parceiro encontrado."
            />
          </div>
        </div>
      </div>

      {selectedParceiro && (
        <Card>
          <CardHeader>
            <CardTitle>Calcular Comissão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Recebido</div>
                  <div className="text-2xl font-bold">{formatCurrency(calculo.total)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Percentual</div>
                  <div className="text-2xl font-bold">{calculo.percentual}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Valor da Comissão</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(calculo.comissao)}</div>
                </CardContent>
              </Card>
            </div>

            {loadingParcelas ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : parcelasPagas.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium">Parcelas Recebidas no Período</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Data Recebimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">% Comissão</TableHead>
                      <TableHead className="text-right">Valor Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelasPagas.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.cliente}</TableCell>
                        <TableCell>{p.contrato_numero}</TableCell>
                        <TableCell>{format(new Date(p.data_recebimento + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.valor)}</TableCell>
                        <TableCell className="text-right">{p.percentual_comissao.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-medium text-primary">{formatCurrency(p.valor_comissao)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma parcela recebida neste período para o parceiro selecionado.
              </p>
            )}

            {calculo.total > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => setSubmitDialogOpen(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Solicitar Aprovação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Comissão (Parceiros)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parceiro</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Total Recebido</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.parceiro?.nome || "N/A"}</TableCell>
                  <TableCell>{meses.find((m) => m.value === s.mes_referencia)?.label}/{s.ano_referencia}</TableCell>
                  <TableCell>{formatCurrency(s.valor_total_vendas)}</TableCell>
                  <TableCell>{formatCurrency(s.valor_comissao)}</TableCell>
                  <TableCell>{getStatusBadge(s.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSolicitacao(s); setDetailsDialogOpen(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canApproveCommissions && s.status === "pendente" && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedSolicitacao(s);
                            setAprovacaoDataVencimento(format(lastDayOfMonth(new Date(s.ano_referencia, s.mes_referencia - 1, 1)), "yyyy-MM-dd"));
                            setAprovacaoContaBancariaId("");
                            setApprovalDialogOpen(true);
                          }}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedSolicitacao(s); setRejectionDialogOpen(true); }}>
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {canApproveCommissions && s.status === "aprovado" && (
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedSolicitacao(s); setRevertDialogOpen(true); }} title="Reverter aprovação">
                          <RotateCcw className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma solicitação encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={solicitacoes.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
          />
        </CardContent>
      </Card>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
          </DialogHeader>
          {selectedSolicitacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Parceiro</Label><p className="font-medium">{selectedSolicitacao.parceiro?.nome}</p></div>
                <div><Label className="text-muted-foreground">Período</Label><p className="font-medium">{meses.find((m) => m.value === selectedSolicitacao.mes_referencia)?.label}/{selectedSolicitacao.ano_referencia}</p></div>
                <div><Label className="text-muted-foreground">Total Recebido</Label><p className="font-medium">{formatCurrency(selectedSolicitacao.valor_total_vendas)}</p></div>
                <div><Label className="text-muted-foreground">Percentual</Label><p className="font-medium">{selectedSolicitacao.percentual_comissao}%</p></div>
                <div><Label className="text-muted-foreground">Valor da Comissão</Label><p className="font-medium text-green-600">{formatCurrency(selectedSolicitacao.valor_comissao)}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><div>{getStatusBadge(selectedSolicitacao.status)}</div></div>
              </div>
              {selectedSolicitacao.motivo_rejeicao && (
                <div>
                  <Label className="text-muted-foreground">Motivo da Rejeição</Label>
                  <p className="text-destructive">{selectedSolicitacao.motivo_rejeicao}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja solicitar aprovação da comissão de <strong>{formatCurrency(calculo.comissao)}</strong> referente a {meses.find((m) => m.value === getReferencePeriod().mes)?.label}/{getReferencePeriod().ano}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSolicitarAprovacao}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Comissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Confirma a aprovação da comissão de <strong>{selectedSolicitacao && formatCurrency(selectedSolicitacao.valor_comissao)}</strong> para o parceiro <strong>{selectedSolicitacao?.parceiro?.nome}</strong>?
            </p>
            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input type="date" value={aprovacaoDataVencimento} onChange={(e) => setAprovacaoDataVencimento(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Conta Bancária para Pagamento *</Label>
              <ContaBancariaSelect value={aprovacaoContaBancariaId} onValueChange={setAprovacaoContaBancariaId} placeholder="Selecione a conta bancária" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAprovar} className="bg-green-600 hover:bg-green-700 text-white" disabled={!aprovacaoDataVencimento || !aprovacaoContaBancariaId}>Aprovar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Comissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">Informe o motivo da rejeição.</p>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejeitar} disabled={!motivoRejeicao.trim()}>Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reverter a aprovação? O lançamento em Contas a Pagar será removido e o status voltará para pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReverter} className="bg-amber-600 hover:bg-amber-700">Reverter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
