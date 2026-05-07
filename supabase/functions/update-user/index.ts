import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('User is not an admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, email, nome, role, vendedor_id, fornecedor_id, grupo_id, regime_contrato, is_lider_area, lidera_grupo_id } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin', user.id, 'updating user:', userId);

    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Atualizar profile
    const profileUpdates: any = {};
    if (nome !== undefined) profileUpdates.nome = nome;
    if (email !== undefined) profileUpdates.email = email;
    if (vendedor_id !== undefined) profileUpdates.vendedor_id = vendedor_id || null;
    if (fornecedor_id !== undefined) profileUpdates.fornecedor_id = fornecedor_id || null;
    if (grupo_id !== undefined) profileUpdates.grupo_id = grupo_id || null;
    if (regime_contrato !== undefined) profileUpdates.regime_contrato = regime_contrato || null;
    if (is_lider_area !== undefined) profileUpdates.is_lider_area = !!is_lider_area;
    if (lidera_grupo_id !== undefined) profileUpdates.lidera_grupo_id = lidera_grupo_id || null;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', userId);
      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Atualizar role
    if (role) {
      const { error: roleUpdateError } = await supabaseAdmin.from('user_roles').update({ role }).eq('user_id', userId);
      if (roleUpdateError) {
        return new Response(JSON.stringify({ error: roleUpdateError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Auto-aprovar vínculo quando admin liga fornecedor + regime
    if (fornecedor_id && regime_contrato) {
      const { data: existing } = await supabaseAdmin
        .from('vinculos_usuario_fornecedor').select('id').eq('user_id', userId).maybeSingle();
      const vinculoPayload: any = {
        user_id: userId, fornecedor_id, tipo: regime_contrato,
        status: 'aprovado', aprovado_por: user.id, aprovado_em: new Date().toISOString(), motivo_rejeicao: null,
      };
      if (existing?.id) {
        await supabaseAdmin.from('vinculos_usuario_fornecedor').update(vinculoPayload).eq('id', existing.id);
      } else {
        await supabaseAdmin.from('vinculos_usuario_fornecedor').insert(vinculoPayload);
      }
    }

    // Liderança de grupo: limpa anteriores, set novo se is_lider_area
    if (is_lider_area !== undefined) {
      await supabaseAdmin.from('grupos_area').update({ lider_user_id: null }).eq('lider_user_id', userId);
      if (is_lider_area && lidera_grupo_id) {
        await supabaseAdmin.from('grupos_area').update({ lider_user_id: userId }).eq('id', lidera_grupo_id);
      }
    }

    console.log('User updated successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
