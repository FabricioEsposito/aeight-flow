import { useState, useEffect } from "react";
import { useClearFiltersOnAreaChange } from '@/hooks/useSessionState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Edit, UserX, Trash2, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AppRole, useUserRole } from "@/hooks/useUserRole";
import { VendedorSelect } from "@/components/contratos/VendedorSelect";

interface Vendedor {
  id: string;
  nome: string;
}

const roleOptions: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrador', description: 'Acesso total ao sistema e todas as aprovações' },
  { value: 'finance_manager', label: 'Gerente de Finanças', description: 'Acesso financeiro, comercial e cadastro, edições e aprovações' },
  { value: 'finance_analyst', label: 'Analista Financeiro', description: 'Acesso financeiro e cadastro, solicita aprovação para edições' },
  { value: 'commercial_manager', label: 'Gerente Comercial', description: 'Acesso comercial, edita vendedores e aprova comissões' },
  { value: 'salesperson', label: 'Vendedor', description: 'Acesso ao dashboard comercial e comissionamento' },
  { value: 'user', label: 'Usuário Básico', description: 'Acesso limitado, aguarda atribuição de nível' },
];

const getRoleBadgeVariant = (role: AppRole): "default" | "secondary" | "outline" | "destructive" => {
  switch (role) {
    case 'admin':
      return 'default';
    case 'finance_manager':
    case 'commercial_manager':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function Usuarios() {
  useClearFiltersOnAreaChange('usuarios');
  const [openEdit, setOpenEdit] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [toggleStatusUserId, setToggleStatusUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState<AppRole>("user");
  const [editVendedorId, setEditVendedorId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, getRoleLabel } = useUserRole();

  // Verificar se o usuário é admin
  const { data: isAdminCheck, isLoading: checkingAdmin } = useQuery({
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
    if (!checkingAdmin && !isAdminCheck) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAdminCheck, checkingAdmin, navigate, toast]);

  // Buscar todos os usuários com status
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-users-with-status');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Fetch vendedor_id from profiles for each user
      const userIds = data.users.map((u: any) => u.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, vendedor_id')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.vendedor_id]) || []);
      
      return data.users.map((u: any) => ({
        ...u,
        vendedor_id: profileMap.get(u.id) || null,
      }));
    },
  });

  // Buscar vendedores cadastrados
  const { data: vendedores } = useQuery({
    queryKey: ['vendedores-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendedores')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome');
      
      if (error) throw error;
      return data as Vendedor[];
    },
  });

  // Atualizar role do usuário
  const updateUserMutation = useMutation({
    mutationFn: async (formData: { userId: string; role: AppRole; vendedor_id?: string | null }) => {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: formData,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: "Nível hierárquico atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      setOpenEdit(false);
      setEditingUser(null);
      setEditVendedorId("");
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: "Erro ao atualizar nível",
        description: error.message || "Ocorreu um erro ao tentar atualizar o nível hierárquico.",
        variant: "destructive",
      });
    },
  });

  // Inativar/Ativar usuário
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'ban' | 'unban' }) => {
      const { data, error } = await supabase.functions.invoke('toggle-user-status', {
        body: { userId, action }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: variables.action === 'ban' ? "Usuário inativado!" : "Usuário ativado!",
        description: variables.action === 'ban' 
          ? "O usuário não poderá mais acessar o sistema." 
          : "O usuário poderá acessar o sistema novamente.",
      });
      setToggleStatusUserId(null);
    },
    onError: (error: any) => {
      console.error('Toggle status error:', error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Não foi possível alterar o status do usuário.",
        variant: "destructive",
      });
    },
  });

  // Excluir usuário
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: "Usuário excluído!",
        description: "O usuário foi removido do sistema.",
      });
      setDeleteUserId(null);
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Não foi possível excluir o usuário.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (usuario: any) => {
    setEditingUser(usuario);
    setEditRole(usuario.role || 'user');
    setEditVendedorId(usuario.vendedor_id || "");
    setOpenEdit(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        role: editRole,
        vendedor_id: editRole === 'salesperson' ? (editVendedorId || null) : null,
      });
    }
  };

  if (checkingAdmin || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie os níveis hierárquicos dos usuários</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nível Hierárquico</TableHead>
                <TableHead>Vendedor Vinculado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios?.map((usuario: any) => {
                const vendedorVinculado = vendedores?.find(v => v.id === usuario.vendedor_id);
                return (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.nome || 'N/A'}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(usuario.role || 'user')}>
                        {getRoleLabel(usuario.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.role === 'salesperson' ? (
                        vendedorVinculado ? (
                          <Badge variant="outline">{vendedorVinculado.nome}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Não vinculado</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {usuario.banned ? (
                        <Badge variant="destructive">Inativo</Badge>
                      ) : usuario.status === 'pendente' ? (
                        <Badge variant="outline">Pendente</Badge>
                      ) : (
                        <Badge variant="default">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {usuario.created_at 
                        ? new Date(usuario.created_at).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUser(usuario)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Nível
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {usuario.banned ? (
                          <DropdownMenuItem onClick={() => setToggleStatusUserId(usuario.id)}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Ativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setToggleStatusUserId(usuario.id)}>
                            <UserX className="mr-2 h-4 w-4" />
                            Inativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteUserId(usuario.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nível Hierárquico</DialogTitle>
            <DialogDescription>
              Atualize o nível de acesso do usuário: {editingUser?.nome || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Nível de Acesso</Label>
              <Select value={editRole} onValueChange={(value: AppRole) => setEditRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editRole && (
                <p className="text-xs text-muted-foreground">
                  {roleOptions.find(r => r.value === editRole)?.description}
                </p>
              )}
            </div>

            {editRole === 'salesperson' && (
              <div className="space-y-2">
                <Label htmlFor="edit-vendedor">Vincular Vendedor</Label>
                <Select value={editVendedorId} onValueChange={setEditVendedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores?.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vincule este usuário a um vendedor cadastrado para que ele possa visualizar suas comissões e vendas.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={!!toggleStatusUserId} 
        onOpenChange={(open) => !open && setToggleStatusUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {usuarios?.find((u: any) => u.id === toggleStatusUserId)?.banned 
                ? "Ativar usuário?" 
                : "Inativar usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {usuarios?.find((u: any) => u.id === toggleStatusUserId)?.banned
                ? "Este usuário poderá acessar o sistema novamente."
                : "Este usuário não poderá mais acessar o sistema."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const usuario = usuarios?.find((u: any) => u.id === toggleStatusUserId);
                if (usuario && toggleStatusUserId) {
                  toggleStatusMutation.mutate({
                    userId: toggleStatusUserId,
                    action: usuario.banned ? 'unban' : 'ban'
                  });
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={!!deleteUserId} 
        onOpenChange={(open) => !open && setDeleteUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
