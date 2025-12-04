import { Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { UserNotificationsDropdown } from "@/components/UserNotificationsDropdown";
import { useUserRole } from "@/hooks/useUserRole";

export function AppHeader() {
  const { signOut, user } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate('/auth');
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative w-96 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar..."
            className="pl-10 bg-background"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isAdmin ? <NotificationsDropdown /> : <UserNotificationsDropdown />}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              {user?.email || 'Minha Conta'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/perfil')}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}