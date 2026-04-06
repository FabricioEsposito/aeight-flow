const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const response = await fetch('https://brasilapi.com.br/api/banks/v1', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`BrasilAPI error: ${response.status}`)
    }

    const banks = await response.json()

    // Normalize to { code, name } format, filter out banks without code
    const normalized = banks
      .filter((b: any) => b.code !== null && b.code !== undefined)
      .map((b: any) => ({
        code: String(b.code).padStart(3, '0'),
        name: b.fullName || b.name || '',
      }))
      .sort((a: any, b: any) => a.code.localeCompare(b.code))

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error fetching bank list:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch bank list' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
