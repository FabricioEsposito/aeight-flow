import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'faturamento-docs';

interface RepairItem {
  table: 'contas_pagar' | 'contas_receber';
  id: string;
  field: 'link_nf' | 'link_boleto';
  oldUrl: string;
  status: 'ok' | 'repaired' | 'broken_unrepairable' | 'invalid_url';
  newUrl?: string;
  reason?: string;
}

function extractPath(url: string): string | null {
  try {
    const u = new URL(url);
    const pub = u.pathname.split(`/storage/v1/object/public/${BUCKET}/`);
    if (pub[1]) return decodeURIComponent(pub[1].split('?')[0]);
    const sig = u.pathname.split(`/storage/v1/object/sign/${BUCKET}/`);
    if (sig[1]) return decodeURIComponent(sig[1].split('?')[0]);
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'finance_manager', 'rh_manager']).maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dryRun = false } = await req.json().catch(() => ({}));
    const results: RepairItem[] = [];

    // Cache list per folder to reduce storage calls
    const folderCache = new Map<string, string[]>();
    const listFolder = async (folder: string): Promise<string[]> => {
      if (folderCache.has(folder)) return folderCache.get(folder)!;
      const { data, error } = await admin.storage.from(BUCKET).list(folder, { limit: 1000 });
      const names = (!error && data) ? data.map(f => f.name) : [];
      folderCache.set(folder, names);
      return names;
    };

    const checkAndRepair = async (
      table: 'contas_pagar' | 'contas_receber',
      id: string,
      field: 'link_nf' | 'link_boleto',
      url: string,
    ) => {
      const path = extractPath(url);
      if (!path) {
        results.push({ table, id, field, oldUrl: url, status: 'invalid_url' });
        return;
      }
      // Check existence by trying to create a signed URL
      const { error: signErr } = await admin.storage.from(BUCKET).createSignedUrl(path, 60);
      if (!signErr) {
        results.push({ table, id, field, oldUrl: url, status: 'ok' });
        return;
      }

      // Broken — try to find a replacement in the same folder
      const lastSlash = path.lastIndexOf('/');
      const folder = lastSlash >= 0 ? path.substring(0, lastSlash) : '';
      const filename = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
      const files = await listFolder(folder);

      // Heuristic: match by prefix (nf-, boleto-, nf.pdf, boleto.pdf)
      const fieldPrefix = field === 'link_nf' ? 'nf' : 'boleto';
      const candidates = files.filter(f =>
        f.toLowerCase().startsWith(`${fieldPrefix}.`) ||
        f.toLowerCase().startsWith(`${fieldPrefix}-`)
      );

      // Prefer exact "nf.pdf" / "boleto.pdf" first, then most recent (timestamp suffix)
      candidates.sort((a, b) => {
        const aExact = a.toLowerCase().startsWith(`${fieldPrefix}.`) ? 0 : 1;
        const bExact = b.toLowerCase().startsWith(`${fieldPrefix}.`) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return b.localeCompare(a);
      });

      if (candidates.length === 0) {
        results.push({ table, id, field, oldUrl: url, status: 'broken_unrepairable', reason: `Nenhum arquivo encontrado em ${folder}` });
        return;
      }

      const newPath = `${folder}/${candidates[0]}`;
      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(newPath);
      const newUrl = `${pub.publicUrl}?v=${Date.now()}`;

      if (!dryRun) {
        await admin.from(table).update({ [field]: newUrl }).eq('id', id);
      }
      results.push({ table, id, field, oldUrl: url, status: 'repaired', newUrl });
    };

    // Pagination helper
    const fetchAll = async (table: 'contas_pagar' | 'contas_receber') => {
      const all: { id: string; link_nf: string | null; link_boleto: string | null }[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await admin
          .from(table)
          .select('id, link_nf, link_boleto')
          .or('link_nf.not.is.null,link_boleto.not.is.null')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    };

    for (const table of ['contas_pagar', 'contas_receber'] as const) {
      const rows = await fetchAll(table);
      for (const row of rows) {
        if (row.link_nf) await checkAndRepair(table, row.id, 'link_nf', row.link_nf);
        if (row.link_boleto) await checkAndRepair(table, row.id, 'link_boleto', row.link_boleto);
      }
    }

    const summary = {
      total: results.length,
      ok: results.filter(r => r.status === 'ok').length,
      repaired: results.filter(r => r.status === 'repaired').length,
      broken_unrepairable: results.filter(r => r.status === 'broken_unrepairable').length,
      invalid_url: results.filter(r => r.status === 'invalid_url').length,
      dryRun,
    };

    const issues = results.filter(r => r.status !== 'ok');

    return new Response(JSON.stringify({ summary, issues }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('repair-broken-attachments error:', e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
