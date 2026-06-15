import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Aeight RH <rh@financeiro.aeight.global>";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function wrap(title: string, accentColor: string, bodyHtml: string) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f6;margin:0;padding:0;color:#1f2937">
<div style="max-width:620px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.08)">
    <div style="background:#000000;padding:18px;text-align:center"><img src="https://aeight-flow.lovable.app/__l5e/assets-v1/8247fcee-a153-4eb0-a1fc-2aea05a49bfb/logo-grupo-aeight.png" alt="Grupo A&amp;EIGHT" style="max-width:280px;width:100%;height:auto;display:inline-block;border:0" /></div>
    <div style="background:${accentColor};padding:24px;text-align:center;color:#fff">
      <h1 style="margin:0;font-size:20px;font-weight:700">${title}</h1>
      <p style="margin:6px 0 0;font-size:12px;opacity:.9">Aeight • Recursos Humanos</p>
    </div>
    <div style="padding:28px;font-size:14px;line-height:1.65;color:#374151">${bodyHtml}
      <p style="margin:22px 0 0;color:#6b7280;font-size:12px">Esta é uma mensagem automática — não responda a este e-mail.</p>
    </div>
    <div style="background:#f9fafb;padding:14px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb">Aeight • Recursos Humanos · © ${new Date().getFullYear()}</div>
  </div>
