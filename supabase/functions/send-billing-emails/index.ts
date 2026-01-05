import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParcelaFaturamento {
  id: string;
  numero_nf: string;
  link_nf: string;
  data_competencia: string;
  data_vencimento: string;
  valor: number;
  valor_bruto: number;
  cliente_id: string;
  cliente_nome: string;
  cliente_emails: string[];
  centro_custo: string;
  contrato_numero: string;
  servico_nome: string;
  observacoes_faturamento: string | null;
  pis_percentual: number;
  cofins_percentual: number;
  irrf_percentual: number;
  csll_percentual: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

function buildEmailSubject(clienteNome: string, numeroNf: string, centroCusto: string): string {
  const ccPart = centroCusto ? ` | CC: ${centroCusto}` : "";
  return `Faturamento Aeight | ${clienteNome} | NF ${numeroNf}${ccPart}`;
}

function buildEmailHtml(parcelas: ParcelaFaturamento[]): string {
  const primeiraParcelaCliente = parcelas[0];
  
  const parcelasRows = parcelas
    .map((p) => {
      const irrfValor = p.valor_bruto * (p.irrf_percentual / 100);
      const pisValor = p.valor_bruto * (p.pis_percentual / 100);
      const cofinsValor = p.valor_bruto * (p.cofins_percentual / 100);
      const csllValor = p.valor_bruto * (p.csll_percentual / 100);
      const totalRetencoes = irrfValor + pisValor + cofinsValor + csllValor;
      
      return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${p.contrato_numero || "-"}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${p.servico_nome || "-"}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatCompetencia(p.data_competencia)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatDate(p.data_vencimento)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right;">${formatCurrency(p.valor_bruto)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; color: #dc2626;">${totalRetencoes > 0 ? formatCurrency(totalRetencoes) : '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(p.valor)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: center;">
          ${p.link_nf && p.link_nf.trim() !== '' 
            ? `<a href="${p.link_nf}" target="_blank" style="display: inline-block; padding: 6px 12px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 500;">NF ${p.numero_nf}</a>`
            : `<span style="display: inline-block; padding: 6px 12px; background-color: #9ca3af; color: white; border-radius: 4px; font-size: 12px; font-weight: 500;">NF ${p.numero_nf}</span>`
          }
        </td>
      </tr>
    `;
    })
    .join("");

  const totalBruto = parcelas.reduce((sum, p) => sum + p.valor_bruto, 0);
  const totalLiquido = parcelas.reduce((sum, p) => sum + p.valor, 0);
  const totalRetencoes = totalBruto - totalLiquido;

  // Check if any parcela has observations
  const observacoes = parcelas
    .filter(p => p.observacoes_faturamento)
    .map(p => p.observacoes_faturamento)
    .filter((v, i, a) => a.indexOf(v) === i); // unique values

  const observacoesHtml = observacoes.length > 0 ? `
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">⚠️ Observações de Faturamento:</p>
      ${observacoes.map(obs => `<p style="margin: 0; font-size: 14px; color: #78350f;">${obs}</p>`).join('')}
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Faturamento</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Financeiro Aeight</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          Prezado(a) <strong>${primeiraParcelaCliente.cliente_nome}</strong>,
        </p>
        
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          Segue abaixo o detalhamento do faturamento referente aos serviços prestados:
        </p>
        
        <!-- Table -->
        <div style="overflow-x: auto; margin: 0 0 24px 0;">
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Contrato</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Serviço</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Competência</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Vencimento</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Valor Bruto</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Retenções</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Valor Líquido</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Nota Fiscal</th>
              </tr>
            </thead>
            <tbody>
              ${parcelasRows}
            </tbody>
          </table>
        </div>

        ${observacoesHtml}
        
        <!-- Total -->
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="text-align: center; flex: 1;">
              <p style="margin: 0; font-size: 12px; color: #1e40af; font-weight: 500;">Valor Bruto</p>
              <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #1e3a8a;">${formatCurrency(totalBruto)}</p>
            </div>
            <div style="text-align: center; flex: 1;">
              <p style="margin: 0; font-size: 12px; color: #dc2626; font-weight: 500;">Retenções</p>
              <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #b91c1c;">- ${formatCurrency(totalRetencoes)}</p>
            </div>
            <div style="text-align: center; flex: 1;">
              <p style="margin: 0; font-size: 12px; color: #15803d; font-weight: 500;">Total a Pagar</p>
              <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: #166534;">${formatCurrency(totalLiquido)}</p>
            </div>
          </div>
        </div>
        
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          Em caso de dúvidas ou divergências, por favor entre em contato com nosso departamento financeiro.
        </p>
        
        <!-- Contact -->
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Dúvidas? Entre em contato:</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">financeiro@aeight.global</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Este é um e-mail automático do sistema de faturamento.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} Aeight. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { parcela_ids } = await req.json();

    if (!parcela_ids || !Array.isArray(parcela_ids) || parcela_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhuma parcela selecionada" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Starting billing email process for parcelas:", parcela_ids);

    // Fetch parcelas with all related data
    const { data: contasReceber, error: contasError } = await supabase
      .from("contas_receber")
      .select(`
        id,
        numero_nf,
        link_nf,
        data_competencia,
        data_vencimento,
        valor,
        cliente_id,
        centro_custo,
        parcela_id,
        clientes(id, razao_social, nome_fantasia, email),
        parcelas_contrato(
          contrato_id,
          contratos(
            numero_contrato,
            servicos,
            valor_bruto,
            centro_custo,
            observacoes_faturamento,
            pis_percentual,
            cofins_percentual,
            irrf_percentual,
            csll_percentual
          )
        )
      `)
      .in("id", parcela_ids);

    if (contasError) {
      console.error("Error fetching parcelas:", contasError);
      throw contasError;
    }

    if (!contasReceber || contasReceber.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhuma parcela encontrada" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch all services for mapping
    const { data: servicos } = await supabase.from("servicos").select("id, codigo, nome");
    const servicosMap = new Map(servicos?.map((s: any) => [s.id, `${s.codigo} - ${s.nome}`]) || []);

    // Fetch centro de custo descriptions
    const { data: centrosCusto } = await supabase.from("centros_custo").select("id, descricao");
    const centrosCustoMap = new Map(centrosCusto?.map((c: any) => [c.id, c.descricao]) || []);

    // Group parcelas by client
    const parcelasPorCliente = new Map<string, ParcelaFaturamento[]>();

    for (const conta of contasReceber) {
      const cliente = conta.clientes as any;
      if (!cliente) {
        console.log(`Parcela ${conta.id} has no client, skipping`);
        continue;
      }

      if (!conta.numero_nf || !conta.link_nf) {
        console.log(`Parcela ${conta.id} has no NF, skipping`);
        continue;
      }

      const contrato = (conta.parcelas_contrato as any)?.contratos;
      
      let servicoNome = "";
      if (contrato?.servicos && Array.isArray(contrato.servicos) && contrato.servicos.length > 0) {
        const primeiroServico = contrato.servicos[0];
        servicoNome = servicosMap.get(primeiroServico) || "";
      }

      // Get centro de custo description
      const centroCustoId = contrato?.centro_custo || conta.centro_custo;
      const centroCustoNome = centroCustoId ? (centrosCustoMap.get(centroCustoId) || "") : "";

      const parcela: ParcelaFaturamento = {
        id: conta.id,
        numero_nf: conta.numero_nf,
        link_nf: conta.link_nf,
        data_competencia: conta.data_competencia,
        data_vencimento: conta.data_vencimento,
        valor: conta.valor,
        valor_bruto: contrato?.valor_bruto || conta.valor,
        cliente_id: cliente.id,
        cliente_nome: cliente.nome_fantasia || cliente.razao_social,
        cliente_emails: (cliente.email || []).filter((e: string) => e && e.trim() !== ""),
        centro_custo: centroCustoNome,
        contrato_numero: contrato?.numero_contrato || "",
        servico_nome: servicoNome,
        observacoes_faturamento: contrato?.observacoes_faturamento || null,
        pis_percentual: contrato?.pis_percentual || 0,
        cofins_percentual: contrato?.cofins_percentual || 0,
        irrf_percentual: contrato?.irrf_percentual || 0,
        csll_percentual: contrato?.csll_percentual || 0,
      };

      if (!parcelasPorCliente.has(cliente.id)) {
        parcelasPorCliente.set(cliente.id, []);
      }
      parcelasPorCliente.get(cliente.id)!.push(parcela);
    }

    let totalSent = 0;
    let totalSkipped = 0;
    const errors: string[] = [];
    const clientesEnviados: string[] = [];

    // Send one email per client
    for (const [clienteId, parcelas] of parcelasPorCliente) {
      if (parcelas.length === 0) continue;

      const primeiraParcelaCliente = parcelas[0];
      
      if (primeiraParcelaCliente.cliente_emails.length === 0) {
        console.log(`Client ${primeiraParcelaCliente.cliente_nome} has no email, skipping`);
        errors.push(`${primeiraParcelaCliente.cliente_nome}: sem e-mail cadastrado`);
        totalSkipped++;
        continue;
      }

      // Build subject - if multiple NFs, use first one + indication
      let subject: string;
      if (parcelas.length === 1) {
        subject = buildEmailSubject(
          primeiraParcelaCliente.cliente_nome,
          primeiraParcelaCliente.numero_nf,
          primeiraParcelaCliente.centro_custo
        );
      } else {
        const nfs = parcelas.map(p => p.numero_nf).join(", ");
        subject = buildEmailSubject(
          primeiraParcelaCliente.cliente_nome,
          nfs,
          primeiraParcelaCliente.centro_custo
        );
      }

      const htmlContent = buildEmailHtml(parcelas);

      try {
        const emailResponse = await resend.emails.send({
          from: "Financeiro Aeight <faturamento@financeiro.aeight.global>",
          to: primeiraParcelaCliente.cliente_emails,
          cc: ["financeiro@aeight.global"],
          subject: subject,
          html: htmlContent,
        });

        console.log(`Email sent to ${primeiraParcelaCliente.cliente_nome}:`, emailResponse);

        // Log each email sent
        for (const parcelaEnviada of parcelas) {
          for (const email of primeiraParcelaCliente.cliente_emails) {
            const { error: logError } = await supabase.from("email_logs").insert({
              cliente_id: clienteId,
              conta_receber_id: parcelaEnviada.id,
              email_destino: email,
              tipo: "faturamento",
              status: "enviado",
            });

            if (logError) {
              console.error("Error logging email:", logError);
            }
          }
        }

        totalSent++;
        clientesEnviados.push(primeiraParcelaCliente.cliente_nome);
      } catch (emailError: any) {
        console.error(`Error sending email to ${primeiraParcelaCliente.cliente_nome}:`, emailError);
        errors.push(`${primeiraParcelaCliente.cliente_nome}: ${emailError.message}`);

        // Log failed attempt
        for (const parcelaEnviada of parcelas) {
          for (const email of primeiraParcelaCliente.cliente_emails) {
            await supabase.from("email_logs").insert({
              cliente_id: clienteId,
              conta_receber_id: parcelaEnviada.id,
              email_destino: email,
              tipo: "faturamento",
              status: "falhou",
              erro: emailError.message,
            });
          }
        }
        totalSkipped++;
      }
    }

    console.log(`Billing emails completed: ${totalSent} sent, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        skipped: totalSkipped,
        clientesEnviados,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-billing-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
