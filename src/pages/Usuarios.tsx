import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  nome: z.string().trim().min(1, { message: "Nome é obrigatório" }).max(100),
  role: z.enum(['admin', 'user'], { message: "Selecione um role válido" }),
});

export default function Usuarios() {
  const [openInvite, setOpenInvite] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Verificar se o usuário é admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAdmin, checkingAdmin, navigate, toast]);

  // Buscar todos os usuários com seus perfis e roles
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return profiles;
    },
  });

  // Convidar novo usuário
  const inviteMutation = useMutation({
    mutationFn: async ({ email, nome, role }: { email: string; nome: string; role: 'admin' | 'user' }) => {
      const validated = inviteSchema.parse({ email, nome, role });
      
      // Criar convite via admin
      const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
        validated.email,
        {
          data: { nome: validated.nome },
          redirectTo: `${window.location.origin}/auth`,
        }
      );

      if (authError) throw authError;

      // Aguardar um pouco para o trigger criar o perfil
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar role se for admin
      if (validated.role === 'admin' && authData.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', authData.user.id);

        if (roleError) throw roleError;
      }

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: "Convite enviado!",
        description: "O usuário receberá um email para definir sua senha.",
      });
      setOpenInvite(false);
      setEmail("");
      setNome("");
      setRole("user");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar role do usuário
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'user' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: "Role atualizado!",
        description: "As permissões do usuário foram alteradas.",
      });
      setOpenEdit(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remover usuário
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido do sistema.",
      });
      setDeleteUserId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (checkingAdmin || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground">
              Convide e gerencie usuários do sistema
            </p>
          </div>
          <Dialog open={openInvite} onOpenChange={setOpenInvite}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Envie um convite para um novo usuário acessar o sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome do usuário"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Nível de Acesso</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpenInvite(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => inviteMutation.mutate({ email, nome, role })}
                  disabled={inviteMutation.isPending || !email || !nome}
                >
                  {inviteMutation.isPending ? "Enviando..." : "Enviar Convite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              Lista de todos os usuários cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nível de Acesso</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios?.map((usuario) => {
                    const userRole = (usuario.user_roles as any)?.[0]?.role || 'user';
                    return (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          {usuario.nome || '-'}
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                            {userRole === 'admin' ? 'Administrador' : 'Usuário'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingUser(usuario);
                                setEditRole(userRole as any);
                                setOpenEdit(true);
                              }}
                              disabled={usuario.id === user?.id}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUserId(usuario.id)}
                              disabled={usuario.id === user?.id}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Nível de Acesso</DialogTitle>
              <DialogDescription>
                Altere o nível de acesso de {editingUser?.nome || editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Nível de Acesso</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (editingUser) {
                    updateRoleMutation.mutate({
                      userId: editingUser.id,
                      newRole: editRole,
                    });
                  }
                }}
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
