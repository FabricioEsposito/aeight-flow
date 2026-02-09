import { useEffect, useState } from "react";
import { FileText, Receipt, CheckCircle, XCircle, TrendingDown } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyThemeColors {
  primaryColor: string;
  lightColor: string;
}

interface GestaoContratosAnalysisProps {
  selectedCentroCusto: string;
  companyTheme: CompanyThemeColors | null;
}

interface ContratosStats {
  ltvDias: number;
  ltvAnos: number;
  ticketMedio: number;
  ativos: number;
  inativos: number;
  churn: number;
}

export function GestaoContratosAnalysis({ selectedCentroCusto, companyTheme }: GestaoContratosAnalysisProps) {
  const [stats, setStats] = useState<ContratosStats>({
    ltvDias: 0,
    ltvAnos: 0,
    ticketMedio: 0,
    ativos: 0,
    inativos: 0,
    churn: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContratos();
  }, [selectedCentroCusto]);

  const fetchContratos = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from("contratos")
        .select("id, status, data_inicio, valor_total, centro_custo");

      if (selectedCentroCusto !== "todos") {
        query = query.eq("centro_custo", selectedCentroCusto);
      }

      const { data: contratos, error } = await query;

      if (error) {
        console.error("Erro ao buscar contratos:", error);
        return;
      }

      const today = new Date();
      const ativos = contratos?.filter((c) => c.status === "ativo") || [];
      const inativos = contratos?.filter((c) => c.status === "inativo") || [];

      // LTV - média de dias de atividade dos contratos ativos
      let ltvDias = 0;
      if (ativos.length > 0) {
        const totalDias = ativos.reduce((sum, c) => {
          const inicio = new Date(c.data_inicio + "T00:00:00");
          const diffMs = today.getTime() - inicio.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          return sum + Math.max(diffDays, 0);
        }, 0);
        ltvDias = Math.round(totalDias / ativos.length);
      }

      // Ticket Médio
      const somaAtivos = ativos.reduce((sum, c) => sum + Number(c.valor_total), 0);
      const ticketMedio = ativos.length > 0 ? somaAtivos / ativos.length : 0;

      // Taxa de Churn
      const somaInativos = inativos.reduce((sum, c) => sum + Number(c.valor_total), 0);
      const churn = somaAtivos > 0 ? (somaInativos / somaAtivos) * 100 : 0;

      setStats({
        ltvDias,
        ltvAnos: ltvDias / 365,
        ticketMedio,
        ativos: ativos.length,
        inativos: inativos.length,
        churn,
      });
    } catch (error) {
      console.error("Erro ao processar contratos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatsCard
        title="LTV (Life Time Value)"
        value={`${stats.ltvDias} dias`}
        subtitle={`${stats.ltvAnos.toFixed(1).replace(".", ",")} anos`}
        icon={FileText}
        variant="primary"
        companyTheme={companyTheme}
      />
      <StatsCard
        title="Ticket Médio"
        value={formatCurrency(stats.ticketMedio)}
        icon={Receipt}
        variant="success"
        companyTheme={companyTheme}
      />
      <StatsCard
        title="Contratos Ativos"
        value={String(stats.ativos)}
        icon={CheckCircle}
        variant="success"
        companyTheme={companyTheme}
      />
      <StatsCard
        title="Contratos Inativos"
        value={String(stats.inativos)}
        icon={XCircle}
        variant="destructive"
        companyTheme={companyTheme}
      />
      <StatsCard
        title="Taxa de Churn"
        value={`${stats.churn.toFixed(2).replace(".", ",")}%`}
        icon={TrendingDown}
        variant="warning"
        changeType={stats.churn > 10 ? "negative" : "neutral"}
        companyTheme={companyTheme}
      />
    </div>
  );
}
