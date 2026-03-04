import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, dreData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const formatDetalhes = (detalhes: any[], label: string) => {
      if (!detalhes || detalhes.length === 0) return '';
      let text = `\n📋 DETALHAMENTO - ${label}:\n`;
      for (const d of detalhes) {
        text += `  • ${d.codigo} ${d.descricao}: R$ ${fmt(d.valor)}\n`;
        if (d.items && d.items.length > 0) {
          const sorted = [...d.items].sort((a: any, b: any) => Math.abs(b.valor) - Math.abs(a.valor));
          for (const item of sorted) {
            const ccInfo = item.centroCusto ? ` [Centro de Custo: ${item.centroCusto}]` : '';
            text += `      - ${item.nome}: R$ ${fmt(item.valor)}${ccInfo}\n`;
          }
        }
      }
      return text;
    };

    let dreContext = 'Dados do DRE não disponíveis.';
    if (dreData) {
      dreContext = `📊 DADOS RESUMIDOS DO DRE:
- Receita Total: R$ ${fmt(dreData.receita)}
- CMV (Custo Variável): R$ ${fmt(dreData.cmv)}
- Margem de Contribuição: ${Number(dreData.margemContribuicao).toFixed(2)}%
- Despesas Administrativas (Custo Fixo): R$ ${fmt(dreData.despAdm)}
- EBITDA: R$ ${fmt(dreData.ebtida)}
- Impostos: R$ ${fmt(dreData.impostos)}
- Empréstimos: R$ ${fmt(dreData.emprestimos)}
- Despesas Financeiras: R$ ${fmt(dreData.despFinanceiras)}
- EBIT (Lucro antes do IR): R$ ${fmt(dreData.ebit)}
- Provisão CSLL e IRRF (34%): R$ ${fmt(dreData.provisaoCsllIrrf)}
- Resultado do Exercício: R$ ${fmt(dreData.resultadoExercicio)}
${dreData.periodo ? `- Período: ${dreData.periodo}` : ''}
${dreData.centrosCusto ? `- ⚠️ FILTRO ATIVO - Centros de Custo selecionados: ${dreData.centrosCusto.join(', ')}` : '- Centros de Custo: Todos (sem filtro)'}
${formatDetalhes(dreData.receitaDetalhes, 'RECEITAS (por cliente)')}
${formatDetalhes(dreData.cmvDetalhes, 'CMV - CUSTOS VARIÁVEIS (por fornecedor)')}
${formatDetalhes(dreData.despAdmDetalhes, 'DESPESAS ADMINISTRATIVAS (por fornecedor)')}
${formatDetalhes(dreData.impostosDetalhes, 'IMPOSTOS (por fornecedor)')}
${formatDetalhes(dreData.emprestimosDetalhes, 'EMPRÉSTIMOS (por fornecedor)')}
${formatDetalhes(dreData.despFinanceirasDetalhes, 'DESPESAS FINANCEIRAS (por fornecedor)')}`;
    }

    const systemPrompt = `Você é um analista financeiro sênior especializado em empresas brasileiras. Você está analisando o DRE (Demonstrativo de Resultados do Exercício) de uma empresa.

Você tem acesso tanto ao resumo geral quanto ao detalhamento completo por cliente e fornecedor de cada categoria do DRE. Cada item pode incluir o Centro de Custo (empresa) ao qual pertence.

${dreContext}

Suas responsabilidades:
1. Analisar os números do DRE em profundidade, incluindo detalhamento por cliente e fornecedor
2. Quando perguntado sobre clientes, usar os dados detalhados de receita para identificar o cliente com maior/menor receita, concentração de receita, etc.
3. Quando perguntado sobre custos, detalhar quais fornecedores representam os maiores gastos em cada categoria
4. Recomendar onde investir mais recursos com base nos dados granulares
5. Identificar concentração de receita em poucos clientes (risco) e sugerir diversificação
6. Identificar fornecedores com custos elevados e sugerir renegociação ou alternativas
7. Avaliar a saúde financeira geral do negócio
8. Sempre basear suas análises nos dados fornecidos - NUNCA diga que não tem dados detalhados, pois você tem o detalhamento completo por cliente e fornecedor
9. Fornecer insights acionáveis e práticos
10. Usar linguagem clara e objetiva, adequada para gestores brasileiros

IMPORTANTE SOBRE CENTROS DE CUSTO:
- Os dados podem estar filtrados por centro de custo (empresa). Verifique o campo "Centros de Custo selecionados" nos dados.
- Quando há um filtro de centro de custo ativo, TODOS os dados apresentados já são exclusivamente daquele(s) centro(s) de custo. Os clientes e fornecedores listados já são apenas os que pertencem ao centro de custo filtrado.
- Se o usuário perguntar "qual cliente faturou mais pela b8one" e o filtro de centro de custo b8one está ativo, responda com base nos dados apresentados, pois eles JÁ estão filtrados para b8one.
- Se NÃO houver filtro de centro de custo, cada item pode ter a indicação [Centro de Custo: nome] para identificar a qual empresa pertence.
- Quando o usuário mencionar um centro de custo específico, filtre mentalmente os itens pelo centro de custo indicado entre colchetes.

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
