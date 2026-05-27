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
  const corSoft = opts.aprovado ? "#dcfce7" : "#fee2e2";
  const icone = opts.aprovado ? "✓" : "✕";
  const titulo = opts.aprovado ? `${tipoLabel} Aprovada` : `${tipoLabel} Rejeitada`;
  const corpo = opts.aprovado
    ? `Informamos que sua solicitação de <strong>${tipoLabel}</strong> foi <strong>aprovada</strong> em todas as etapas e seguirá para pagamento conforme cronograma do financeiro.`
    : `Informamos que sua solicitação de <strong>${tipoLabel}</strong> foi <strong>rejeitada</strong>. Veja abaixo o motivo informado pelo aprovador.`;

  return `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f6;margin:0;padding:0;color:#1f2937">
<div style="max-width:620px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.08)">
    <div style="background:${cor};padding:28px;text-align:center;color:#fff">
      <div style="width:56px;height:56px;line-height:56px;border-radius:50%;background:rgba(255,255,255,.18);font-size:28px;font-weight:700;margin:0 auto 12px">${icone}</div>
      <h1 style="margin:0;font-size:22px;font-weight:700">${titulo}</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.9">Aeight • Recursos Humanos</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 14px;font-size:15px">Prezado(a) <strong>${opts.fornecedorNome}</strong>,</p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.6">${corpo}</p>
      <div style="background:${corSoft};border-radius:10px;padding:18px;margin:0 0 18px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280">Tipo</td><td style="padding:6px 0;text-align:right;font-weight:600">${tipoLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Mês de referência</td><td style="padding:6px 0;text-align:right;font-weight:600">${String(opts.mes).padStart(2, "0")}/${opts.ano}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Valor</td><td style="padding:6px 0;text-align:right;font-weight:700;color:${cor};font-size:16px">${fmtBRL(opts.valor)}</td></tr>
          ${opts.numeroNf ? `<tr><td style="padding:6px 0;color:#6b7280">Nº NF</td><td style="padding:6px 0;text-align:right;font-weight:600">${opts.numeroNf}</td></tr>` : ""}
        </table>
      </div>
      ${opts.descricao ? `<div style="margin:0 0 18px"><p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Descrição</p><p style="margin:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:14px;white-space:pre-wrap">${opts.descricao}</p></div>` : ""}
      ${!opts.aprovado && opts.motivo ? `<div style="background:#fff;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:14px;margin:0 0 18px"><p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:.5px">Motivo da rejeição</p><p style="margin:0;color:#7f1d1d;font-size:14px;white-space:pre-wrap">${opts.motivo}</p></div>` : ""}
      ${opts.aprovado ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:0 0 18px"><p style="margin:0;color:#166534;font-size:13px">✓ Sua solicitação será processada automaticamente pelo financeiro nos próximos dias úteis.</p></div>` : `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px;margin:0 0 18px"><p style="margin:0;color:#854d0e;font-size:13px">ℹ Caso queira corrigir e reenviar a solicitação, acesse o Portal do Prestador.</p></div>`}
      <p style="margin:22px 0 0;color:#6b7280;font-size:12px;line-height:1.6">Em caso de dúvidas, entre em contato com o departamento de RH.<br/>Esta é uma mensagem automática — não responda a este e-mail.</p>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb">Aeight • Recursos Humanos<br/>© ${new Date().getFullYear()} Todos os direitos reservados</div>
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

    const rawEmail = (sol as any).fornecedor?.email;
    const destinatarios: string[] = Array.isArray(rawEmail)
      ? rawEmail.filter((e: any) => typeof e === "string" && e.includes("@"))
      : typeof rawEmail === "string" && rawEmail.includes("@")
        ? [rawEmail]
        : [];

    if (destinatarios.length === 0) {
      console.warn("Fornecedor sem email válido", { solicitacao_id, rawEmail });
      return new Response(JSON.stringify({ skipped: true, reason: "fornecedor sem email válido" }), {
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

    console.log("Enviando email", { evento, destinatarios, cc: CC, solicitacao_id });

    const result = await resend.emails.send({
      from: FROM,
      to: destinatarios,
      cc: [CC],
      subject: `${aprovado ? "[Aprovada]" : "[Rejeitada]"} ${tipoLabel} - ${String(sol.mes_referencia).padStart(2, "0")}/${sol.ano_referencia}`,
      html,
    });

    if ((result as any)?.error) {
      console.error("Resend retornou erro:", (result as any).error);
      return new Response(JSON.stringify({ error: (result as any).error }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
