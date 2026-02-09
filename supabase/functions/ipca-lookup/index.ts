import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const meses = parseInt(url.searchParams.get("meses") || "12");

    // Calculate date range for the last N months
    const hoje = new Date();
    const dataFinal = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
    
    const dataInicio = new Date(hoje);
    dataInicio.setMonth(dataInicio.getMonth() - meses);
    const dataInicialStr = `01/${String(dataInicio.getMonth() + 1).padStart(2, "0")}/${dataInicio.getFullYear()}`;

    // BCB SGS API - Series 433 (IPCA monthly variation)
    const bcbUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${dataInicialStr}&dataFinal=${dataFinal}`;
    
    console.log("Fetching IPCA from BCB:", bcbUrl);
    
    const response = await fetch(bcbUrl);
    
    if (!response.ok) {
      throw new Error(`BCB API returned status ${response.status}`);
    }

    const dados = await response.json();

    if (!Array.isArray(dados) || dados.length === 0) {
      return new Response(
        JSON.stringify({ valores: [], acumulado: 0, periodo: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Take only the last N months
    const ultimos = dados.slice(-meses);

    // Calculate accumulated IPCA: ((1+v1/100) * (1+v2/100) * ... - 1) * 100
    const acumulado = ultimos.reduce((acc: number, item: { valor: string }) => {
      return acc * (1 + parseFloat(item.valor) / 100);
    }, 1);
    
    const ipcaAcumulado = (acumulado - 1) * 100;

    // Format period string
    const primeiro = ultimos[0].data;
    const ultimo = ultimos[ultimos.length - 1].data;

    const valores = ultimos.map((item: { data: string; valor: string }) => ({
      data: item.data,
      valor: parseFloat(item.valor),
    }));

    return new Response(
      JSON.stringify({
        valores,
        acumulado: Math.round(ipcaAcumulado * 100) / 100,
        periodo: `${primeiro} a ${ultimo}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching IPCA:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
