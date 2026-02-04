import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DREData {
  receita: number;
  cmv: number;
  margemContribuicao: number;
  margemContribuicaoPercentual: number;
  despesasAdm: number;
  ebitda: number;
  impostos: number;
  emprestimos: number;
  despesasFinanceiras: number;
  ebit: number;
  provisaoCsllIrrf: number;
  resultado: number;
}

interface BreakevenData {
  pontoEquilibrio: number;
  existe: boolean;
}

interface ValuationData {
  dcf: number;
  multiploEbitda: number;
}

interface SimulationRequest {
  dreAtual: DREData;
  dreSimulado: DREData;
  ajustes: {
    receitaPercent: number;
    cmvPercent: number;
    impostosPercent: number;
    emprestimosPercent: number;
    despesasFinanceirasPercent: number;
  };
  breakevenAtual: BreakevenData;
  breakevenSimulado: BreakevenData;
  valuation: ValuationData;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: SimulationRequest = await req.json();
    console.log('Received simulation request:', JSON.stringify(body, null, 2));

    const { dreAtual, dreSimulado, ajustes, breakevenAtual, breakevenSimulado, valuation } = body;

    // Format currency helper
    const formatMoeda = (valor: number) => {
      return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Calculate variations
    const variacaoReceita = dreAtual.receita > 0 
      ? ((dreSimulado.receita - dreAtual.receita) / dreAtual.receita * 100).toFixed(1) 
      : '0';
    const variacaoEbitda = dreAtual.ebitda !== 0 
      ? ((dreSimulado.ebitda - dreAtual.ebitda) / Math.abs(dreAtual.ebitda) * 100).toFixed(1) 
      : '0';
    const variacaoResultado = dreAtual.resultado !== 0 
      ? ((dreSimulado.resultado - dreAtual.resultado) / Math.abs(dreAtual.resultado) * 100).toFixed(1) 
      : '0';

    // Build prompt for AI
    const prompt = `Você é um analista financeiro especializado em empresas brasileiras. Analise os seguintes dados do DRE (Demonstrativo de Resultados do Exercício) simulado e forneça insights estratégicos.

CENÁRIO ATUAL:
- Receita: ${formatMoeda(dreAtual.receita)}
- CMV (Custos Variáveis): ${formatMoeda(dreAtual.cmv)}
- Margem de Contribuição: ${dreAtual.margemContribuicaoPercentual.toFixed(2)}%
- Despesas Administrativas: ${formatMoeda(dreAtual.despesasAdm)}
- EBITDA: ${formatMoeda(dreAtual.ebitda)}
- Impostos: ${formatMoeda(dreAtual.impostos)}
- Empréstimos: ${formatMoeda(dreAtual.emprestimos)}
- Despesas Financeiras: ${formatMoeda(dreAtual.despesasFinanceiras)}
- EBIT: ${formatMoeda(dreAtual.ebit)}
- Provisão CSLL/IRRF: ${formatMoeda(dreAtual.provisaoCsllIrrf)}
- Resultado do Exercício: ${formatMoeda(dreAtual.resultado)}
- Ponto de Equilíbrio: ${breakevenAtual.existe ? formatMoeda(breakevenAtual.pontoEquilibrio) : 'Não existe (margem negativa)'}

AJUSTES APLICADOS NO CENÁRIO SIMULADO:
- Receita: ${ajustes.receitaPercent > 0 ? '+' : ''}${ajustes.receitaPercent}%
- CMV: ${ajustes.cmvPercent > 0 ? '+' : ''}${ajustes.cmvPercent}%
- Impostos: ${ajustes.impostosPercent > 0 ? '+' : ''}${ajustes.impostosPercent}%
- Empréstimos: ${ajustes.emprestimosPercent > 0 ? '+' : ''}${ajustes.emprestimosPercent}%
- Despesas Financeiras: ${ajustes.despesasFinanceirasPercent > 0 ? '+' : ''}${ajustes.despesasFinanceirasPercent}%

CENÁRIO SIMULADO:
- Receita: ${formatMoeda(dreSimulado.receita)} (${variacaoReceita}%)
- CMV: ${formatMoeda(dreSimulado.cmv)}
- Margem de Contribuição: ${dreSimulado.margemContribuicaoPercentual.toFixed(2)}%
- EBITDA: ${formatMoeda(dreSimulado.ebitda)} (${variacaoEbitda}%)
- EBIT: ${formatMoeda(dreSimulado.ebit)}
- Resultado do Exercício: ${formatMoeda(dreSimulado.resultado)} (${variacaoResultado}%)
- Ponto de Equilíbrio: ${breakevenSimulado.existe ? formatMoeda(breakevenSimulado.pontoEquilibrio) : 'Não existe (margem negativa)'}

VALUATION DO CENÁRIO SIMULADO:
- DCF (Fluxo de Caixa Descontado): ${formatMoeda(valuation.dcf)}
- Múltiplo de EBITDA (6x): ${formatMoeda(valuation.multiploEbitda)}

Por favor, forneça uma análise estruturada em português brasileiro com os seguintes tópicos:

1. **OBSERVAÇÕES** (3-5 pontos importantes sobre os resultados da simulação)
2. **RISCOS** (2-3 potenciais riscos identificados no cenário simulado)
3. **OPORTUNIDADES** (2-3 oportunidades de melhoria)
4. **RECOMENDAÇÕES** (3-5 caminhos estratégicos a seguir para tomada de decisão)

Seja objetivo, prático e focado em ações concretas que a empresa pode tomar.`;

    // Get LOVABLE_API_KEY
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling Lovable AI Gateway...');

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log('AI response received successfully');

    const analysisText = aiResult.choices?.[0]?.message?.content || 'Análise não disponível';

    return new Response(
      JSON.stringify({ 
        analysis: analysisText,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-dre-simulation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
