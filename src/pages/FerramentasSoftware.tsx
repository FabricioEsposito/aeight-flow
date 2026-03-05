import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Monitor } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FerramentasTable } from "@/components/ferramentas/FerramentasTable";
import { NovaFerramentaDialog } from "@/components/ferramentas/NovaFerramentaDialog";
import { GerenciarLicencasDialog } from "@/components/ferramentas/GerenciarLicencasDialog";
import { CentroCustoFilterSelect } from "@/components/financeiro/CentroCustoFilterSelect";

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

      // Fetch licenses with their cost centers
      const { data: licencas, error: licError } = await supabase
        .from("ferramentas_software_licencas" as any)
        .select("ferramenta_id, valor_licenca, centro_custo_id, centros_custo(id, descricao, codigo)")
        .in("ferramenta_id", ids)
        .eq("status", "ativo");

      if (licError) throw licError;

      // Aggregate per tool: total, count, and cost center distribution
      const aggMap: Record<string, { soma: number; count: number; ccMap: Record<string, { descricao: string; codigo: string; valor: number }> }> = {};
      (licencas || []).forEach((l: any) => {
        if (!aggMap[l.ferramenta_id]) aggMap[l.ferramenta_id] = { soma: 0, count: 0, ccMap: {} };
        const agg = aggMap[l.ferramenta_id];
        const val = Number(l.valor_licenca || 0);
        agg.soma += val;
        agg.count += 1;
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
        };
      });
    },
  });

  // Filter by cost center: show tools that have at least one license in the selected cost centers
  const filteredFerramentas = selectedCentrosCusto.length > 0
    ? ferramentas.filter((f: any) =>
        (f.cc_distribution || []).some((cc: any) => selectedCentrosCusto.includes(cc.id))
      )
    : ferramentas;

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
        />
      )}
    </div>
  );
}
