import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getMonthName(mes: number): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return meses[mes - 1] || "";
}

function buildHoleriteEmailHtml(
  nome: string,
  competencia: string,
  valorLiquido: number,
): string {
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
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Holerite</h1>
        <p style="color: #c7d2fe; margin: 8px 0 0 0; font-size: 14px;">Recursos Humanos — Aeight</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          Prezado(a) <strong>${nome}</strong>,
        </p>
        
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          Segue em anexo o holerite referente à competência <strong>${competencia}</strong>.
        </p>
        
        <!-- Summary Card -->
        <div style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #4338ca; font-weight: 500;">Competência</td>
              <td style="padding: 8px 0; font-size: 16px; font-weight: 600; color: #312e81; text-align: right;">${competencia}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #4338ca; font-weight: 500;">Valor Líquido</td>
              <td style="padding: 8px 0; font-size: 20px; font-weight: 700; color: #312e81; text-align: right;">${formatCurrency(valorLiquido)}</td>
            </tr>
          </table>
        </div>
        
        <!-- Attachment indicator -->
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 0 0 24px 0; display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 12px;">📎</span>
          <div>
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">Holerite em anexo</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #6b7280;">Arquivo PDF</p>
          </div>
        </div>
        
        <p style="font-size: 15px; margin: 0 0 24px 0; color: #4b5563;">
          Em caso de dúvidas, entre em contato com o departamento de Recursos Humanos.
        </p>
        
        <!-- Contact -->
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Dúvidas? Entre em contato:</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">rh@aeight.global</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Este é um e-mail automático do sistema de Recursos Humanos.
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { folha_id } = await req.json();

    if (!folha_id) {
      return new Response(
        JSON.stringify({ success: false, error: "folha_id é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log("Sending holerite email for folha_id:", folha_id);

    // Fetch folha data with fornecedor
    const { data: folha, error: folhaError } = await supabase
      .from("folha_pagamento")
      .select("*, fornecedores(id, razao_social, nome_fantasia, email)")
      .eq("id", folha_id)
      .single();

    if (folhaError || !folha) {
      console.error("Error fetching folha:", folhaError);
      return new Response(
        JSON.stringify({ success: false, error: "Registro de folha não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const holerite_url = (folha as any).holerite_url;
    if (!holerite_url) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum holerite anexado a este registro" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const fornecedor = folha.fornecedores as any;
    if (!fornecedor) {
      return new Response(
        JSON.stringify({ success: false, error: "Fornecedor não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const emails: string[] = (fornecedor.email || []).filter(
      (e: string) => e && e.trim() !== "",
    );

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Fornecedor não possui e-mail cadastrado",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const nome = fornecedor.nome_fantasia || fornecedor.razao_social;
    const competencia = `${getMonthName(folha.mes_referencia)}/${folha.ano_referencia}`;
    const valorLiquido = Number(folha.valor_liquido);

    const htmlContent = buildHoleriteEmailHtml(nome, competencia, valorLiquido);

    const subject = `Holerite ${competencia} | ${nome} | Aeight`;

    // Download PDF for attachment
    const pdfResponse = await fetch(holerite_url);
    if (!pdfResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível baixar o PDF do holerite" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(
      String.fromCharCode(...new Uint8Array(pdfBuffer)),
    );

    const emailResponse = await resend.emails.send({
      from: "RH Aeight <rh@financeiro.aeight.global>",
      to: emails,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: `Holerite_${competencia.replace("/", "_")}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email - use fornecedor_id as cliente_id for compatibility
    await supabase.from("email_logs").insert({
      cliente_id: fornecedor.id,
      email_destino: emails.join(", "),
      tipo: "holerite",
      status: "enviado",
    });

    return new Response(
      JSON.stringify({ success: true, message: "Holerite enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error sending holerite email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
