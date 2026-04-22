// Edge Function de TESTE - envia previews dos templates de e-mail
// (faturamento PIX, faturamento transferência, cobrança PIX, cobrança transferência)
// para um destinatário fixo, usando dados reais simulados.
// Não substitui as funções de produção - usado apenas para validação visual.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DadosBancarios {
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  descricao: string;
}

// =================== Helpers compartilhados (réplica da produção) ===================

function resolveTitularPJ(descricaoConta: string): { razao_social: string; cnpj: string } | null {
  if (!descricaoConta) return null;
  const desc = descricaoConta.toLowerCase().trim();
  if (desc.endsWith("matriz b8one") || desc.endsWith("conta garantia b8one")) {
    return { razao_social: "B8ONE CONSULTORIA TECNICA EM TI LTDA", cnpj: "31.044.681/0001-13" };
  }
  if (desc.endsWith("filial b8one")) {
    return { razao_social: "B8ONE CONSULTORIA TECNICA EM TI LTDA", cnpj: "31.044.681/0002-02" };
  }
  if (desc.endsWith("matriz lomadee")) {
    return { razao_social: "PLUGONE CONSULTORIA TECNICA EM TI LTDA", cnpj: "38.442.433/0001-70" };
  }
  if (desc.endsWith("matriz cryah")) {
    return { razao_social: "CRYAH AGENCIA DIGITAL LTDA", cnpj: "12.104.320/0001-70" };
  }
  return null;
}

function tipoContaLabel(tipo: string | null): string {
  if (tipo === "corrente") return "Conta Corrente";
  if (tipo === "poupanca") return "Conta Poupança";
  if (tipo === "investimento") return "Conta Investimento";
  return "";
}

function tipoPagamentoLabel(tipo: string | null): string {
  if (!tipo) return "";
  const t = tipo.toLowerCase();
  if (t === "pix") return "PIX";
  if (t === "transferencia" || t === "transferência") return "Transferência";
  return tipo;
}

function buildDadosBancariosHtml(tipoPagamento: string | null, dados: DadosBancarios | null): string {
  if (!tipoPagamento || !dados) return "";
  const t = tipoPagamento.toLowerCase();
  if (t !== "pix" && t !== "transferencia" && t !== "transferência") return "";

  const titular = resolveTitularPJ(dados.descricao);
  const tipoContaTxt = tipoContaLabel(dados.tipo_conta);
  const contaCompleta = dados.conta
    ? `${dados.conta}${tipoContaTxt ? ` (${tipoContaTxt})` : ""}`
    : "-";

  const titularPJHtml = titular ? `
    <tr>
      <td style="padding: 6px 12px; font-size: 14px; color: #475569; font-weight: 600; white-space: nowrap; vertical-align: top;">Razão Social:</td>
      <td style="padding: 6px 12px; font-size: 14px; color: #0f172a;">${titular.razao_social}</td>
    </tr>
    <tr>
      <td style="padding: 6px 12px; font-size: 14px; color: #475569; font-weight: 600; white-space: nowrap; vertical-align: top;">CNPJ:</td>
      <td style="padding: 6px 12px; font-size: 14px; color: #0f172a; font-family: 'Courier New', monospace;">${titular.cnpj}</td>
    </tr>
  ` : "";

  return `
    <div style="background-color: #ffffff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #1e40af;">
        💳 Forma de Pagamento: ${tipoPagamentoLabel(tipoPagamento)}
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
        Realize o pagamento na conta bancária abaixo:
      </p>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td style="padding: 6px 12px; font-size: 14px; color: #475569; font-weight: 600; white-space: nowrap; vertical-align: top; width: 130px;">Titular:</td>
            <td style="padding: 6px 12px; font-size: 14px; color: #0f172a;">${dados.descricao}</td>
          </tr>
          ${titularPJHtml}
          <tr><td colspan="2" style="padding: 4px 0;"></td></tr>
          <tr>
            <td style="padding: 6px 12px; font-size: 14px; color: #475569; font-weight: 600; white-space: nowrap; vertical-align: top;">Banco:</td>
            <td style="padding: 6px 12px; font-size: 14px; color: #0f172a;">${dados.banco}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; font-size: 14px; color: #475569; font-weight: 600; white-space: nowrap; vertical-align: top;">Agência:</td>
            <td style="padding: 6px 12px; font-size: 14px; color: #0f172a; font-family: 'Courier New', monospace;">${dados.agencia || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; font-size: 14px; color: #475569; font-weight: 600; white-space: nowrap; vertical-align: top;">Conta:</td>
            <td style="padding: 6px 12px; font-size: 14px; color: #0f172a; font-family: 'Courier New', monospace;">${contaCompleta}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        Após o pagamento, envie o comprovante para <strong>financeiro@aeight.global</strong>.
      </p>
    </div>
  `;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR");
}

