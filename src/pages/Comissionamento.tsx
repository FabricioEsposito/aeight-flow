import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Send, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Vendedor {
  id: string;
  nome: string;
  percentual_comissao: number;
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
  vendedor?: Vendedor;
}

interface ParcelaPaga {
  id: string;
  valor: number;
  data_recebimento: string;
  cliente: string;
  contrato_numero: string;
}

const meses = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export default function Comissionamento() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendedor, setSelectedVendedor] = useState<string>("");
  const [selectedMes, setSelectedMes] = useState<number>(new Date().getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState<number>(new Date().getFullYear());
  const [parcelasPagas, setParcelasPagas] = useState<ParcelaPaga[]>([]);
  const [loadingParcelas, setLoadingParcelas] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoComissao | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    fetchVendedores();
    fetchSolicitacoes();
  }, []);

  useEffect(() => {
    if (selectedVendedor && selectedMes && selectedAno) {
      fetchParcelasPagas();
    }
  }, [selectedVendedor, selectedMes, selectedAno]);

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from("vendedores")
        .select("id, nome, percentual_comissao")
        .eq("status", "ativo")
        .order("nome");

      if (error) throw error;
      setVendedores(data || []);
    } catch (error) {
      console.error("Erro ao carregar vendedores:", error);
    }
  };

  const fetchSolicitacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("solicitacoes_comissao")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar nomes dos vendedores
      const vendedorIds = [...new Set(data?.map((s) => s.vendedor_id) || [])];
      if (vendedorIds.length > 0) {
        const { data: vendedoresData } = await supabase
          .from("vendedores")
          .select("id, nome, percentual_comissao")
          .in("id", vendedorIds);

        const vendedorMap = new Map(vendedoresData?.map((v) => [v.id, v]) || []);
        const solicitacoesComVendedor = data?.map((s) => ({
          ...s,
          vendedor: vendedorMap.get(s.vendedor_id),
        }));

        setSolicitacoes(solicitacoesComVendedor || []);
      } else {
        setSolicitacoes(data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParcelasPagas = async () => {
    if (!selectedVendedor) return;

    setLoadingParcelas(true);
    try {
      const startDate = startOfMonth(new Date(selectedAno, selectedMes - 1));
      const endDate = endOfMonth(new Date(selectedAno, selectedMes - 1));

      // Buscar contratos do vendedor
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select("id, numero_contrato, cliente_id, clientes(razao_social, nome_fantasia)")
        .eq("vendedor_responsavel", selectedVendedor)
        .eq("tipo_contrato", "venda");

      if (contratosError) throw contratosError;

      if (!contratos || contratos.length === 0) {
        setParcelasPagas([]);
        return;
      }

      // Buscar contas a receber pagas no período para esses contratos
      const contratoIds = contratos.map((c) => c.id);
      
      const { data: parcelas, error: parcelasError } = await supabase
        .from("parcelas_contrato")
        .select("id, contrato_id, valor")
        .in("contrato_id", contratoIds);

      if (parcelasError) throw parcelasError;

      const parcelaIds = parcelas?.map((p) => p.id) || [];

      if (parcelaIds.length === 0) {
        setParcelasPagas([]);
        return;
      }

      const { data: contasReceber, error: contasError } = await supabase
        .from("contas_receber")
        .select("id, parcela_id, valor, data_recebimento, cliente_id, clientes(razao_social, nome_fantasia)")
        .in("parcela_id", parcelaIds)
        .eq("status", "pago")
        .gte("data_recebimento", format(startDate, "yyyy-MM-dd"))
        .lte("data_recebimento", format(endDate, "yyyy-MM-dd"));

      if (contasError) throw contasError;

      const parcelasComDetalhes: ParcelaPaga[] = (contasReceber || []).map((cr) => {
        const parcela = parcelas?.find((p) => p.id === cr.parcela_id);
        const contrato = contratos?.find((c) => c.id === parcela?.contrato_id);
        return {
          id: cr.id,
          valor: cr.valor,
          data_recebimento: cr.data_recebimento || "",
          cliente: cr.clientes?.nome_fantasia || cr.clientes?.razao_social || "N/A",
          contrato_numero: contrato?.numero_contrato || "N/A",
        };
      });

      setParcelasPagas(parcelasComDetalhes);
    } catch (error) {
      console.error("Erro ao carregar parcelas:", error);
    } finally {
      setLoadingParcelas(false);
    }
  };

  const calcularComissao = useMemo(() => {
    const vendedor = vendedores.find((v) => v.id === selectedVendedor);
    if (!vendedor) return { total: 0, comissao: 0, percentual: 0 };

    const total = parcelasPagas.reduce((acc, p) => acc + p.valor, 0);
    const comissao = total * (vendedor.percentual_comissao / 100);

    return {
      total,
      comissao,
      percentual: vendedor.percentual_comissao,
    };
  }, [parcelasPagas, selectedVendedor, vendedores]);

  const handleSolicitarAprovacao = async () => {
    if (!selectedVendedor || !user) return;

    try {
      // Verificar se já existe solicitação para este período
      const { data: existing } = await supabase
        .from("solicitacoes_comissao")
        .select("id")
        .eq("vendedor_id", selectedVendedor)
        .eq("mes_referencia", selectedMes)
        .eq("ano_referencia", selectedAno)
        .single();

      if (existing) {
        toast({
          title: "Atenção",
          description: "Já existe uma solicitação para este período.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("solicitacoes_comissao").insert({
        vendedor_id: selectedVendedor,
        solicitante_id: user.id,
        mes_referencia: selectedMes,
        ano_referencia: selectedAno,
        valor_total_vendas: calcularComissao.total,
        valor_comissao: calcularComissao.comissao,
        percentual_comissao: calcularComissao.percentual,
      });

      if (error) throw error;

      // Criar notificação para admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const vendedor = vendedores.find((v) => v.id === selectedVendedor);
        const notificacoes = admins.map((admin) => ({
          user_id: admin.user_id,
          titulo: "Nova solicitação de comissão",
          mensagem: `${vendedor?.nome} solicitou aprovação de comissão de ${formatCurrency(calcularComissao.comissao)} referente a ${meses.find((m) => m.value === selectedMes)?.label}/${selectedAno}.`,
          tipo: "info",
          referencia_tipo: "solicitacao_comissao",
        }));

        await supabase.from("notificacoes").insert(notificacoes);
      }

      toast({
        title: "Sucesso",
        description: "Solicitação de comissão enviada para aprovação.",
      });

      setSubmitDialogOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error("Erro ao solicitar aprovação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    }
  };

  const handleAprovar = async () => {
    if (!selectedSolicitacao || !user) return;

    try {
      const { error } = await supabase
        .from("solicitacoes_comissao")
        .update({
          status: "aprovado",
          aprovador_id: user.id,
          data_aprovacao: new Date().toISOString(),
        })
        .eq("id", selectedSolicitacao.id);

      if (error) throw error;

      // Notificar solicitante
      await supabase.from("notificacoes").insert({
        user_id: selectedSolicitacao.solicitante_id,
        titulo: "Comissão aprovada",
        mensagem: `Sua solicitação de comissão de ${formatCurrency(selectedSolicitacao.valor_comissao)} referente a ${meses.find((m) => m.value === selectedSolicitacao.mes_referencia)?.label}/${selectedSolicitacao.ano_referencia} foi aprovada.`,
        tipo: "success",
        referencia_tipo: "solicitacao_comissao",
        referencia_id: selectedSolicitacao.id,
      });

      toast({
        title: "Sucesso",
        description: "Comissão aprovada com sucesso.",
      });

      setApprovalDialogOpen(false);
      setSelectedSolicitacao(null);
      fetchSolicitacoes();
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar a comissão.",
        variant: "destructive",
      });
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

      // Notificar solicitante
      await supabase.from("notificacoes").insert({
        user_id: selectedSolicitacao.solicitante_id,
        titulo: "Comissão rejeitada",
        mensagem: `Sua solicitação de comissão de ${formatCurrency(selectedSolicitacao.valor_comissao)} referente a ${meses.find((m) => m.value === selectedSolicitacao.mes_referencia)?.label}/${selectedSolicitacao.ano_referencia} foi rejeitada. Motivo: ${motivoRejeicao}`,
        tipo: "error",
        referencia_tipo: "solicitacao_comissao",
        referencia_id: selectedSolicitacao.id,
      });

      toast({
        title: "Sucesso",
        description: "Comissão rejeitada.",
      });

      setRejectionDialogOpen(false);
      setMotivoRejeicao("");
      setSelectedSolicitacao(null);
      fetchSolicitacoes();
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a comissão.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      case "aprovado":
        return <Badge className="bg-green-500">Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredSolicitacoes = isAdmin
    ? solicitacoes
    : solicitacoes.filter((s) => s.solicitante_id === user?.id);

  const totalPages = Math.ceil(filteredSolicitacoes.length / itemsPerPage);
  const paginatedSolicitacoes = filteredSolicitacoes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comissionamento</h1>
          <p className="text-muted-foreground">
            Gerencie as comissões da equipe de vendas
          </p>
        </div>

        {/* Calculadora de Comissão */}
        <Card>
          <CardHeader>
            <CardTitle>Calcular Comissão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select
                  value={selectedMes.toString()}
                  onValueChange={(v) => setSelectedMes(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select
                  value={selectedAno.toString()}
                  onValueChange={(v) => setSelectedAno(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedVendedor && (
              <>
                <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Recebido</div>
                      <div className="text-2xl font-bold">{formatCurrency(calcularComissao.total)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Percentual</div>
                      <div className="text-2xl font-bold">{calcularComissao.percentual}%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Valor da Comissão</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(calcularComissao.comissao)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de parcelas pagas */}
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcelasPagas.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.cliente}</TableCell>
                            <TableCell>{p.contrato_numero}</TableCell>
                            <TableCell>
                              {format(new Date(p.data_recebimento + "T00:00:00"), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(p.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma parcela recebida neste período para o vendedor selecionado.
                  </p>
                )}

                {calcularComissao.total > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => setSubmitDialogOpen(true)}>
                      <Send className="w-4 h-4 mr-2" />
                      Solicitar Aprovação
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Lista de Solicitações */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdmin ? "Solicitações de Comissão" : "Minhas Solicitações"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Total Vendas</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSolicitacoes.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.vendedor?.nome || "N/A"}
                    </TableCell>
                    <TableCell>
                      {meses.find((m) => m.value === s.mes_referencia)?.label}/{s.ano_referencia}
                    </TableCell>
                    <TableCell>{formatCurrency(s.valor_total_vendas)}</TableCell>
                    <TableCell>{formatCurrency(s.valor_comissao)}</TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSolicitacao(s);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && s.status === "pendente" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSolicitacao(s);
                                setApprovalDialogOpen(true);
                              }}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSolicitacao(s);
                                setRejectionDialogOpen(true);
                              }}
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedSolicitacoes.length === 0 && (
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
              totalItems={filteredSolicitacoes.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Solicitação</DialogTitle>
            </DialogHeader>
            {selectedSolicitacao && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Vendedor</Label>
                    <p className="font-medium">{selectedSolicitacao.vendedor?.nome || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Período</Label>
                    <p className="font-medium">
                      {meses.find((m) => m.value === selectedSolicitacao.mes_referencia)?.label}/
                      {selectedSolicitacao.ano_referencia}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total de Vendas</Label>
                    <p className="font-medium">{formatCurrency(selectedSolicitacao.valor_total_vendas)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Percentual</Label>
                    <p className="font-medium">{selectedSolicitacao.percentual_comissao}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor da Comissão</Label>
                    <p className="font-medium text-green-600">
                      {formatCurrency(selectedSolicitacao.valor_comissao)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(selectedSolicitacao.status)}</div>
                  </div>
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

        {/* Dialog de Confirmação de Solicitação */}
        <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Solicitação</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja solicitar aprovação da comissão de{" "}
                <strong>{formatCurrency(calcularComissao.comissao)}</strong> referente a{" "}
                {meses.find((m) => m.value === selectedMes)?.label}/{selectedAno}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSolicitarAprovacao}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Aprovação */}
        <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aprovar Comissão</AlertDialogTitle>
              <AlertDialogDescription>
                Confirma a aprovação da comissão de{" "}
                <strong>{selectedSolicitacao && formatCurrency(selectedSolicitacao.valor_comissao)}</strong>{" "}
                para o vendedor{" "}
                <strong>{selectedSolicitacao?.vendedor?.nome}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAprovar} className="bg-green-600 hover:bg-green-700">
                Aprovar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Rejeição */}
        <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Comissão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Informe o motivo da rejeição da comissão de{" "}
                <strong>{selectedSolicitacao && formatCurrency(selectedSolicitacao.valor_comissao)}</strong>{" "}
                do vendedor <strong>{selectedSolicitacao?.vendedor?.nome}</strong>.
              </p>
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Textarea
                  id="motivo"
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejeitar}
                disabled={!motivoRejeicao.trim()}
              >
                Rejeitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
