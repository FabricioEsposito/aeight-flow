import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
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

    const { email, nome, role } = await req.json();

    console.log('Admin', user.id, 'inviting user:', { email, nome, role });

    // Verificar se usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let userId: string;
    const redirectUrl = `${req.headers.get('origin') || 'http://localhost:3000'}/auth`;
    
    if (existingUser) {
      // Usuário já existe, gerar link de magic link para reenvio
      console.log('User already exists, resending invite:', existingUser.id);
      userId = existingUser.id;
      
      // Gerar magic link para usuário existente
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: redirectUrl
        }
      });

      if (linkError) {
        console.error('Error generating magic link:', linkError);
        return new Response(
          JSON.stringify({ error: 'Falha ao gerar link de convite: ' + linkError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Magic link generated successfully for existing user');
    } else {
      // Criar e convidar novo usuário usando o Supabase
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectUrl,
        data: {
          nome: nome
        }
      });

      if (inviteError) {
        console.error('Error inviting new user:', inviteError);
        return new Response(
          JSON.stringify({ error: 'Falha ao convidar usuário: ' + inviteError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('User invited successfully via Supabase');
      userId = inviteData.user.id;
    }

    // O trigger handle_new_user já cria automaticamente uma role 'user'
    // Se a role for 'admin', precisamos atualizar a role existente
    if (role === 'admin') {
      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

      if (roleUpdateError) {
        console.error('Error updating role to admin:', roleUpdateError);
        return new Response(
          JSON.stringify({ error: 'User invited but role assignment failed' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Role updated to admin successfully');
    } else {
      console.log('Role already set to user by trigger');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        message: existingUser ? 'Convite reenviado com sucesso.' : 'Usuário criado. Um email com link para definir a senha foi enviado.'
      }),
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
