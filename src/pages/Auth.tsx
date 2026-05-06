import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { Building2 } from 'lucide-react';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255, { message: "Email deve ter menos de 255 caracteres" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }).max(72, { message: "Senha deve ter no máximo 72 caracteres" }),
  nome: z.string().trim().max(100, { message: "Nome deve ter menos de 100 caracteres" }).optional(),
});

type SignupTipo = 'interno' | 'prestador' | 'funcionario';


export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [signupTipo, setSignupTipo] = useState<SignupTipo>('interno');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Check recovery mode FIRST before redirecting
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setIsRecoveryMode(true);
    }
  }, [searchParams]);

  // Only redirect if NOT in recovery mode
  useEffect(() => {
    if (user && !isRecoveryMode) {
      navigate('/');
    }
  }, [user, navigate, isRecoveryMode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = authSchema.omit({ nome: true }).parse({ email, password });
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Erro ao fazer login",
            description: "Email ou senha incorretos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao fazer login",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta.",
      });
      
      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validated = authSchema.pick({ password: true }).parse({ password });
      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: validated.password
      });

      if (error) {
        toast({
          title: "Erro ao definir senha",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Senha definida com sucesso!",
        description: "Você já pode fazer login com sua nova senha.",
      });

      setIsRecoveryMode(false);
      setPassword('');
      setConfirmPassword('');
      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Senha inválida",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe seu email.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validated = authSchema.pick({ email: true }).parse({ email });
      setIsLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      setIsForgotPasswordMode(false);
      setEmail('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Email inválido",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validated = authSchema.parse({ email, password, nome });
      setIsLoading(true);

      // For prestador/funcionario: must validate CNPJ/CPF matches a fornecedor
      let fornecedorId: string | null = null;
      if (signupTipo !== 'interno') {
        const cleaned = cnpjCpf.replace(/\D/g, '');
        if (!cleaned || cleaned.length < 11) {
          toast({ title: 'CNPJ/CPF inválido', description: 'Informe um documento válido.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        const { data: forn } = await supabase
          .from('fornecedores')
          .select('id')
          .or(`cnpj_cpf.eq.${cleaned},cnpj_cpf.eq.${cnpjCpf}`)
          .maybeSingle();
        if (!forn) {
          toast({ title: 'Cadastro não encontrado', description: 'Seu CNPJ/CPF não está cadastrado como fornecedor. Procure o RH.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        fornecedorId = forn.id;
      }

      const redirectUrl = `${window.location.origin}/`;

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { nome: validated.nome },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({ title: "Erro ao criar conta", description: "Não foi possível criar a conta. Verifique os dados e tente novamente.", variant: "destructive" });
        } else {
          toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
        }
        return;
      }

      // Create vínculo pendente if portal user
      if (signupTipo !== 'interno' && fornecedorId && signUpData.user) {
        await supabase.from('vinculos_usuario_fornecedor' as any).insert({
          user_id: signUpData.user.id,
          fornecedor_id: fornecedorId,
          tipo: signupTipo,
          status: 'pendente',
        });
        toast({ title: 'Cadastro enviado!', description: 'Aguarde a aprovação do administrador para acessar o portal.' });
      } else {
        toast({ title: "Conta criada com sucesso!", description: "Você já pode fazer login." });
      }

      setEmail(''); setPassword(''); setConfirmPassword(''); setNome(''); setCnpjCpf('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-subtle" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <Card className="w-full max-w-md relative z-10 shadow-lg border-border/50">
        <CardHeader className="space-y-4 pb-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm overflow-hidden">
              <img
                src="/favicon-ampersand-black.png"
                alt="A&EIGHT"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {isRecoveryMode ? "Definir Nova Senha" : isForgotPasswordMode ? "Recuperar Senha" : "A&EIGHT ERP"}
            </CardTitle>
            <CardDescription>
              {isRecoveryMode 
                ? "Crie sua nova senha abaixo" 
                : isForgotPasswordMode 
                ? "Digite seu email para receber o link de recuperação"
                : "Sistema de gestão empresarial"}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {isRecoveryMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? "Definindo..." : "Definir Senha"}
              </Button>
            </form>
          ) : isForgotPasswordMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setEmail('');
                }}
              >
                Voltar ao login
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="w-full text-muted-foreground hover:text-primary"
                    onClick={() => setIsForgotPasswordMode(true)}
                  >
                    Esqueci minha senha
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="cadastro">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-nome">Nome</Label>
                    <Input
                      id="signup-nome"
                      type="text"
                      placeholder="Seu nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirme sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      
      {/* Footer */}
      <div className="absolute bottom-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} A&EIGHT Group. Todos os direitos reservados.
      </div>
    </div>
  );
}