</div></body></html>`;
}

function summaryBlock(opts: { tipoLabel: string; valor: number; mes: number; ano: number; descricao?: string | null; numeroNf?: string | null; accent: string; accentSoft: string; }) {
  return `<div style="background:${opts.accentSoft};border-radius:10px;padding:16px;margin:14px 0">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:4px 0;color:#6b7280">Tipo</td><td style="padding:4px 0;text-align:right;font-weight:600">${opts.tipoLabel}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Mês de referência</td><td style="padding:4px 0;text-align:right;font-weight:600">${String(opts.mes).padStart(2, "0")}/${opts.ano}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Valor</td><td style="padding:4px 0;text-align:right;font-weight:700;color:${opts.accent};font-size:15px">${fmtBRL(opts.valor)}</td></tr>
      ${opts.numeroNf ? `<tr><td style="padding:4px 0;color:#6b7280">Nº NF</td><td style="padding:4px 0;text-align:right;font-weight:600">${opts.numeroNf}</td></tr>` : ""}
    </table>
    ${opts.descricao ? `<p style="margin:10px 0 0;font-size:12px;color:#4b5563"><strong style="color:#6b7280">Descrição:</strong> ${opts.descricao}</p>` : ""}
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { to } = await req.json().catch(() => ({ to: "fabricio@aeight.global" }));
    const recipient = to || "fabricio@aeight.global";

    const sol = {
      tipoLabel: "Reembolso",
      tipoLabelNf: "Nota Fiscal",
      valor: 350.75,
      mes: 6,
      ano: 2026,
      descricao: "Almoço com cliente XPTO — reunião comercial em 05/06/2026",
      numeroNf: "000123",
    };
    const solicitanteNome = "Fabricio (Exemplo)";

    const templates: { evento: string; subject: string; html: string }[] = [];

    // criado
    templates.push({
      evento: "criado",
      subject: `[Recebido] ${sol.tipoLabel} - ${String(sol.mes).padStart(2, "0")}/${sol.ano}`,
      html: wrap("Solicitação Recebida", "#2563eb",
        `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Recebemos sua solicitação de <strong>reembolso</strong>.</p>
        <p>A partir de agora, ela será analisada pelo time de RH e pela sua liderança. Durante esse processo, fique atento ao seu e-mail e à plataforma, pois caso seja identificada alguma inconsistência ou necessidade de ajuste, você receberá uma notificação com as orientações para correção.</p>
        ${summaryBlock({ tipoLabel: sol.tipoLabel, valor: sol.valor, mes: sol.mes, ano: sol.ano, descricao: sol.descricao, numeroNf: sol.numeroNf, accent: "#2563eb", accentSoft: "#dbeafe" })}
        <p>Em caso de dúvidas, estamos à disposição.</p>`),
    });

    // aprovado_rh
    templates.push({
      evento: "aprovado_rh",
      subject: `[Aprovado pelo RH] Reembolso - ${String(sol.mes).padStart(2, "0")}/${sol.ano}`,
      html: wrap("Reembolso Aprovado pelo RH", "#16a34a",
        `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Seu reembolso foi <strong>aprovado pelo RH</strong>.</p>
        <p>A partir de agora, a solicitação está disponível para validação da sua liderança na plataforma. Acompanhe o andamento pelo sistema e fique atento a possíveis atualizações.</p>
        ${summaryBlock({ tipoLabel: sol.tipoLabel, valor: sol.valor, mes: sol.mes, ano: sol.ano, descricao: sol.descricao, numeroNf: sol.numeroNf, accent: "#16a34a", accentSoft: "#dcfce7" })}`),
    });

    // pendente_lider
    templates.push({
      evento: "pendente_lider",
      subject: `[Aprovação pendente] Reembolso de ${solicitanteNome} - ${String(sol.mes).padStart(2, "0")}/${sol.ano}`,
      html: wrap("Reembolso pendente da sua aprovação", "#f59e0b",
        `<p>Líder,</p>
        <p>O colaborador <strong>${solicitanteNome}</strong> enviou uma solicitação de reembolso que está pendente da sua aprovação. Por favor, acesse a plataforma para analisar a solicitação e aprová-la ou recusá-la, conforme necessário.</p>
        ${summaryBlock({ tipoLabel: sol.tipoLabel, valor: sol.valor, mes: sol.mes, ano: sol.ano, descricao: sol.descricao, numeroNf: sol.numeroNf, accent: "#f59e0b", accentSoft: "#fef3c7" })}
        <p><strong>Antes de aprovar, verifique se o reembolso atende aos seguintes critérios:</strong></p>
        <ul style="margin:8px 0 14px;padding-left:20px">
          <li>A despesa foi realizada para fins corporativos e está devidamente justificada;</li>
          <li>Há uma Nota Fiscal ou Cupom Fiscal anexado (comprovantes da maquininha de cartão não são aceitos como documento fiscal);</li>
          <li>A despesa está dentro da competência do mês correspondente.</li>
        </ul>
        <p>Lembramos que o pagamento dos reembolsos é realizado <strong>no dia 20 do mês subsequente</strong> à solicitação (ou no próximo dia útil, caso a data caia em feriado ou final de semana). Por isso, é importante que as aprovações sejam concluídas até o último dia do mês em que a despesa foi realizada.</p>
        <p>Obrigado!</p>`),
    });

    // aprovado_lider
    templates.push({
      evento: "aprovado_lider",
      subject: `[Aprovado] Reembolso - ${String(sol.mes).padStart(2, "0")}/${sol.ano}`,
      html: wrap("Reembolso Aprovado", "#16a34a",
        `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Seu reembolso foi <strong>aprovado</strong> e a solicitação já foi encaminhada ao Financeiro para pagamento.</p>
        ${summaryBlock({ tipoLabel: sol.tipoLabel, valor: sol.valor, mes: sol.mes, ano: sol.ano, descricao: sol.descricao, numeroNf: sol.numeroNf, accent: "#16a34a", accentSoft: "#dcfce7" })}
        <p>Lembramos que os reembolsos são pagos no <strong>dia 20 do mês subsequente</strong> à solicitação ou, caso a data coincida com um feriado ou final de semana, no próximo dia útil.</p>
        <p>Você pode acompanhar o status da solicitação pela plataforma.</p>`),
    });

    // aprovado (financeiro/NF mensal)
    templates.push({
      evento: "aprovado",
      subject: `[Aprovada] ${sol.tipoLabelNf} - ${String(sol.mes).padStart(2, "0")}/${sol.ano}`,
      html: wrap(`${sol.tipoLabelNf} Aprovada`, "#16a34a",
        `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Sua solicitação de <strong>${sol.tipoLabelNf}</strong> foi aprovada em todas as etapas e seguirá para pagamento conforme cronograma do financeiro.</p>
        ${summaryBlock({ tipoLabel: sol.tipoLabelNf, valor: sol.valor, mes: sol.mes, ano: sol.ano, descricao: sol.descricao, numeroNf: sol.numeroNf, accent: "#16a34a", accentSoft: "#dcfce7" })}`),
    });

    // rejeitado
    const motivoFinal = "Cupom fiscal ilegível. Por favor, anexe a Nota Fiscal correspondente e reenvie.";
    templates.push({
      evento: "rejeitado",
      subject: `[Rejeitada] ${sol.tipoLabel} - ${String(sol.mes).padStart(2, "0")}/${sol.ano}`,
      html: wrap(`${sol.tipoLabel} Rejeitada`, "#dc2626",
        `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Sua solicitação de <strong>${sol.tipoLabel}</strong> foi <strong>rejeitada</strong>.</p>
        ${summaryBlock({ tipoLabel: sol.tipoLabel, valor: sol.valor, mes: sol.mes, ano: sol.ano, descricao: sol.descricao, numeroNf: sol.numeroNf, accent: "#dc2626", accentSoft: "#fee2e2" })}
        <div style="background:#fff;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:14px;margin:0 0 12px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:.5px">Motivo</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;white-space:pre-wrap">${motivoFinal}</p>
        </div>
        <p>Caso queira corrigir e reenviar a solicitação, acesse o Portal.</p>`),
    });

    const results: any[] = [];
    for (const t of templates) {
      const r = await resend.emails.send({
        from: FROM,
        to: [recipient],
        subject: `[PREVIEW ${t.evento}] ${t.subject}`,
        html: t.html,
      });
      results.push({ evento: t.evento, result: r });
      await new Promise((res) => setTimeout(res, 600));
    }

    return new Response(JSON.stringify({ success: true, sent: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("preview-templates-reembolso error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
