import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Monitor } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FerramentasTable } from "@/components/ferramentas/FerramentasTable";
import { NovaFerramentaDialog } from "@/components/ferramentas/NovaFerramentaDialog";
import { GerenciarLicencasDialog } from "@/components/ferramentas/GerenciarLicencasDialog";
import { CentroCustoFilterSelect } from "@/components/financeiro/CentroCustoFilterSelect";
import { useCotacaoMoedas, convertToBRL } from "@/hooks/useCotacaoMoedas";

export default function FerramentasSoftware() {
  const [showNovaDialog, setShowNovaDialog] = useState(false);
  const [editingFerramenta, setEditingFerramenta] = useState<any>(null);
  const [managingFerramenta, setManagingFerramenta] = useState<any>(null);
  const [selectedCentrosCusto, setSelectedCentrosCusto] = useState<string[]>([]);

  const { data: ferramentas = [], isLoading } = useQuery({
    queryKey: ["ferramentas-software"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferramentas_software" as any)
        .select("*")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;

      const ids = (data || []).map((f: any) => f.id);
      if (ids.length === 0) return [];

      const { data: licencas, error: licError } = await supabase
        .from("ferramentas_software_licencas" as any)
        .select("ferramenta_id, valor_licenca, moeda, centro_custo_id, centros_custo(id, descricao, codigo)")
        .in("ferramenta_id", ids)
        .eq("status", "ativo");

      if (licError) throw licError;

      const aggMap: Record<string, { soma: number; count: number; moedas: Set<string>; ccMap: Record<string, { descricao: string; codigo: string; valor: number }>; licencasList: any[] }> = {};
      (licencas || []).forEach((l: any) => {
        if (!aggMap[l.ferramenta_id]) aggMap[l.ferramenta_id] = { soma: 0, count: 0, moedas: new Set(), ccMap: {}, licencasList: [] };
        const agg = aggMap[l.ferramenta_id];
        const val = Number(l.valor_licenca || 0);
        agg.soma += val;
        agg.count += 1;
        agg.moedas.add(l.moeda || "BRL");
        agg.licencasList.push(l);
        if (l.centros_custo) {
          const ccId = l.centros_custo.id;
          if (!agg.ccMap[ccId]) agg.ccMap[ccId] = { descricao: l.centros_custo.descricao, codigo: l.centros_custo.codigo, valor: 0 };
          agg.ccMap[ccId].valor += val;
        }
      });

      return (data || []).map((f: any) => {
        const agg = aggMap[f.id];
        const soma = agg?.soma || 0;
        const ccDistribution = agg ? Object.entries(agg.ccMap).map(([id, info]) => ({
          id,
          ...info,
          percentual: soma > 0 ? (info.valor / soma) * 100 : 0,
        })) : [];

        return {
          ...f,
          licencas_soma: soma,
          licencas_count: agg?.count || 0,
          cc_distribution: ccDistribution,
          moedas_usadas: agg ? Array.from(agg.moedas) : [],
          licencas_list: agg?.licencasList || [],
        };
      });
    },
  });

  // Collect all unique currencies used across all tools
  const allMoedas = Array.from(new Set(
    ferramentas.flatMap((f: any) => [f.moeda || "BRL", ...(f.moedas_usadas || [])])
  ));

  const { data: cotacoes } = useCotacaoMoedas(allMoedas);

  // Enrich ferramentas with BRL-converted values
  const enrichedFerramentas = ferramentas.map((f: any) => {
    const valorMensalBRL = convertToBRL(Number(f.valor_mensal || 0), f.moeda || "BRL", cotacoes);
    
    // Sum licenses converting each to BRL
    let somaLicencasBRL = 0;
    (f.licencas_list || []).forEach((l: any) => {
      somaLicencasBRL += convertToBRL(Number(l.valor_licenca || 0), l.moeda || "BRL", cotacoes);
    });

    return {
      ...f,
      valor_mensal_brl: valorMensalBRL,
      licencas_soma_brl: somaLicencasBRL,
    };
  });

  const filteredFerramentas = selectedCentrosCusto.length > 0
    ? enrichedFerramentas.filter((f: any) =>
        (f.cc_distribution || []).some((cc: any) => selectedCentrosCusto.includes(cc.id))
      )
    : enrichedFerramentas;

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
