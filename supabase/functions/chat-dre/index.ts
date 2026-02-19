import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, dreData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um analista financeiro sênior especializado em empresas brasileiras. Você está analisando o DRE (Demonstrativo de Resultados do Exercício) de uma empresa.

Aqui estão os dados financeiros atuais do DRE:

${dreData ? `
📊 DADOS DO DRE:
- Receita Total: R$ ${Number(dreData.receita).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- CMV (Custo Variável): R$ ${Number(dreData.cmv).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Margem de Contribuição: ${Number(dreData.margemContribuicao).toFixed(2)}%
- Despesas Administrativas (Custo Fixo): R$ ${Number(dreData.despAdm).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- EBITDA: R$ ${Number(dreData.ebtida).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Impostos: R$ ${Number(dreData.impostos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Empréstimos: R$ ${Number(dreData.emprestimos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Despesas Financeiras: R$ ${Number(dreData.despFinanceiras).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- EBIT (Lucro antes do IR): R$ ${Number(dreData.ebit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Provisão CSLL e IRRF (34%): R$ ${Number(dreData.provisaoCsllIrrf).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Resultado do Exercício: R$ ${Number(dreData.resultadoExercicio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
${dreData.periodo ? `- Período: ${dreData.periodo}` : ''}
` : 'Dados do DRE não disponíveis.'}

Suas responsabilidades:
1. Analisar os números do DRE e identificar pontos fortes e fracos
2. Recomendar onde investir mais recursos
3. Identificar áreas com custos elevados que precisam de atenção
4. Sugerir estratégias para melhorar margens e resultados
5. Avaliar a saúde financeira geral do negócio
6. Usar linguagem clara e objetiva, adequada para gestores brasileiros
7. Sempre basear suas análises nos dados fornecidos
8. Fornecer insights acionáveis e práticos

Responda sempre em português brasileiro. Seja direto e use formatação com marcadores quando apropriado.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar a IA. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-dre error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
