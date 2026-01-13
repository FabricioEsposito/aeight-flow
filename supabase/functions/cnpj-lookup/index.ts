import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache em memória para CNPJs (persiste durante a vida da função)
const cnpjCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

interface CnpjResult {
  success: boolean;
  data?: {
    razao_social: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    telefone: string;
    email: string;
  };
  error?: string;
  fromCache?: boolean;
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function buscarCnpjBrasilApi(cnpj: string): Promise<any> {
  console.log(`[BrasilAPI] Buscando CNPJ: ${cnpj}`);
  const response = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  
  if (!response.ok) {
    throw new Error(`BrasilAPI retornou status ${response.status}`);
  }
  
  const dados = await response.json();
  console.log(`[BrasilAPI] Sucesso para CNPJ: ${cnpj}`);
  
  return {
    razao_social: dados.razao_social || dados.nome || "",
    endereco: dados.logradouro || "",
    numero: dados.numero || "",
    complemento: dados.complemento || "",
    bairro: dados.bairro || "",
    cidade: dados.municipio || "",
    uf: dados.uf || "",
    cep: (dados.cep || "").replace(/\D/g, ""),
    telefone: dados.telefone || "",
    email: dados.email || "",
  };
}

async function buscarCnpjWs(cnpj: string): Promise<any> {
  console.log(`[CNPJ.ws] Buscando CNPJ: ${cnpj}`);
  const response = await fetchWithTimeout(`https://publica.cnpj.ws/cnpj/${cnpj}`);
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    throw new Error(`CNPJ.ws retornou status ${response.status}`);
  }
  
  const dados = await response.json();
  console.log(`[CNPJ.ws] Sucesso para CNPJ: ${cnpj}`);
  
  const estabelecimento = dados.estabelecimento || {};
  
  return {
    razao_social: dados.razao_social || "",
    endereco: estabelecimento.logradouro || "",
    numero: estabelecimento.numero || "",
    complemento: estabelecimento.complemento || "",
    bairro: estabelecimento.bairro || "",
    cidade: estabelecimento.cidade?.nome || "",
    uf: estabelecimento.estado?.sigla || "",
    cep: (estabelecimento.cep || "").replace(/\D/g, ""),
    telefone: estabelecimento.telefone1 ? `${estabelecimento.ddd1 || ""}${estabelecimento.telefone1}` : "",
    email: estabelecimento.email || "",
  };
}

async function buscarCnpj(cnpj: string): Promise<CnpjResult> {
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  
  if (cnpjLimpo.length !== 14) {
    return { success: false, error: "CNPJ inválido - deve ter 14 dígitos" };
  }
  
  // Verificar cache
  const cached = cnpjCache.get(cnpjLimpo);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`[Cache] Hit para CNPJ: ${cnpjLimpo}`);
    return { success: true, data: cached.data, fromCache: true };
  }
  
  // Tentar BrasilAPI primeiro
  try {
    const data = await buscarCnpjBrasilApi(cnpjLimpo);
    cnpjCache.set(cnpjLimpo, { data, timestamp: Date.now() });
    return { success: true, data };
  } catch (error) {
    console.log(`[BrasilAPI] Falha: ${error.message}, tentando CNPJ.ws...`);
  }
  
  // Fallback para CNPJ.ws com retry
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        // Aguardar antes de retry (backoff exponencial)
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[CNPJ.ws] Aguardando ${delay}ms antes do retry ${attempt}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const data = await buscarCnpjWs(cnpjLimpo);
      cnpjCache.set(cnpjLimpo, { data, timestamp: Date.now() });
      return { success: true, data };
    } catch (error) {
      console.log(`[CNPJ.ws] Tentativa ${attempt} falhou: ${error.message}`);
      
      if (attempt === 3) {
        return { success: false, error: `Não foi possível consultar o CNPJ após 3 tentativas: ${error.message}` };
      }
    }
  }
  
  return { success: false, error: "Erro desconhecido ao consultar CNPJ" };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const cnpj = url.searchParams.get('cnpj');
    const cnpjsParam = url.searchParams.get('cnpjs');
    
    // Consulta única
    if (cnpj) {
      console.log(`[Request] Consulta única: ${cnpj}`);
      const result = await buscarCnpj(cnpj);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400,
      });
    }
    
    // Consulta em lote
    if (cnpjsParam) {
      const cnpjs = cnpjsParam.split(',').map(c => c.trim()).filter(c => c);
      console.log(`[Request] Consulta em lote: ${cnpjs.length} CNPJs`);
      
      const results: Record<string, CnpjResult> = {};
      
      for (let i = 0; i < cnpjs.length; i++) {
        const cnpjItem = cnpjs[i];
        console.log(`[Batch] Processando ${i + 1}/${cnpjs.length}: ${cnpjItem}`);
        
        results[cnpjItem] = await buscarCnpj(cnpjItem);
        
        // Delay entre requisições para evitar rate limiting (exceto cache hits)
        if (i < cnpjs.length - 1 && !results[cnpjItem].fromCache) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(
      JSON.stringify({ success: false, error: "Parâmetro 'cnpj' ou 'cnpjs' é obrigatório" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
    
  } catch (error) {
    console.error('[Error]', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
