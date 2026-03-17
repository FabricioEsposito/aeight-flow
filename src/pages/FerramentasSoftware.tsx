import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Monitor } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FerramentasTable } from "@/components/ferramentas/FerramentasTable";
import { NovaFerramentaDialog } from "@/components/ferramentas/NovaFerramentaDialog";
import { GerenciarLicencasDialog } from "@/components/ferramentas/GerenciarLicencasDialog";
import { CentroCustoFilterSelect } from "@/components/financeiro/CentroCustoFilterSelect";
import { useCotacaoMoedas, convertToBRL } from "@/hooks/useCotacaoMoedas";
import { useOverdueLicencasNotifications } from "@/hooks/useOverdueLicencas";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function FerramentasSoftware() {
  const [showNovaDialog, setShowNovaDialog] = useState(false);
  const [editingFerramenta, setEditingFerramenta] = useState<any>(null);
  const [managingFerramenta, setManagingFerramenta] = useState<any>(null);
  const [selectedCentrosCusto, setSelectedCentrosCusto] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date();
  const mesAtual = today.getMonth() + 1;
  const anoAtual = today.getFullYear();

  const { data: ferramentas = [], isLoading } = useQuery({
    queryKey: ["ferramentas-software"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferramentas_software" as any)
        .select("*")
        .eq("status", "ativo")
        .order("dia_vencimento", { ascending: true });
      if (error) throw error;

      const ids = (data || []).map((f: any) => f.id);
      if (ids.length === 0) return [];

      // Fetch licenses
      const { data: licencas, error: licError } = await supabase
        .from("ferramentas_software_licencas" as any)
        .select("id, ferramenta_id, valor_licenca, moeda")
        .in("ferramenta_id", ids)
        .eq("status", "ativo");
      if (licError) throw licError;

      // Fetch payments for current month
      const { data: pagamentos } = await supabase
        .from("ferramentas_licencas_pagamentos" as any)
        .select("ferramenta_id")
        .in("ferramenta_id", ids)
        .eq("mes_referencia", mesAtual)
        .eq("ano_referencia", anoAtual);
      
      const pagoSet = new Set((pagamentos || []).map((p: any) => p.ferramenta_id));

      // Fetch CC allocations for all licenses
      const licIds = (licencas || []).map((l: any) => l.id);
      let ccAllocations: any[] = [];
      if (licIds.length > 0) {
        const { data: ccData } = await supabase
          .from("ferramentas_licencas_centros_custo" as any)
          .select("licenca_id, centro_custo_id, percentual, centros_custo(id, descricao, codigo)")
          .in("licenca_id", licIds);
        ccAllocations = ccData || [];
      }

      // Group CC allocations by license
      const ccByLicenca: Record<string, any[]> = {};
      ccAllocations.forEach((cc: any) => {
        if (!ccByLicenca[cc.licenca_id]) ccByLicenca[cc.licenca_id] = [];
        ccByLicenca[cc.licenca_id].push(cc);
      });

      // Aggregate per tool
      const aggMap: Record<string, { soma: number; count: number; moedas: Set<string>; licencasList: any[] }> = {};
      (licencas || []).forEach((l: any) => {
        if (!aggMap[l.ferramenta_id]) aggMap[l.ferramenta_id] = { soma: 0, count: 0, moedas: new Set(), licencasList: [] };
        const agg = aggMap[l.ferramenta_id];
        agg.soma += Number(l.valor_licenca || 0);
        agg.count += 1;
        agg.moedas.add(l.moeda || "BRL");
        agg.licencasList.push({ ...l, cc_allocs: ccByLicenca[l.id] || [] });
      });

      return (data || []).map((f: any) => {
        const agg = aggMap[f.id];
        return {
          ...f,
          licencas_soma: agg?.soma || 0,
          licencas_count: agg?.count || 0,
          moedas_usadas: agg ? Array.from(agg.moedas) : [],
          licencas_list: agg?.licencasList || [],
          pago_mes_atual: pagoSet.has(f.id),
        };
      });
    },
  });

  // Collect all unique currencies
  const allMoedas = Array.from(new Set(
    ferramentas.flatMap((f: any) => [f.moeda || "BRL", ...(f.moedas_usadas || [])])
  ));

  const { data: cotacoes } = useCotacaoMoedas(allMoedas);

  // Enrich ferramentas with BRL-converted values and CC distribution
  const enrichedFerramentas = ferramentas.map((f: any) => {
    const valorMensalBRL = convertToBRL(Number(f.valor_mensal || 0), f.moeda || "BRL", cotacoes);

    let somaLicencasBRL = 0;
    const ccMap: Record<string, { descricao: string; codigo: string; valor: number }> = {};

    (f.licencas_list || []).forEach((l: any) => {
      const valorBRL = convertToBRL(Number(l.valor_licenca || 0), l.moeda || "BRL", cotacoes);
      somaLicencasBRL += valorBRL;

      (l.cc_allocs || []).forEach((cc: any) => {
        const ccInfo = cc.centros_custo;
        if (!ccInfo) return;
        if (!ccMap[ccInfo.id]) ccMap[ccInfo.id] = { descricao: ccInfo.descricao, codigo: ccInfo.codigo, valor: 0 };
        ccMap[ccInfo.id].valor += valorBRL * (Number(cc.percentual) / 100);
      });
    });

    const ccDistribution = Object.entries(ccMap).map(([id, info]) => ({
      id,
      ...info,
      percentual: somaLicencasBRL > 0 ? (info.valor / somaLicencasBRL) * 100 : 0,
    }));

    return {
      ...f,
      valor_mensal_brl: valorMensalBRL,
      licencas_soma_brl: somaLicencasBRL,
      cc_distribution: ccDistribution,
    };
  });

  // Check for overdue licenses and create notifications
  useOverdueLicencasNotifications(enrichedFerramentas);

  const filteredFerramentas = selectedCentrosCusto.length > 0
    ? enrichedFerramentas.filter((f: any) =>
        (f.cc_distribution || []).some((cc: any) => selectedCentrosCusto.includes(cc.id))
      )
    : enrichedFerramentas;

  const handleMarcarPago = async (ferramenta: any) => {
    try {
      const { error } = await supabase
        .from("ferramentas_licencas_pagamentos" as any)
        .insert({
          ferramenta_id: ferramenta.id,
          mes_referencia: mesAtual,
          ano_referencia: anoAtual,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Pagamento registrado",
        description: `Pagamento da ferramenta "${ferramenta.nome}" registrado para ${String(mesAtual).padStart(2, "0")}/${anoAtual}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["ferramentas-software"] });
    } catch (error: any) {
      toast({
        title: "Erro ao registrar pagamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDesfazerPagamento = async (ferramenta: any) => {
    try {
      const { error } = await supabase
        .from("ferramentas_licencas_pagamentos" as any)
        .delete()
        .eq("ferramenta_id", ferramenta.id)
        .eq("mes_referencia", mesAtual)
        .eq("ano_referencia", anoAtual);

      if (error) throw error;

      toast({
        title: "Pagamento desfeito",
        description: `Pagamento da ferramenta "${ferramenta.nome}" foi reaberto.`,
      });

      queryClient.invalidateQueries({ queryKey: ["ferramentas-software"] });
    } catch (error: any) {
      toast({
        title: "Erro ao desfazer pagamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ferramentas de Software</h1>
            <p className="text-sm text-muted-foreground">Controle de licenças e custos de software</p>
          </div>
        </div>
        <Button onClick={() => { setEditingFerramenta(null); setShowNovaDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Ferramenta
        </Button>
      </div>

      <div className="flex gap-2">
        <CentroCustoFilterSelect
          value={selectedCentrosCusto}
          onValueChange={setSelectedCentrosCusto}
        />
      </div>

      <FerramentasTable
        ferramentas={filteredFerramentas}
        loading={isLoading}
        cotacoes={cotacoes}
        onEdit={(f) => { setEditingFerramenta(f); setShowNovaDialog(true); }}
        onManageLicencas={(f) => setManagingFerramenta(f)}
        onMarcarPago={handleMarcarPago}
        onDesfazerPagamento={handleDesfazerPagamento}
      />

      <NovaFerramentaDialog
        open={showNovaDialog}
        onOpenChange={setShowNovaDialog}
        ferramenta={editingFerramenta}
      />

      {managingFerramenta && (
        <GerenciarLicencasDialog
          open={!!managingFerramenta}
          onOpenChange={(v) => { if (!v) setManagingFerramenta(null); }}
          ferramenta={managingFerramenta}
          cotacoes={cotacoes}
        />
      )}
    </div>
  );
}
