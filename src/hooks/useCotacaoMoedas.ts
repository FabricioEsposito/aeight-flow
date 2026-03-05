import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MOEDAS_DISPONIVEIS = [
  { value: "BRL", label: "R$ (BRL)", symbol: "R$" },
  { value: "USD", label: "US$ (USD)", symbol: "US$" },
  { value: "EUR", label: "€ (EUR)", symbol: "€" },
  { value: "GBP", label: "£ (GBP)", symbol: "£" },
];

export function useCotacaoMoedas(moedas: string[]) {
  return useQuery({
    queryKey: ["cotacao-moedas", moedas.sort().join(",")],
    queryFn: async () => {
      const foreignCurrencies = moedas.filter((m) => m !== "BRL");
      if (foreignCurrencies.length === 0) {
        return { BRL: { cotacao: 1, data: new Date().toISOString() } };
      }

      const { data, error } = await supabase.functions.invoke("cotacao-moeda", {
        body: { moedas: foreignCurrencies },
      });

      if (error) throw error;
      return { BRL: { cotacao: 1, data: new Date().toISOString() }, ...data.cotacoes } as Record<
        string,
        { cotacao: number; data: string } | null
      >;
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    enabled: moedas.length > 0,
  });
}

export function formatCurrencyWithSymbol(value: number, moeda: string) {
  const info = MOEDAS_DISPONIVEIS.find((m) => m.value === moeda);
  const symbol = info?.symbol || moeda;
  return `${symbol} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function convertToBRL(value: number, moeda: string, cotacoes: Record<string, { cotacao: number; data: string } | null> | undefined): number {
  if (!cotacoes || moeda === "BRL") return value;
  const cot = cotacoes[moeda];
  if (!cot) return value;
  return value * cot.cotacao;
}
