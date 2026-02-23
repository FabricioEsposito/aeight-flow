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

interface BUDREData {
  codigo: string;
  descricao: string;
  dre: DREData;
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
  drePerBU?: BUDREData[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SimulationRequest = await req.json();
    const { dreAtual, dreSimulado, ajustes, breakevenAtual, breakevenSimulado, valuation, drePerBU } = body;

    const formatMoeda = (valor: number) => {
      return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const variacaoReceita = dreAtual.receita > 0 
      ? ((dreSimulado.receita - dreAtual.receita) / dreAtual.receita * 100).toFixed(1) 
      : '0';
    const variacaoEbitda = dreAtual.ebitda !== 0 
      ? ((dreSimulado.ebitda - dreAtual.ebitda) / Math.abs(dreAtual.ebitda) * 100).toFixed(1) 
      : '0';
    const variacaoResultado = dreAtual.resultado !== 0 
      ? ((dreSimulado.resultado - dreAtual.resultado) / Math.abs(dreAtual.resultado) * 100).toFixed(1) 
      : '0';

    // Build per-BU section
    let buSection = '';
    if (drePerBU && drePerBU.length > 0) {
      buSection = `\n\nDETALHAMENTO POR UNIDADE DE NEGÓCIO (BU / Centro de Custo):
Cada centro de custo representa uma BU (Business Unit) dentro do grupo de empresas. Analise cada uma individualmente.
`;
      for (const bu of drePerBU) {
        const margemPct = bu.dre.receita > 0 ? (bu.dre.margemContribuicaoPercentual).toFixed(2) : '0.00';
        buSection += `
--- BU: ${bu.codigo} - ${bu.descricao} ---
- Receita: ${formatMoeda(bu.dre.receita)}
- CMV: ${formatMoeda(bu.dre.cmv)}
- Margem de Contribuição: ${margemPct}%
- Desp. Administrativas: ${formatMoeda(bu.dre.despesasAdm)}
- EBITDA: ${formatMoeda(bu.dre.ebitda)}
- Impostos: ${formatMoeda(bu.dre.impostos)}
- Empréstimos: ${formatMoeda(bu.dre.emprestimos)}
- Desp. Financeiras: ${formatMoeda(bu.dre.despesasFinanceiras)}
- EBIT: ${formatMoeda(bu.dre.ebit)}
- Resultado: ${formatMoeda(bu.dre.resultado)}
`;
      }
    }

    const prompt = `Você é um analista financeiro especializado em empresas brasileiras e grupos empresariais multi-BU. Analise os seguintes dados do DRE (Demonstrativo de Resultados do Exercício) simulado e forneça insights estratégicos.

CENÁRIO ATUAL (CONSOLIDADO):
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

CENÁRIO SIMULADO (CONSOLIDADO):
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
${buSection}

Por favor, forneça uma análise estruturada em português brasileiro com os seguintes tópicos:

1. **VISÃO CONSOLIDADA** (3-5 observações sobre o resultado geral do grupo)
2. **ANÁLISE POR BU (UNIDADE DE NEGÓCIO)** (para cada BU com movimentação, comente: performance, margem, contribuição para o grupo, pontos de atenção. Identifique quais BUs são lucrativas e quais estão com resultado negativo, qual BU tem melhor margem, qual gera mais receita)
3. **RISCOS** (2-3 riscos identificados, mencionando quais BUs são mais vulneráveis)
4. **OPORTUNIDADES** (2-3 oportunidades, indicando em quais BUs focar)
5. **RECOMENDAÇÕES ESTRATÉGICAS** (3-5 recomendações concretas, incluindo ações específicas por BU quando aplicável, como realocação de custos, investimentos prioritários, etc.)

Seja objetivo, prático e focado em ações concretas. Trate cada BU como uma empresa independente dentro do grupo.`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
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
