const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// BCB PTAX API - Cotação de moedas
// Codes: USD, EUR, GBP
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moedas } = await req.json();
    
    if (!moedas || !Array.isArray(moedas) || moedas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Informe as moedas desejadas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, { cotacao: number; data: string } | null> = {};

    for (const moeda of moedas) {
      if (moeda === 'BRL') {
        results[moeda] = { cotacao: 1, data: new Date().toISOString().split('T')[0] };
        continue;
      }

      // Try today and up to 5 previous business days
      let found = false;
      for (let dayOffset = 0; dayOffset < 7 && !found; dayOffset++) {
        const date = new Date();
        date.setDate(date.getDate() - dayOffset);
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;

        const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='${moeda}'&@dataCotacao='${dateStr}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`;

        console.log(`Fetching ${moeda} for ${dateStr}`);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.value && data.value.length > 0) {
            const cotacao = data.value[0];
            results[moeda] = {
              cotacao: cotacao.cotacaoVenda || cotacao.cotacaoCompra,
              data: cotacao.dataHoraCotacao,
            };
            found = true;
          }
        }
      }

      if (!found) {
        results[moeda] = null;
      }
    }

    return new Response(
      JSON.stringify({ cotacoes: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao buscar cotações' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
