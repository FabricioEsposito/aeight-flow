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

type Evento =
  | "criado"
  | "aprovado_rh"
  | "pendente_lider"
  | "aprovado_lider"
  | "aprovado"
  | "rejeitado";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function wrap(title: string, accentColor: string, bodyHtml: string) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f6;margin:0;padding:0;color:#1f2937">
<div style="max-width:620px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.08)">
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
    const { solicitacao_id, evento, motivo, etapa } = await req.json() as { solicitacao_id?: string; evento?: Evento; motivo?: string; etapa?: 'rh' | 'lider' | 'financeiro' };
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

    // Perfil do solicitante (e-mail profissional + nome)
    const { data: solicitanteProfile } = await supabase
      .from("profiles")
      .select("id, nome, email, grupo_id")
      .eq("id", sol.solicitante_id)
      .maybeSingle();

    const solicitanteNome = (solicitanteProfile as any)?.nome
      || (sol as any).fornecedor?.nome_fantasia
      || (sol as any).fornecedor?.razao_social
      || "Colaborador";
    const solicitanteEmail = (solicitanteProfile as any)?.email || null;

    // E-mail do fornecedor (fallback p/ NF mensal)
    const rawFornEmail = (sol as any).fornecedor?.email;
    const fornEmails: string[] = Array.isArray(rawFornEmail)
      ? rawFornEmail.filter((e: any) => typeof e === "string" && e.includes("@"))
      : typeof rawFornEmail === "string" && rawFornEmail.includes("@") ? [rawFornEmail] : [];

    const tipoLabel = sol.tipo === "nf_mensal" ? "Nota Fiscal" : "Reembolso";
    const valor = Number(sol.valor);

    // Resolve destinatários e copy por evento
    let to: string[] = [];
    let subject = "";
    let html = "";

    const summaryAccent = "#2563eb";
    const summarySoft = "#dbeafe";

    if (evento === "criado") {
      // Confirmação ao solicitante (apenas reembolso na prática)
      if (solicitanteEmail) to = [solicitanteEmail];
      else if (fornEmails.length) to = fornEmails;
      subject = `[Recebido] ${tipoLabel} - ${String(sol.mes_referencia).padStart(2, "0")}/${sol.ano_referencia}`;
      const body = `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Recebemos sua solicitação de <strong>reembolso</strong>.</p>
        <p>A partir de agora, ela será analisada pelo time de RH e pela sua liderança. Durante esse processo, fique atento ao seu e-mail e à plataforma, pois caso seja identificada alguma inconsistência ou necessidade de ajuste, você receberá uma notificação com as orientações para correção.</p>
        ${summaryBlock({ tipoLabel, valor, mes: sol.mes_referencia, ano: sol.ano_referencia, descricao: sol.descricao, numeroNf: sol.numero_nf, accent: summaryAccent, accentSoft: summarySoft })}
        <p>Em caso de dúvidas, estamos à disposição.</p>`;
      html = wrap("Solicitação Recebida", "#2563eb", body);
    } else if (evento === "aprovado_rh") {
      if (solicitanteEmail) to = [solicitanteEmail];
      else if (fornEmails.length) to = fornEmails;
      subject = `[Aprovado pelo RH] Reembolso - ${String(sol.mes_referencia).padStart(2, "0")}/${sol.ano_referencia}`;
      const body = `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Seu reembolso foi <strong>aprovado pelo RH</strong>.</p>
        <p>A partir de agora, a solicitação está disponível para validação da sua liderança na plataforma. Acompanhe o andamento pelo sistema e fique atento a possíveis atualizações.</p>
        ${summaryBlock({ tipoLabel, valor, mes: sol.mes_referencia, ano: sol.ano_referencia, descricao: sol.descricao, numeroNf: sol.numero_nf, accent: "#16a34a", accentSoft: "#dcfce7" })}`;
      html = wrap("Reembolso Aprovado pelo RH", "#16a34a", body);
    } else if (evento === "pendente_lider") {
      // Buscar líder do grupo do solicitante
      const grupoId = (solicitanteProfile as any)?.grupo_id;
      let liderEmail: string | null = null;
      if (grupoId) {
        const { data: grupo } = await supabase
          .from("grupos_area").select("lider_user_id").eq("id", grupoId).maybeSingle();
        const liderId = (grupo as any)?.lider_user_id;
        if (liderId) {
          const { data: liderProf } = await supabase
            .from("profiles").select("email").eq("id", liderId).maybeSingle();
          liderEmail = (liderProf as any)?.email || null;
        }
      }
      if (!liderEmail) {
        console.warn("Sem líder com e-mail para notificar", { solicitacao_id, grupoId });
        return new Response(JSON.stringify({ skipped: true, reason: "sem líder com e-mail" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      to = [liderEmail];
      subject = `[Aprovação pendente] Reembolso de ${solicitanteNome} - ${String(sol.mes_referencia).padStart(2, "0")}/${sol.ano_referencia}`;
      const body = `<p>Líder,</p>
        <p>O colaborador <strong>${solicitanteNome}</strong> enviou uma solicitação de reembolso que está pendente da sua aprovação. Por favor, acesse a plataforma para analisar a solicitação e aprová-la ou recusá-la, conforme necessário.</p>
        ${summaryBlock({ tipoLabel, valor, mes: sol.mes_referencia, ano: sol.ano_referencia, descricao: sol.descricao, numeroNf: sol.numero_nf, accent: "#f59e0b", accentSoft: "#fef3c7" })}
        <p><strong>Antes de aprovar, verifique se o reembolso atende aos seguintes critérios:</strong></p>
        <ul style="margin:8px 0 14px;padding-left:20px">
          <li>A despesa foi realizada para fins corporativos e está devidamente justificada;</li>
          <li>Há uma Nota Fiscal ou Cupom Fiscal anexado (comprovantes da maquininha de cartão não são aceitos como documento fiscal);</li>
          <li>A despesa está dentro da competência do mês correspondente.</li>
        </ul>
        <p>Lembramos que o pagamento dos reembolsos é realizado <strong>no dia 20 do mês subsequente</strong> à solicitação (ou no próximo dia útil, caso a data caia em feriado ou final de semana). Por isso, é importante que as aprovações sejam concluídas até o último dia do mês em que a despesa foi realizada.</p>
        <p>Obrigado!</p>`;
      html = wrap("Reembolso pendente da sua aprovação", "#f59e0b", body);
    } else if (evento === "aprovado_lider") {
      if (solicitanteEmail) to = [solicitanteEmail];
      else if (fornEmails.length) to = fornEmails;
      subject = `[Aprovado] Reembolso - ${String(sol.mes_referencia).padStart(2, "0")}/${sol.ano_referencia}`;
      const body = `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Seu reembolso foi <strong>aprovado</strong> e a solicitação já foi encaminhada ao Financeiro para pagamento.</p>
        ${summaryBlock({ tipoLabel, valor, mes: sol.mes_referencia, ano: sol.ano_referencia, descricao: sol.descricao, numeroNf: sol.numero_nf, accent: "#16a34a", accentSoft: "#dcfce7" })}
        <p>Lembramos que os reembolsos são pagos no <strong>dia 20 do mês subsequente</strong> à solicitação ou, caso a data coincida com um feriado ou final de semana, no próximo dia útil.</p>
        <p>Você pode acompanhar o status da solicitação pela plataforma.</p>`;
      html = wrap("Reembolso Aprovado", "#16a34a", body);
    } else if (evento === "aprovado") {
      // Aprovação final do financeiro (fluxo NF mensal e/ou fallback)
      if (solicitanteEmail) to = [solicitanteEmail];
      if (fornEmails.length) to = Array.from(new Set([...to, ...fornEmails]));
      subject = `[Aprovada] ${tipoLabel} - ${String(sol.mes_referencia).padStart(2, "0")}/${sol.ano_referencia}`;
      const body = `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Sua solicitação de <strong>${tipoLabel}</strong> foi aprovada em todas as etapas e seguirá para pagamento conforme cronograma do financeiro.</p>
        ${summaryBlock({ tipoLabel, valor, mes: sol.mes_referencia, ano: sol.ano_referencia, descricao: sol.descricao, numeroNf: sol.numero_nf, accent: "#16a34a", accentSoft: "#dcfce7" })}`;
      html = wrap(`${tipoLabel} Aprovada`, "#16a34a", body);
    } else if (evento === "rejeitado") {
      if (solicitanteEmail) to = [solicitanteEmail];
      if (fornEmails.length) to = Array.from(new Set([...to, ...fornEmails]));
      subject = `[Rejeitada] ${tipoLabel} - ${String(sol.mes_referencia).padStart(2, "0")}/${sol.ano_referencia}`;
      const motivoFinal = motivo || (sol as any).motivo_rejeicao_financeiro || (sol as any).motivo_rejeicao_rh || (sol as any).motivo_rejeicao_lider || "Não informado";
      const body = `<p>Olá <strong>${solicitanteNome}</strong>,</p>
        <p>Sua solicitação de <strong>${tipoLabel}</strong> foi <strong>rejeitada</strong>.</p>
        ${summaryBlock({ tipoLabel, valor, mes: sol.mes_referencia, ano: sol.ano_referencia, descricao: sol.descricao, numeroNf: sol.numero_nf, accent: "#dc2626", accentSoft: "#fee2e2" })}
        <div style="background:#fff;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:14px;margin:0 0 12px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:.5px">Motivo</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;white-space:pre-wrap">${motivoFinal}</p>
        </div>
        <p>Caso queira corrigir e reenviar a solicitação, acesse o Portal.</p>`;
      html = wrap(`${tipoLabel} Rejeitada`, "#dc2626", body);
    } else {
      return new Response(JSON.stringify({ error: `evento desconhecido: ${evento}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!to.length) {
      console.warn("Sem destinatário válido", { solicitacao_id, evento });
      return new Response(JSON.stringify({ skipped: true, reason: "sem destinatário" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Enviando email", { evento, to, cc: CC, solicitacao_id });

    const result = await resend.emails.send({
      from: FROM,
      to,
      cc: [CC],
      subject,
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
