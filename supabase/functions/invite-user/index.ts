import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nome, role } = await req.json();

    console.log('Inviting user:', { email, nome, role });

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

    // Verificar se usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let userId: string;
    
    if (existingUser) {
      // Usuário já existe, usar o ID existente
      console.log('User already exists, resending invite:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Criar novo usuário com email já confirmado
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          nome: nome
        }
      });

      if (userError) {
        console.error('Error creating user:', userError);
        return new Response(
          JSON.stringify({ error: userError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('User created successfully:', userData.user.id);
      userId = userData.user.id;
    }

    // Gerar link de redefinição de senha
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/auth?type=recovery`
      }
    });

    if (linkError) {
      console.error('Error generating password reset link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate password reset link' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Password reset link generated successfully');
    console.log('Recovery link:', linkData.properties.action_link);

    // Enviar email via Resend
    try {
      const emailResponse = await resend.emails.send({
        from: 'Sistema <onboarding@resend.dev>',
        to: [email],
        subject: 'Convite para cadastro - Defina sua senha',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Olá, ${nome}!</h2>
            <p>Você foi convidado para acessar o sistema.</p>
            <p>Para criar sua senha e acessar o sistema, clique no botão abaixo:</p>
            <a href="${linkData.properties.action_link}" 
               style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Definir Senha
            </a>
            <p>Ou copie e cole o link abaixo no seu navegador:</p>
            <p style="word-break: break-all; color: #666;">${linkData.properties.action_link}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Se você não solicitou este convite, pode ignorar este email.
            </p>
          </div>
        `,
      });

      if (emailResponse.error) {
        console.error('Error sending email via Resend:', emailResponse.error);
        return new Response(
          JSON.stringify({ error: 'User created but failed to send invitation email' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Invitation email sent successfully:', emailResponse);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: 'User created but failed to send invitation email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // O trigger handle_new_user já cria automaticamente uma role 'user'
    // Se a role for 'admin', precisamos atualizar a role existente
    if (role === 'admin') {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error updating role to admin:', roleError);
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