function formatCompetencia(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[date.getMonth()]}/${date.getFullYear()}`;
}

// =================== Template: FATURAMENTO ===================

function buildFaturamentoHtml(opts: {
  clienteNome: string;
  numeroNf: string;
  contratoNumero: string;
  servicoNome: string;
  dataCompetencia: string;
  dataVencimento: string;
  valorBruto: number;
  valorLiquido: number;
  pisPct: number;
  cofinsPct: number;
  irrfPct: number;
  csllPct: number;
  tipoPagamento: string;
  dadosBancarios: DadosBancarios;
}): string {
  const irrf = opts.valorBruto * (opts.irrfPct / 100);
  const pis = opts.valorBruto * (opts.pisPct / 100);
  const cofins = opts.valorBruto * (opts.cofinsPct / 100);
  const csll = opts.valorBruto * (opts.csllPct / 100);
  const totalRet = irrf + pis + cofins + csll;

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Faturamento</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Financeiro Aeight • [TESTE]</p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; margin: 0 0 20px 0;">Prezado(a) <strong>${opts.clienteNome}</strong>,</p>
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">Segue abaixo o detalhamento do faturamento referente aos serviços prestados:</p>

        <div style="overflow-x: auto; margin: 0 0 24px 0;">
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead><tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Contrato</th>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Serviço</th>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Competência</th>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Vencimento</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Valor Bruto</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Retenções</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Valor Líquido</th>
              <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">NF</th>
            </tr></thead>
            <tbody><tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${opts.contratoNumero}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${opts.servicoNome}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatCompetencia(opts.dataCompetencia)}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatDate(opts.dataVencimento)}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right;">${formatCurrency(opts.valorBruto)}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; color: #dc2626;">${totalRet > 0 ? formatCurrency(totalRet) : '-'}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(opts.valorLiquido)}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: center;"><span style="display: inline-block; padding: 6px 12px; background-color: #22c55e; color: white; border-radius: 4px; font-size: 12px; font-weight: 500;">NF ${opts.numeroNf}</span></td>
            </tr></tbody>
          </table>
        </div>

        ${buildDadosBancariosHtml(opts.tipoPagamento, opts.dadosBancarios)}

        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="text-align: center; flex: 1;">
              <p style="margin: 0; font-size: 12px; color: #1e40af; font-weight: 500;">Valor Bruto</p>
              <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #1e3a8a;">${formatCurrency(opts.valorBruto)}</p>
            </div>
            <div style="text-align: center; flex: 1;">
              <p style="margin: 0; font-size: 12px; color: #dc2626; font-weight: 500;">Retenções</p>
              <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #b91c1c;">- ${formatCurrency(totalRet)}</p>
            </div>
            <div style="text-align: center; flex: 1;">
              <p style="margin: 0; font-size: 12px; color: #15803d; font-weight: 500;">Total a Pagar</p>
              <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: #166534;">${formatCurrency(opts.valorLiquido)}</p>
            </div>
          </div>
        </div>

        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">Em caso de dúvidas ou divergências, por favor entre em contato com nosso departamento financeiro.</p>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Dúvidas? Entre em contato:</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">financeiro@aeight.global</p>
        </div>
      </div>
      <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">Este é um e-mail automático do sistema de faturamento.</p>
      </div>
    </div>
  </div>
</body></html>`;
}

// =================== Template: COBRANÇA ===================

function buildCobrancaHtml(opts: {
  clienteNome: string;
  numeroNf: string;
  contratoNumero: string;
  servicoNome: string;
  dataVencimento: string;
  diasAtraso: number;
  valor: number;
  tipoPagamento: string;
  dadosBancarios: DadosBancarios;
}): string {
  // Nível 1 (1-5 dias): tom tranquilo
  const headerGradient = "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)";
  const headerColor = "#3b82f6";
  const totalBoxGradient = "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)";

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background: ${headerGradient}; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Aviso de Cobrança</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Lembrete Financeiro • [TESTE]</p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; margin: 0 0 20px 0;">Prezado(a) <strong>${opts.clienteNome}</strong>,</p>
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          Gostaríamos de lembrar que existem parcelas em aberto em sua conta. Entendemos que imprevistos acontecem, e estamos aqui para ajudá-lo(a) a regularizar sua situação.
        </p>

        <div style="overflow-x: auto; margin: 0 0 24px 0;">
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead><tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Contrato</th>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Serviço</th>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">NF</th>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Vencimento</th>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Atraso</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Valor</th>
            </tr></thead>
            <tbody><tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${opts.contratoNumero}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${opts.servicoNome}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${opts.numeroNf}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatDate(opts.dataVencimento)}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: ${headerColor}; font-weight: 600;">${opts.diasAtraso} dias</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(opts.valor)}</td>
            </tr></tbody>
          </table>
        </div>

        <div style="background: ${totalBoxGradient}; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #78350f; font-weight: 500;">Total em Aberto</p>
          <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 700; color: #78350f;">${formatCurrency(opts.valor)}</p>
        </div>

        ${buildDadosBancariosHtml(opts.tipoPagamento, opts.dadosBancarios)}

        <p style="font-size: 15px; margin: 0 0 16px 0; color: #4b5563;">
          Solicitamos gentilmente a regularização do pagamento para evitar a incidência de encargos adicionais.
        </p>
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          Caso já tenha efetuado o pagamento, por favor desconsidere este aviso. Agradecemos sua atenção e parceria.
        </p>

        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Em caso de dúvidas, entre em contato:</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">financeiro@aeight.global</p>
        </div>
      </div>
      <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">E-mail automático de teste. Por favor, não responda diretamente.</p>
      </div>
    </div>
  </div>
