import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParcelaVencida {
  id: string;
  descricao: string;
  data_vencimento: string;
  valor: number;
  dias_atraso: number;
  contrato_numero?: string;
  servico_nome?: string;
}

interface ClienteCobranca {
  cliente_id: string;
  cliente_nome: string;
  emails: string[];
  parcelas: ParcelaVencida[];
  total_vencido: number;
  max_dias_atraso: number;
}

// Get allowed send times based on days overdue
// Returns array of hours when emails can be sent
function getAllowedSendTimes(diasAtraso: number): number[] {
  if (diasAtraso <= 1) return [11]; // 1 email at 11h
  if (diasAtraso <= 3) return [11, 15]; // 2 emails at 11h and 15h
  return [11, 15, 17]; // 3 emails at 11h, 15h and 17h for 4+ days
}

// Get max emails per day based on days overdue
function getMaxEmailsPerDay(diasAtraso: number): number {
  if (diasAtraso <= 1) return 1;
  if (diasAtraso <= 3) return 2;
  return 3; // 4+ days: 3 emails max
}

// Get CC recipients based on days overdue
function getCcRecipients(diasAtraso: number): string[] {
  const baseCc = ["financeiro@aeight.global"];
  
  if (diasAtraso >= 6 && diasAtraso <= 7) {
    return [...baseCc, "renato@aeight.global", "hugo@lomadee.com"];
  }
  
  return baseCc;
}

// Check if current time is within allowed send window
function isWithinSendWindow(diasAtraso: number): boolean {
  const now = new Date();
  // Get current hour in Brazil timezone (UTC-3)
  const brasilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentHour = brasilTime.getHours();
  
  const allowedTimes = getAllowedSendTimes(diasAtraso);
  
  // Check if current hour matches any allowed time (with 30 min tolerance)
  for (const allowedHour of allowedTimes) {
    if (currentHour === allowedHour) {
      return true;
    }
  }
  
  return false;
}

