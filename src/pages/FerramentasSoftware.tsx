import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
        .select("*, centros_custo(id, descricao, codigo)")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;

      // Fetch license aggregations
      const ids = (data || []).map((f: any) => f.id);
      if (ids.length === 0) return [];

      const { data: licencas, error: licError } = await supabase
        .from("ferramentas_software_licencas" as any)
        .select("ferramenta_id, valor_licenca")
        .in("ferramenta_id", ids)
        .eq("status", "ativo");

      if (licError) throw licError;

      // Aggregate
      const aggMap: Record<string, { soma: number; count: number }> = {};
      (licencas || []).forEach((l: any) => {
        if (!aggMap[l.ferramenta_id]) aggMap[l.ferramenta_id] = { soma: 0, count: 0 };
        aggMap[l.ferramenta_id].soma += Number(l.valor_licenca || 0);
        aggMap[l.ferramenta_id].count += 1;
      });

      return (data || []).map((f: any) => ({
        ...f,
        licencas_soma: aggMap[f.id]?.soma || 0,
        licencas_count: aggMap[f.id]?.count || 0,
      }));
    },
  });

  const filteredFerramentas = selectedCentrosCusto.length > 0
    ? ferramentas.filter((f: any) => selectedCentrosCusto.includes(f.centro_custo_id))
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
    </AppLayout>
  );
}
