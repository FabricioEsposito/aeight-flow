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
  numero_nf?: string;
  link_nf?: string;
  link_boleto?: string;
  centro_custo?: string;
}

interface ClienteCobranca {
  cliente_id: string;
  cliente_nome: string;
  emails: string[];
  parcelas: ParcelaVencida[];
  total_vencido: number;
  max_dias_atraso: number;
}

interface EmailTemplate {
  headerColor: string;
  headerGradient: string;
  title: string;
  subtitle: string;
  urgencyTag: string;
  mainMessage: string;
  warningMessage: string;
  footerMessage: string;
  showFreezeWarning: boolean;
  freezeWarningColor: string;
}

// Get email template based on days overdue
function getEmailTemplate(diasAtraso: number): EmailTemplate {
  if (diasAtraso <= 5) {
    // Nível 1: Tom Tranquilo (1-5 dias)
    return {
      headerColor: "#3b82f6",
      headerGradient: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
      title: "Aviso de Cobrança",
      subtitle: "Lembrete Financeiro",
      urgencyTag: "[Importante]",
      mainMessage: "Gostaríamos de lembrar que existem parcelas em aberto em sua conta. Entendemos que imprevistos acontecem, e estamos aqui para ajudá-lo(a) a regularizar sua situação.",
      warningMessage: "Solicitamos gentilmente a regularização do pagamento para evitar a incidência de encargos adicionais.",
      footerMessage: "Caso já tenha efetuado o pagamento, por favor desconsidere este aviso. Agradecemos sua atenção e parceria.",
      showFreezeWarning: false,
      freezeWarningColor: "",
    };
  } else if (diasAtraso <= 7) {
    // Nível 2: Tom Arrojado (6-7 dias)
    return {
      headerColor: "#f97316",
      headerGradient: "linear-gradient(135deg, #c2410c 0%, #f97316 100%)",
      title: "Notificação de Cobrança",
      subtitle: "Atenção Requerida",
      urgencyTag: "[Notificação de Cobrança]",
      mainMessage: "Verificamos que as parcelas abaixo permanecem em aberto em sua conta, mesmo após nossas tentativas anteriores de contato. Esta situação requer sua atenção imediata.",
      warningMessage: "Solicitamos a regularização do pagamento o mais breve possível. O não pagamento poderá resultar em medidas adicionais e interrupção dos serviços.",
      footerMessage: "Por favor, entre em contato conosco caso haja algum impedimento para o pagamento. Estamos disponíveis para negociar.",
      showFreezeWarning: false,
      freezeWarningColor: "",
    };
  } else {
    // Nível 3: Tom Urgente (8+ dias)
    return {
      headerColor: "#dc2626",
      headerGradient: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
      title: "Notificação de Congelamento de Projeto",
      subtitle: "URGENTE - Ação Imediata Necessária",
      urgencyTag: "[Notificação de Congelamento de Projeto]",
      mainMessage: "Esta é uma notificação urgente referente aos débitos em atraso crítico em sua conta. Apesar das tentativas anteriores de contato, não identificamos a regularização dos pagamentos pendentes.",
      warningMessage: "O não pagamento em até 48 horas resultará no CONGELAMENTO IMEDIATO do projeto e suspensão de todos os serviços relacionados.",
      footerMessage: "Entre em contato IMEDIATAMENTE para evitar a interrupção dos serviços. Esta é nossa última tentativa de resolução amigável.",
      showFreezeWarning: true,
      freezeWarningColor: "#dc2626",
    };
  }
}

// Get allowed send times based on days overdue
function getAllowedSendTimes(diasAtraso: number): number[] {
  if (diasAtraso <= 1) return [11];
  if (diasAtraso <= 3) return [11, 15];
  return [11, 15, 17];
}

// Get max emails per day based on days overdue
function getMaxEmailsPerDay(diasAtraso: number): number {
  if (diasAtraso <= 1) return 1;
  if (diasAtraso <= 3) return 2;
  return 3;
}

