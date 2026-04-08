import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { file_path, bucket } = await req.json()
    if (!file_path) {
      return new Response(JSON.stringify({ error: 'file_path é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY')
    if (!ocrApiKey) {
      return new Response(JSON.stringify({ error: 'OCR_SPACE_API_KEY não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const bucketName = bucket || 'faturamento-docs'

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(file_path)

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: 'Erro ao baixar arquivo', details: downloadError?.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const formData = new FormData()
    const fileName = file_path.split('/').pop() || 'boleto.pdf'
    formData.append('file', fileData, fileName)
    formData.append('apikey', ocrApiKey)
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('OCREngine', '2')
    formData.append('language', 'por')

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    })

    const ocrResult = await ocrResponse.json()

    if (!ocrResult.ParsedResults || ocrResult.ParsedResults.length === 0) {
      return new Response(JSON.stringify({ linha_digitavel: '', error: 'OCR não retornou resultados' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const fullText = ocrResult.ParsedResults.map((r: any) => r.ParsedText).join('\n')

    // Extract linha digitável patterns:
    // Boleto bancário (47 digits): XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXXX
    // Convênio (48 digits): XXXXXXXXXXX-X XXXXXXXXXXX-X XXXXXXXXXXX-X XXXXXXXXXXX-X
    const lines = fullText.split('\n')
    let linhaDigitavel = ''

    for (const line of lines) {
      const cleaned = line.replace(/[\s.-]/g, '')
      // Check for 47-digit (boleto) or 48-digit (convênio) patterns
      if (/^\d{47}$/.test(cleaned) || /^\d{48}$/.test(cleaned)) {
        linhaDigitavel = line.trim()
        break
      }
    }

    // If not found as a full line, try regex on the entire text
    if (!linhaDigitavel) {
      // Pattern for boleto: 5 digits . 5 digits space 5 digits . 6 digits space 5 digits . 6 digits space 1 digit space 14 digits
      const boletoMatch = fullText.match(/\d{5}\.?\d{5}\s*\d{5}\.?\d{6}\s*\d{5}\.?\d{6}\s*\d\s*\d{14}/)
      if (boletoMatch) {
        linhaDigitavel = boletoMatch[0].trim()
      }
    }

    // Try to find any sequence of 47+ digits
    if (!linhaDigitavel) {
      const digitsOnly = fullText.replace(/[^\d\s.]/g, '')
      const match = digitsOnly.match(/[\d\s.]{47,60}/)
      if (match) {
        const digits = match[0].replace(/[\s.]/g, '')
        if (digits.length >= 47 && digits.length <= 48) {
          linhaDigitavel = match[0].trim()
        }
      }
    }

    return new Response(JSON.stringify({ linha_digitavel: linhaDigitavel }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro interno', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
