const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const response = await fetch('https://api-mtls.sandbox.bankly.com.br/banklist', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Bankly API error: ${response.status}`)
    }

    const banks = await response.json()

    return new Response(JSON.stringify(banks), {
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
