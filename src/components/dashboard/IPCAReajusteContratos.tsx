import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CompanyTag } from "@/components/centro-custos/CompanyBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

interface CompanyThemeColors {
  primaryColor: string;
  lightColor: string;
}

interface IPCAReajusteContratosProps {
  selectedCentroCusto: string[];
  companyTheme: CompanyThemeColors | null;
}

interface ContratoElegivel {
  id: string;
  numero_contrato: string;
  cliente_nome: string;
  centro_custo: string | null;
  centro_custo_codigo: string | null;
  valor_total: number;
  valor_unitario: number;
  valor_bruto: number | null;
  data_inicio: string;
  data_reativacao: string | null;
  meses_vigencia: number;
  quantidade: number;
}

interface SimulacaoContrato extends ContratoElegivel {
  ipca_acumulado: number;
  valor_reajustado: number;
  diferenca: number;
}

export function IPCAReajusteContratos({ selectedCentroCusto, companyTheme }: IPCAReajusteContratosProps) {
  const [contratos, setContratos] = useState<ContratoElegivel[]>([]);
  const [simulacoes, setSimulacoes] = useState<SimulacaoContrato[]>([]);
  const [ipcaAcumulado, setIpcaAcumulado] = useState<number>(0);
  const [ipcaPeriodo, setIpcaPeriodo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIpca, setIsLoadingIpca] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [contratosAjustados, setContratosAjustados] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchContratos();
    fetchIPCA();
  }, [selectedCentroCusto]);

  useEffect(() => {
    if (contratos.length > 0 && !isLoadingIpca) {
      calcularSimulacoes();
    }
  }, [contratos, ipcaAcumulado, isLoadingIpca]);

  const fetchIPCA = async () => {
    try {
      setIsLoadingIpca(true);

      const { data: ipcaData, error } = await supabase.functions.invoke("ipca-lookup", {
        method: "POST",
      });

      if (error) throw error;
      setIpcaAcumulado(ipcaData.acumulado || 0);
      setIpcaPeriodo(ipcaData.periodo || "");
    } catch (error) {
      console.error("Erro ao buscar IPCA:", error);
      toast.error("Erro ao buscar dados do IPCA do Banco Central");
    } finally {
      setIsLoadingIpca(false);
    }
  };

  const fetchContratos = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from("contratos")
        .select(`
          id, numero_contrato, valor_total, valor_unitario, valor_bruto, 
          data_inicio, data_reativacao, centro_custo, quantidade,
          clientes(razao_social, nome_fantasia)
        `)
        .eq("tipo_contrato", "venda")
        .eq("status", "ativo")
        .eq("ajuste_ipca", true);

      if (selectedCentroCusto.length > 0) {
        query = query.in("centro_custo", selectedCentroCusto);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar contratos:", error);
        return;
      }

      // Fetch centros de custo for display
      const { data: centrosCusto } = await supabase
        .from("centros_custo")
        .select("id, codigo, descricao")
        .eq("status", "ativo");

      const centrosMap = new Map(
        (centrosCusto || []).map((cc) => [cc.id, cc.codigo])
      );

      const today = new Date();
      const elegiveis: ContratoElegivel[] = [];

      for (const contrato of data || []) {
        const dataRef = contrato.data_reativacao || contrato.data_inicio;
        const inicio = new Date(dataRef + "T00:00:00");
        const diffMs = today.getTime() - inicio.getTime();
        const mesesVigencia = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));

        if (mesesVigencia >= 12) {
          const cliente = contrato.clientes as any;
          elegiveis.push({
            id: contrato.id,
            numero_contrato: contrato.numero_contrato,
            cliente_nome: cliente?.nome_fantasia || cliente?.razao_social || "—",
            centro_custo: contrato.centro_custo,
            centro_custo_codigo: contrato.centro_custo ? centrosMap.get(contrato.centro_custo) || null : null,
            valor_total: Number(contrato.valor_total),
            valor_unitario: Number(contrato.valor_unitario),
            valor_bruto: contrato.valor_bruto ? Number(contrato.valor_bruto) : null,
            data_inicio: contrato.data_inicio,
            data_reativacao: contrato.data_reativacao,
            meses_vigencia: mesesVigencia,
            quantidade: contrato.quantidade,
          });
        }
      }

      setContratos(elegiveis);
    } catch (error) {
      console.error("Erro ao processar contratos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calcularSimulacoes = () => {
    const sims: SimulacaoContrato[] = contratos.map((c) => {
      const valorReajustado = Math.round(c.valor_total * (1 + ipcaAcumulado / 100) * 100) / 100;
      return {
        ...c,
        ipca_acumulado: ipcaAcumulado,
        valor_reajustado: valorReajustado,
        diferenca: Math.round((valorReajustado - c.valor_total) * 100) / 100,
      };
    });
    setSimulacoes(sims);
  };

  const aprovarReajuste = async (sim: SimulacaoContrato) => {
    try {
      setProcessando(sim.id);

      const fator = 1 + ipcaAcumulado / 100;
      const novoValorUnitario = Math.round(sim.valor_unitario * fator * 100) / 100;
      const novoValorTotal = Math.round(sim.valor_total * fator * 100) / 100;
      const novoValorBruto = sim.valor_bruto ? Math.round(sim.valor_bruto * fator * 100) / 100 : null;

      // 1. Update contract values
      const updateData: any = {
        valor_unitario: novoValorUnitario,
        valor_total: novoValorTotal,
      };
      if (novoValorBruto !== null) {
        updateData.valor_bruto = novoValorBruto;
      }

      const { error: contratoError } = await supabase
        .from("contratos")
        .update(updateData)
        .eq("id", sim.id);

      if (contratoError) throw contratoError;

      // 2. Update pending parcelas
      const { data: parcelas } = await supabase
        .from("parcelas_contrato")
        .select("id, valor")
        .eq("contrato_id", sim.id)
        .eq("status", "pendente");

      if (parcelas && parcelas.length > 0) {
        for (const parcela of parcelas) {
          const novoValorParcela = Math.round(Number(parcela.valor) * fator * 100) / 100;

          await supabase
            .from("parcelas_contrato")
            .update({ valor: novoValorParcela })
            .eq("id", parcela.id);

          // 3. Update linked contas_receber
          await supabase
            .from("contas_receber")
            .update({ valor: novoValorParcela })
            .eq("parcela_id", parcela.id)
            .in("status", ["pendente", "vencido"]);
        }
      }

      setContratosAjustados((prev) => new Set(prev).add(sim.id));
      toast.success(`Reajuste aprovado para o contrato ${sim.numero_contrato}`);
      
      // Refresh data
      fetchContratos();
    } catch (error) {
      console.error("Erro ao aprovar reajuste:", error);
      toast.error("Erro ao aprovar reajuste do contrato");
    } finally {
      setProcessando(null);
    }
  };

  const manterValor = (sim: SimulacaoContrato) => {
    setContratosAjustados((prev) => new Set(prev).add(sim.id));
    toast.info(`Contrato ${sim.numero_contrato} mantido. Reajuste sugerido na próxima renovação.`);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
  };

  if (isLoading || isLoadingIpca) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const contratosVisiveis = contratos.filter((c) => !contratosAjustados.has(c.id));
  const simulacoesVisiveis = simulacoes.filter((s) => !contratosAjustados.has(s.id));

  return (
    <div className="space-y-4">
      {/* IPCA Info */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
        <TrendingUp className="w-5 h-5 text-primary" />
        <div className="text-sm">
          <span className="font-medium">IPCA Acumulado 12 meses:</span>{" "}
          <span className="font-bold text-primary">
            {ipcaAcumulado.toFixed(2).replace(".", ",")}%
          </span>
          {ipcaPeriodo && (
            <span className="text-muted-foreground ml-2">({ipcaPeriodo})</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchIPCA} className="ml-auto">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {contratosVisiveis.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum contrato elegível para reajuste IPCA no momento.</p>
            <p className="text-xs mt-1">
              Contratos com ajuste IPCA ativado e 12+ meses de vigência aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table 1 - Contracts eligible for IPCA adjustment */}
          <Card style={companyTheme ? { borderColor: `${companyTheme.primaryColor}30` } : undefined}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2" style={companyTheme ? { color: companyTheme.primaryColor } : undefined}>
                <TrendingUp className="w-4 h-4" />
                Contratos para Reajuste IPCA
                <Badge variant="secondary" className="ml-auto">
                  {contratosVisiveis.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-96 relative">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="text-xs">Contrato</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Centro Custos</TableHead>
                      <TableHead className="text-xs text-right">Valor Atual</TableHead>
                      <TableHead className="text-xs">Início</TableHead>
                      <TableHead className="text-xs text-right">Meses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {contratosVisiveis.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs font-medium">{c.numero_contrato}</TableCell>
                        <TableCell className="text-xs">{c.cliente_nome}</TableCell>
                        <TableCell className="text-xs">
                          {c.centro_custo_codigo ? (
                            <CompanyTag codigo={c.centro_custo_codigo} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {formatCurrency(c.valor_total)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(c.data_reativacao || c.data_inicio)}
                        </TableCell>
                        <TableCell className="text-xs text-right">{c.meses_vigencia}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="sticky bottom-0 z-10 bg-muted/90 backdrop-blur-sm">
                    <TableRow className="font-semibold border-t-2">
                      <TableCell colSpan={3} className="text-xs font-bold">Subtotal</TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {formatCurrency(contratosVisiveis.reduce((sum, c) => sum + c.valor_total, 0))}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Table 2 - IPCA Adjustment Simulation */}
          <Card style={companyTheme ? { borderColor: `${companyTheme.primaryColor}30` } : undefined}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2" style={companyTheme ? { color: companyTheme.primaryColor } : undefined}>
                <TrendingUp className="w-4 h-4" />
                Simulação de Reajuste IPCA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-96 relative">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="text-xs">Contrato</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Centro Custos</TableHead>
                      <TableHead className="text-xs text-right">Atual</TableHead>
                      <TableHead className="text-xs text-right">IPCA</TableHead>
                      <TableHead className="text-xs text-right">Reajustado</TableHead>
                      <TableHead className="text-xs text-right">Diferença</TableHead>
                      <TableHead className="text-xs text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {simulacoesVisiveis.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs font-medium">{s.numero_contrato}</TableCell>
                        <TableCell className="text-xs">{s.cliente_nome}</TableCell>
                        <TableCell className="text-xs">
                          {s.centro_custo_codigo ? (
                            <CompanyTag codigo={s.centro_custo_codigo} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(s.valor_total)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-primary">
                          {s.ipca_acumulado.toFixed(2).replace(".", ",")}%
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold text-green-600">
                          {formatCurrency(s.valor_reajustado)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-green-600">
                          +{formatCurrency(s.diferenca)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => aprovarReajuste(s)}
                              disabled={processando === s.id}
                              title="Aprovar reajuste"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => manterValor(s)}
                              disabled={processando === s.id}
                              title="Manter valor atual"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="sticky bottom-0 z-10 bg-muted/90 backdrop-blur-sm">
                    <TableRow className="font-semibold border-t-2">
                      <TableCell colSpan={3} className="text-xs font-bold">Subtotal</TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {formatCurrency(simulacoesVisiveis.reduce((sum, s) => sum + s.valor_total, 0))}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-xs text-right font-bold text-green-600">
                        {formatCurrency(simulacoesVisiveis.reduce((sum, s) => sum + s.valor_reajustado, 0))}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-green-600">
                        +{formatCurrency(simulacoesVisiveis.reduce((sum, s) => sum + s.diferenca, 0))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
