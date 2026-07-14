import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}
function formatCompetencia(d: string) {
  const dt = new Date(d + "T00:00:00");
  const m = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${m[dt.getMonth()]}/${dt.getFullYear()}`;
}

const parcelas = [
  {
    contrato_numero: "CV558001",
    servico_nome: "Consultoria de Interiores - Mensalidade",
    data_competencia: "2026-07-01",
    data_vencimento: "2026-07-19",
    valor_bruto: 12000,
    valor: 11262,
    irrf_percentual: 1.5,
    pis_percentual: 0.65,
    cofins_percentual: 3.0,
    csll_percentual: 1.0,
    numero_nf: "558",
    link_nf: "https://example.com/nf558.pdf",
    link_boleto: "https://example.com/boleto558.pdf",
  },
  {
    contrato_numero: "CV558002",
    servico_nome: "Design de Ambientes - Projeto Executivo",
    data_competencia: "2026-07-01",
    data_vencimento: "2026-07-25",
    valor_bruto: 8500,
    valor: 7977.15,
    irrf_percentual: 1.5,
    pis_percentual: 0.65,
    cofins_percentual: 3.0,
    csll_percentual: 1.0,
    numero_nf: "559",
    link_nf: "",
    link_boleto: "",
  },
];

function buildHtml() {
  const rows = parcelas.map((p) => {
    const ret = p.valor_bruto * ((p.irrf_percentual + p.pis_percentual + p.cofins_percentual + p.csll_percentual) / 100);
    const nf = p.link_nf
      ? `<a href="${p.link_nf}" style="display:inline-block;padding:6px 12px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;">📄 Visualizar NF ${p.numero_nf}</a>`
      : `<span style="display:inline-block;padding:6px 12px;background:#9ca3af;color:#fff;border-radius:4px;font-size:12px;font-weight:500;">NF ${p.numero_nf}</span>`;
    const bol = p.link_boleto
      ? `<a href="${p.link_boleto}" style="display:inline-block;padding:6px 12px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;">🧾 Visualizar Boleto</a>`
      : "";
    const row = (l: string, v: string, s = "") => `<tr><td style="padding:6px 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;width:42%;">${l}</td><td style="padding:6px 10px;font-size:14px;color:#1f2937;text-align:right;${s}">${v}</td></tr>`;
    return `<div style="border:1px solid #e5e7eb;border-radius:8px;margin:0 0 14px 0;overflow:hidden;background:#fff;">
      <div style="background:#f9fafb;padding:10px 14px;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0;font-size:13px;color:#6b7280;font-weight:600;">Contrato ${p.contrato_numero}</p>
        <p style="margin:2px 0 0 0;font-size:15px;color:#111827;font-weight:700;">${p.servico_nome}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;"><tbody>
        ${row("Competência", formatCompetencia(p.data_competencia))}
        ${row("Vencimento", formatDate(p.data_vencimento))}
        ${row("Valor Bruto", formatCurrency(p.valor_bruto))}
        ${row("Retenções", formatCurrency(ret), "color:#dc2626;")}
        ${row("Valor Líquido", formatCurrency(p.valor), "font-weight:700;color:#166534;")}
      </tbody></table>
      <div style="padding:12px 14px;border-top:1px solid #e5e7eb;text-align:center;">${nf} ${bol}</div>
    </div>`;
  }).join("");

  const totalBruto = parcelas.reduce((s, p) => s + p.valor_bruto, 0);
  const totalLiq = parcelas.reduce((s, p) => s + p.valor, 0);
  const totalRet = totalBruto - totalLiq;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#1f2937;margin:0;padding:0;background:#f3f4f6;">
<div style="max-width:640px;margin:0 auto;padding:20px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
    <div style="background:#000;padding:20px;text-align:center;">
      <img src="https://aeight-flow.lovable.app/__l5e/assets-v1/8247fcee-a153-4eb0-a1fc-2aea05a49bfb/logo-grupo-aeight.png" alt="Grupo A&amp;EIGHT" style="max-width:320px;width:100%;height:auto;display:inline-block;border:0;" />
    </div>
    <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Faturamento</h1>
      <p style="color:#bfdbfe;margin:8px 0 0 0;font-size:14px;">Financeiro Aeight</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;margin:0 0 20px 0;">Prezado(a) <strong>LIDER INTERIORES</strong>,</p>
      <p style="font-size:15px;margin:0 0 24px 0;color:#4b5563;">Segue abaixo o detalhamento do faturamento referente aos serviços prestados:</p>
      <div style="margin:0 0 24px 0;">${rows}</div>
      <div style="background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%);border-radius:8px;padding:20px;margin:0 0 24px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <div style="text-align:center;flex:1;"><p style="margin:0;font-size:12px;color:#1e40af;font-weight:500;">Valor Bruto</p><p style="margin:4px 0 0 0;font-size:18px;font-weight:600;color:#1e3a8a;">${formatCurrency(totalBruto)}</p></div>
          <div style="text-align:center;flex:1;"><p style="margin:0;font-size:12px;color:#dc2626;font-weight:500;">Retenções</p><p style="margin:4px 0 0 0;font-size:18px;font-weight:600;color:#b91c1c;">- ${formatCurrency(totalRet)}</p></div>
          <div style="text-align:center;flex:1;"><p style="margin:0;font-size:12px;color:#15803d;font-weight:500;">Total a Pagar</p><p style="margin:4px 0 0 0;font-size:24px;font-weight:700;color:#166534;">${formatCurrency(totalLiq)}</p></div>
        </div>
      </div>
      <p style="font-size:15px;margin:0 0 24px 0;color:#4b5563;">Em caso de dúvidas ou divergências, por favor entre em contato com nosso departamento financeiro.</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Dúvidas? Entre em contato:</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#1f2937;">financeiro@aeight.global</p>
      </div>
    </div>
    <div style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Este é um e-mail automático do sistema de faturamento.</p>
      <p style="margin:8px 0 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Aeight. Todos os direitos reservados.</p>
    </div>
  </div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const r = await resend.emails.send({
      from: "Financeiro Aeight <faturamento@financeiro.aeight.global>",
      to: ["fabricio@aeight.global"],
      subject: "[TESTE] Faturamento Aeight | LIDER INTERIORES | NF 558",
      html: buildHtml(),
    });
    return new Response(JSON.stringify({ ok: true, r }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
