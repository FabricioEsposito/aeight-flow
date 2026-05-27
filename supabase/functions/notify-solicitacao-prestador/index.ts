import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FROM = "Aeight RH <rh@financeiro.aeight.global>";
const CC = "hello.people@b8one.com";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function buildHtml(opts: {
  aprovado: boolean;
  tipo: string;
  fornecedorNome: string;
  valor: number;
  mes: number;
  ano: number;
  descricao?: string | null;
  motivo?: string | null;
  numeroNf?: string | null;
}) {
  const tipoLabel = opts.tipo === "nf_mensal" ? "Nota Fiscal" : "Reembolso";
  const cor = opts.aprovado ? "#16a34a" : "#dc2626";
  const titulo = opts.aprovado
    ? `${tipoLabel} aprovada`
    : `${tipoLabel} rejeitada`;
  const corpo = opts.aprovado
    ? `Informamos que sua solicitação de <strong>${tipoLabel}</strong> foi <strong>aprovada</strong> em todas as etapas e seguirá para pagamento conforme cronograma financeiro.`
    : `Informamos que sua solicitação de <strong>${tipoLabel}</strong> foi <strong>rejeitada</strong>.`;

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:0">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">
      <div style="background:${cor};padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">${titulo}</h1>
      </div>
      <div style="padding:28px;color:#1f2937">
        <p>Prezado(a) <strong>${opts.fornecedorNome}</strong>,</p>
        <p>${corpo}</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:4px 0"><strong>Tipo:</strong> ${tipoLabel}</p>
          <p style="margin:4px 0"><strong>Referência:</strong> ${String(opts.mes).padStart(2, "0")}/${opts.ano}</p>
          <p style="margin:4px 0"><strong>Valor:</strong> ${fmtBRL(opts.valor)}</p>
          ${opts.numeroNf ? `<p style="margin:4px 0"><strong>Nº NF:</strong> ${opts.numeroNf}</p>` : ""}
          ${opts.descricao ? `<p style="margin:4px 0"><strong>Descrição:</strong> ${opts.descricao}</p>` : ""}
        </div>
        ${
          !opts.aprovado && opts.motivo
            ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px;border-radius:6px;margin:16px 0">
                <p style="margin:0 0 6px 0;font-weight:600;color:#991b1b">Motivo da rejeição</p>
                <p style="margin:0;color:#7f1d1d;white-space:pre-wrap">${opts.motivo}</p>
              </div>`
            : ""
        }
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Em caso de dúvidas, entre em contato com o setor financeiro.</p>
      </div>
      <div style="background:#f9fafb;padding:14px;text-align:center;color:#9ca3af;font-size:12px">Aeight • Financeiro</div>
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { solicitacao_id, evento, motivo } = await req.json();
    if (!solicitacao_id || !evento) {
      return new Response(JSON.stringify({ error: "solicitacao_id e evento são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sol, error: sErr } = await supabase
      .from("solicitacoes_prestador")
      .select("*, fornecedor:fornecedores(razao_social, nome_fantasia, email)")
      .eq("id", solicitacao_id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!sol) throw new Error("Solicitação não encontrada");

    const fornEmail = (sol as any).fornecedor?.email;
    if (!fornEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "fornecedor sem email" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aprovado = evento === "aprovado";
    const fornecedorNome = (sol as any).fornecedor?.nome_fantasia || (sol as any).fornecedor?.razao_social || "Fornecedor";
    const tipoLabel = sol.tipo === "nf_mensal" ? "Nota Fiscal" : "Reembolso";

    const html = buildHtml({
      aprovado,
      tipo: sol.tipo,
      fornecedorNome,
      valor: Number(sol.valor),
      mes: sol.mes_referencia,
      ano: sol.ano_referencia,
      descricao: sol.descricao,
      motivo: motivo || sol.motivo_rejeicao_financeiro || sol.motivo_rejeicao_rh || sol.motivo_rejeicao_lider,
      numeroNf: sol.numero_nf,
    });

    const result = await resend.emails.send({
      from: FROM,
      to: [fornEmail],
      cc: [CC],
      subject: `${aprovado ? "[Aprovada]" : "[Rejeitada]"} ${tipoLabel} - ${String(sol.mes_referencia).padStart(2, "0")}/${sol.ano_referencia}`,
      html,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-solicitacao-prestador error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