// Get CC recipients based on days overdue
function getCcRecipients(diasAtraso: number): string[] {
  const baseCc = ["financeiro@aeight.global"];
  
  // 6+ dias: adicionar stakeholders
  if (diasAtraso >= 6) {
    return [...baseCc, "renato@aeight.global", "hugo@lomadee.com"];
  }
  
  return baseCc;
}

// Check if current time is within allowed send window
function isWithinSendWindow(diasAtraso: number): boolean {
  const now = new Date();
  const brasilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentHour = brasilTime.getHours();
  
  const allowedTimes = getAllowedSendTimes(diasAtraso);
  
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
  
  return 0;
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

// Build dynamic email subject
function buildEmailSubject(
  cliente: ClienteCobranca,
  template: EmailTemplate,
  numeroNf: string | null,
  centroCusto: string | null
): string {
  const nfDisplay = numeroNf || "N/A";
  const ccDisplay = centroCusto || "N/A";
  
  return `${template.urgencyTag} ${cliente.cliente_nome} - NF ${nfDisplay} - Aviso de Cobrança - ${formatCurrency(cliente.total_vencido)} - ${ccDisplay}`;
}

// Build attachments from parcela links
function buildAttachments(parcelas: ParcelaVencida[]): Array<{ path: string; filename: string }> {
  const attachments: Array<{ path: string; filename: string }> = [];
  const addedUrls = new Set<string>();
  
  for (const parcela of parcelas) {
    // Add NF if available and not already added
    if (parcela.link_nf && !addedUrls.has(parcela.link_nf)) {
      const nfFilename = parcela.numero_nf 
        ? `NF_${parcela.numero_nf}.pdf`
        : `NF_${formatDate(parcela.data_vencimento).replace(/\//g, '-')}.pdf`;
      
      attachments.push({
        path: parcela.link_nf,
        filename: nfFilename,
      });
      addedUrls.add(parcela.link_nf);
    }
    
    // Add Boleto if available and not already added
    if (parcela.link_boleto && !addedUrls.has(parcela.link_boleto)) {
      const boletoFilename = `Boleto_${formatDate(parcela.data_vencimento).replace(/\//g, '-')}.pdf`;
      
      attachments.push({
        path: parcela.link_boleto,
        filename: boletoFilename,
      });
      addedUrls.add(parcela.link_boleto);
    }
  }
  
  return attachments;
}

function buildEmailHtml(cliente: ClienteCobranca, template: EmailTemplate): string {
  const parcelasRows = cliente.parcelas
    .map(
      (p) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${p.contrato_numero || "-"}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${p.servico_nome || "-"}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${p.numero_nf || "-"}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatDate(p.data_vencimento)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: ${template.headerColor}; font-weight: 600;">${p.dias_atraso} dias</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(p.valor)}</td>
      </tr>
    `
    )
    .join("");

  const freezeWarningHtml = template.showFreezeWarning ? `
    <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 0 0 24px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #dc2626;">⚠️ AVISO DE CONGELAMENTO ⚠️</p>
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        O projeto será <strong>CONGELADO</strong> em até <strong>48 horas</strong> caso o pagamento não seja regularizado.
        Todos os serviços serão suspensos até a quitação do débito.
      </p>
    </div>
  ` : "";

  const attachmentNotice = `
    <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #166534;">
        📎 <strong>Anexos:</strong> Este e-mail inclui a Nota Fiscal e o Boleto para pagamento em anexo (quando disponíveis).
      </p>
    </div>
  `;

  const totalBoxGradient = template.showFreezeWarning 
    ? "linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)"
    : template.headerColor === "#f97316"
      ? "linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)"
      : "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)";

  const totalTextColor = template.showFreezeWarning ? "#991b1b" : template.headerColor === "#f97316" ? "#9a3412" : "#78350f";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <!-- Header -->
      <div style="background: ${template.headerGradient}; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${template.title}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${template.subtitle}</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          Prezado(a) <strong>${cliente.cliente_nome}</strong>,
        </p>
        
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          ${template.mainMessage}
        </p>

        ${freezeWarningHtml}
        
        <!-- Table -->
        <div style="overflow-x: auto; margin: 0 0 24px 0;">
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Contrato</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Serviço</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">NF</th>
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
        <div style="background: ${totalBoxGradient}; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
          <p style="margin: 0; font-size: 14px; color: ${totalTextColor}; font-weight: 500;">Total em Aberto</p>
          <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 700; color: ${totalTextColor};">${formatCurrency(cliente.total_vencido)}</p>
        </div>

        ${attachmentNotice}
        
        <p style="font-size: 15px; margin: 0 0 16px 0; color: #4b5563; ${template.showFreezeWarning ? 'font-weight: 600;' : ''}">
          ${template.warningMessage}
        </p>
        
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          ${template.footerMessage}
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

    // Fetch overdue receivables with NF and Boleto links
    let query = supabase
      .from("contas_receber")
      .select(`
        id,
        descricao,
        data_vencimento,
        valor,
        cliente_id,
        parcela_id,
        numero_nf,
        link_nf,
        link_boleto,
        centro_custo,
        clientes(id, razao_social, email),
        parcelas_contrato(
          contrato_id,
          contratos(
            numero_contrato,
            servicos,
            centro_custo
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

    // Fetch centros de custo for mapping
    const { data: centrosCusto } = await supabase.from("centros_custo").select("id, codigo, descricao");
    const centrosCustoMap = new Map(centrosCusto?.map((cc: any) => [cc.id, `${cc.codigo} - ${cc.descricao}`]) || []);

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
      let centroCustoNome = "";
      
      // Try to get centro_custo from conta first, then from contract
      let centroCustoId = conta.centro_custo;
      
      if (conta.parcelas_contrato) {
        const parcela = conta.parcelas_contrato as any;
        if (parcela.contratos) {
          contratoNumero = parcela.contratos.numero_contrato || "";
          const servicosJson = parcela.contratos.servicos;
          if (servicosJson && Array.isArray(servicosJson) && servicosJson.length > 0) {
            const primeiroServico = servicosJson[0];
            servicoNome = servicosMap.get(primeiroServico) || "";
          }
          // Use contract's centro_custo if conta doesn't have one
          if (!centroCustoId && parcela.contratos.centro_custo) {
            centroCustoId = parcela.contratos.centro_custo;
          }
        }
      }

      // Get centro de custo name
      if (centroCustoId) {
        centroCustoNome = centrosCustoMap.get(centroCustoId) || centroCustoId;
      }

      const parcela: ParcelaVencida = {
        id: conta.id,
        descricao: conta.descricao,
        data_vencimento: conta.data_vencimento,
        valor: conta.valor,
        dias_atraso: diasAtraso,
        contrato_numero: contratoNumero,
        servico_nome: servicoNome,
        numero_nf: conta.numero_nf,
        link_nf: conta.link_nf,
        link_boleto: conta.link_boleto,
        centro_custo: centroCustoNome,
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

      // Get email template based on days overdue
      const template = getEmailTemplate(diasAtraso);
      
      // Build email content with template
      const htmlContent = buildEmailHtml(clienteData, template);
      
      // Build dynamic subject
      const primeiroNumeroNf = clienteData.parcelas.find(p => p.numero_nf)?.numero_nf || null;
      const primeiroCentroCusto = clienteData.parcelas.find(p => p.centro_custo)?.centro_custo || null;
      const subject = buildEmailSubject(clienteData, template, primeiroNumeroNf, primeiroCentroCusto);
      
      // Get CC recipients based on days overdue
      const ccRecipients = getCcRecipients(diasAtraso);
      
      // Build attachments from parcelas
      const attachments = buildAttachments(clienteData.parcelas);

      try {
        console.log(`Sending email to ${clienteData.cliente_nome}:`, {
          template: template.urgencyTag,
          diasAtraso,
          ccRecipients,
          attachmentsCount: attachments.length,
          subject,
        });

        const emailPayload: any = {
          from: "Financeiro Aeight <cobranca@financeiro.aeight.global>",
          to: clienteData.emails,
          cc: ccRecipients,
          subject,
          html: htmlContent,
        };

        // Only add attachments if there are any
        if (attachments.length > 0) {
          emailPayload.attachments = attachments;
          console.log(`Including ${attachments.length} attachments:`, attachments.map(a => a.filename));
        }

        const emailResponse = await resend.emails.send(emailPayload);

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