// Get which send slot we're in (1, 2, or 3)
function getCurrentSendSlot(): number {
  const now = new Date();
  const brasilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentHour = brasilTime.getHours();
  
  if (currentHour >= 11 && currentHour < 15) return 1;
  if (currentHour >= 15 && currentHour < 17) return 2;
  if (currentHour >= 17) return 3;
  
  return 0; // Before 11h, no slot
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

function buildEmailHtml(cliente: ClienteCobranca): string {
  const parcelasRows = cliente.parcelas
    .map(
      (p) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${p.contrato_numero || "-"}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${p.servico_nome || "-"}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatDate(p.data_vencimento)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #dc2626; font-weight: 600;">${p.dias_atraso} dias</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(p.valor)}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Aviso de Cobrança</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Financeiro Aeight</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          Prezado(a) <strong>${cliente.cliente_nome}</strong>,
        </p>
        
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          Identificamos que existem parcelas em aberto em sua conta. Segue abaixo o detalhamento:
        </p>
        
        <!-- Table -->
        <div style="overflow-x: auto; margin: 0 0 24px 0;">
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Contrato</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Serviço</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Vencimento</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Atraso</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${parcelasRows}
            </tbody>
          </table>
        </div>
        
        <!-- Total -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 500;">Total em Aberto</p>
          <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 700; color: #78350f;">${formatCurrency(cliente.total_vencido)}</p>
        </div>
        
        <p style="font-size: 15px; margin: 0 0 16px 0; color: #4b5563;">
          Solicitamos a regularização do pagamento o mais breve possível para evitar a incidência de encargos adicionais.
        </p>
        
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          Caso já tenha efetuado o pagamento, por favor desconsidere este aviso.
        </p>
        
        <!-- Contact -->
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Em caso de dúvidas, entre em contato:</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">financeiro@aeight.global</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Este é um e-mail automático. Por favor, não responda diretamente.
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

    const { cliente_id, all, force } = await req.json();
    
    console.log("Starting collection email process:", { cliente_id, all, force });

    const currentSlot = getCurrentSendSlot();
    console.log("Current send slot:", currentSlot);

    if (currentSlot === 0 && !force) {
      console.log("Outside of send hours (before 11h), skipping");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Fora do horário de envio (antes das 11h)", 
          sent: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const hoje = new Date().toISOString().split("T")[0];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Fetch overdue receivables
    let query = supabase
      .from("contas_receber")
      .select(`
        id,
        descricao,
        data_vencimento,
        valor,
        cliente_id,
        parcela_id,
        clientes(id, razao_social, email),
        parcelas_contrato(
          contrato_id,
          contratos(
            numero_contrato,
            servicos
          )
        )
      `)
      .in("status", ["pendente", "vencido"])
      .lt("data_vencimento", hoje);

    if (cliente_id) {
      query = query.eq("cliente_id", cliente_id);
    }

    const { data: contasVencidas, error: contasError } = await query;

    if (contasError) {
      console.error("Error fetching overdue accounts:", contasError);
      throw contasError;
    }

    if (!contasVencidas || contasVencidas.length === 0) {
      console.log("No overdue accounts found");
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma parcela vencida encontrada", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch services for mapping
    const { data: servicos } = await supabase.from("servicos").select("id, codigo, nome");
    const servicosMap = new Map(servicos?.map((s: any) => [s.id, `${s.codigo} - ${s.nome}`]) || []);

    // Group by client
    const clientesMap = new Map<string, ClienteCobranca>();

    for (const conta of contasVencidas) {
      const cliente = conta.clientes as any;
      if (!cliente || !cliente.email || cliente.email.length === 0) {
        console.log(`Client ${cliente?.razao_social || conta.cliente_id} has no email, skipping`);
        continue;
      }

      const vencimento = new Date(conta.data_vencimento + "T00:00:00");
      const diasAtraso = Math.floor((Date.now() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

      // Get contract and service info
      let contratoNumero = "";
      let servicoNome = "";
      
      if (conta.parcelas_contrato) {
        const parcela = conta.parcelas_contrato as any;
        if (parcela.contratos) {
          contratoNumero = parcela.contratos.numero_contrato || "";
          const servicosJson = parcela.contratos.servicos;
          if (servicosJson && Array.isArray(servicosJson) && servicosJson.length > 0) {
            const primeiroServico = servicosJson[0];
            servicoNome = servicosMap.get(primeiroServico) || "";
          }
        }
      }

      const parcela: ParcelaVencida = {
        id: conta.id,
        descricao: conta.descricao,
        data_vencimento: conta.data_vencimento,
        valor: conta.valor,
        dias_atraso: diasAtraso,
        contrato_numero: contratoNumero,
        servico_nome: servicoNome,
      };

      if (!clientesMap.has(cliente.id)) {
        clientesMap.set(cliente.id, {
          cliente_id: cliente.id,
          cliente_nome: cliente.razao_social,
          emails: cliente.email.filter((e: string) => e && e.trim() !== ""),
          parcelas: [],
          total_vencido: 0,
          max_dias_atraso: 0,
        });
      }

      const clienteData = clientesMap.get(cliente.id)!;
      clienteData.parcelas.push(parcela);
      clienteData.total_vencido += conta.valor;
      clienteData.max_dias_atraso = Math.max(clienteData.max_dias_atraso, diasAtraso);
    }

    let totalSent = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    // Process each client
    for (const [clienteId, clienteData] of clientesMap) {
      if (clienteData.emails.length === 0) {
        console.log(`Client ${clienteData.cliente_nome} has no valid emails, skipping`);
        totalSkipped++;
        continue;
      }

      const diasAtraso = clienteData.max_dias_atraso;
      const maxEmails = getMaxEmailsPerDay(diasAtraso);
      
      // Check if within send window for this client's delay level
      if (!force && !isWithinSendWindow(diasAtraso)) {
        console.log(`Client ${clienteData.cliente_nome} (${diasAtraso} days overdue): not within send window, skipping`);
        totalSkipped++;
        continue;
      }

      // Check how many emails sent today
      const { data: todayLogs, error: logsError } = await supabase
        .from("email_logs")
        .select("id")
        .eq("cliente_id", clienteId)
        .eq("tipo", "cobranca")
        .gte("created_at", startOfDay.toISOString());

      if (logsError) {
        console.error("Error checking email logs:", logsError);
      }

      const emailsSentToday = todayLogs?.length || 0;

      // Check if already sent in current slot
      if (emailsSentToday >= currentSlot && !force) {
        console.log(`Client ${clienteData.cliente_nome} already received email in slot ${currentSlot} (sent today: ${emailsSentToday}), skipping`);
        totalSkipped++;
        continue;
      }

      if (emailsSentToday >= maxEmails && !force) {
        console.log(`Client ${clienteData.cliente_nome} already received ${emailsSentToday} emails today (limit: ${maxEmails}), skipping`);
        totalSkipped++;
        continue;
      }

      // Build email content
      const htmlContent = buildEmailHtml(clienteData);
      
      // Get CC recipients based on days overdue
      const ccRecipients = getCcRecipients(diasAtraso);

      try {
        const emailResponse = await resend.emails.send({
          from: "Financeiro Aeight <cobranca@financeiro.aeight.global>",
          to: clienteData.emails,
          cc: ccRecipients,
          subject: `Aviso de Cobrança - ${formatCurrency(clienteData.total_vencido)} em aberto`,
          html: htmlContent,
        });

        console.log(`Email sent to ${clienteData.cliente_nome} (CC: ${ccRecipients.join(", ")}):`, emailResponse);

        // Log each email sent
        for (const email of clienteData.emails) {
          const { error: logError } = await supabase.from("email_logs").insert({
            cliente_id: clienteId,
            email_destino: email,
            tipo: "cobranca",
            status: "enviado",
          });

          if (logError) {
            console.error("Error logging email:", logError);
          }
        }

        totalSent++;
      } catch (emailError: any) {
        console.error(`Error sending email to ${clienteData.cliente_nome}:`, emailError);
        errors.push(`${clienteData.cliente_nome}: ${emailError.message}`);

        // Log failed attempt
        for (const email of clienteData.emails) {
          await supabase.from("email_logs").insert({
            cliente_id: clienteId,
            email_destino: email,
            tipo: "cobranca",
            status: "falhou",
            erro: emailError.message,
          });
        }
      }
    }

    console.log(`Collection emails completed: ${totalSent} sent, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        skipped: totalSkipped,
        currentSlot,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-collection-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