</body></html>`;
}

// =================== Cenários de teste ===================

const dadosB8one: DadosBancarios = {
  banco: "Itaú Unibanco S.A",
  agencia: "2937",
  conta: "21551-3",
  tipo_conta: "corrente",
  descricao: "Banco Itaú - Matriz b8one",
};

const dadosLomadee: DadosBancarios = {
  banco: "BTG Pactual",
  agencia: "0050",
  conta: "12345-6",
  tipo_conta: "corrente",
  descricao: "Banco BTG Pactual - Matriz Lomadee",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destinatario } = await req.json().catch(() => ({ destinatario: "fabricio@aeight.global" }));
    const to = destinatario || "fabricio@aeight.global";

    const fromEmail = "Aeight Financeiro <cobranca@financeiro.aeight.global>";

    const sends = [
      {
        from: fromEmail,
        to: [to],
        subject: "[TESTE] Faturamento PIX - B8ONE Matriz",
        html: buildFaturamentoHtml({
          clienteNome: "CLIENTE EXEMPLO LTDA",
          numeroNf: "1433",
          contratoNumero: "CF957134447",
          servicoNome: "Consultoria em TI",
          dataCompetencia: "2026-04-01",
          dataVencimento: "2026-05-16",
          valorBruto: 75000,
          valorLiquido: 70038.38,
          pisPct: 0.65,
          cofinsPct: 3,
          irrfPct: 1.5,
          csllPct: 1,
          tipoPagamento: "pix",
          dadosBancarios: dadosB8one,
        }),
      },
      {
        from: fromEmail,
        to: [to],
        subject: "[TESTE] Faturamento Transferência - Lomadee Matriz (Plugone)",
        html: buildFaturamentoHtml({
          clienteNome: "CLIENTE EXEMPLO 2 LTDA",
          numeroNf: "2623",
          contratoNumero: "CV529200784",
          servicoNome: "Mídia Programática",
          dataCompetencia: "2026-04-01",
          dataVencimento: "2026-05-22",
          valorBruto: 7500,
          valorLiquido: 6835,
          pisPct: 0.65,
          cofinsPct: 3,
          irrfPct: 1.5,
          csllPct: 1,
          tipoPagamento: "transferencia",
          dadosBancarios: dadosLomadee,
        }),
      },
      {
        from: fromEmail,
        to: [to],
        subject: "[TESTE][Importante] Cobrança PIX - B8ONE Matriz",
        html: buildCobrancaHtml({
          clienteNome: "CLIENTE EXEMPLO LTDA",
          numeroNf: "1433",
          contratoNumero: "CF957134447",
          servicoNome: "Consultoria em TI",
          dataVencimento: "2026-04-15",
          diasAtraso: 3,
          valor: 70038.38,
          tipoPagamento: "pix",
          dadosBancarios: dadosB8one,
        }),
      },
      {
        from: fromEmail,
        to: [to],
        subject: "[TESTE][Importante] Cobrança Transferência - Lomadee Matriz (Plugone)",
        html: buildCobrancaHtml({
          clienteNome: "CLIENTE EXEMPLO 2 LTDA",
          numeroNf: "2623",
          contratoNumero: "CV529200784",
          servicoNome: "Mídia Programática",
          dataVencimento: "2026-04-15",
          diasAtraso: 3,
          valor: 6835,
          tipoPagamento: "transferencia",
          dadosBancarios: dadosLomadee,
        }),
      },
    ];

    const results: Array<{ subject: string; ok: boolean; id?: string; error?: string }> = [];

    for (const payload of sends) {
      try {
        const r = await resend.emails.send(payload);
        if ((r as any)?.error) {
          results.push({ subject: payload.subject, ok: false, error: (r as any).error.message });
        } else {
          results.push({ subject: payload.subject, ok: true, id: (r as any)?.data?.id });
        }
      } catch (e: any) {
        results.push({ subject: payload.subject, ok: false, error: e?.message || String(e) });
      }
      // pequeno delay entre envios
      await new Promise((res) => setTimeout(res, 400));
    }

    return new Response(
      JSON.stringify({ success: true, destinatario: to, results }, null, 2),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error in send-test-emails-preview:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
