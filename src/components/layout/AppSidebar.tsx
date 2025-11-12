import { 
  Building2, 
  Users, 
  Truck, 
  FileText, 
  CreditCard, 
  PiggyBank, 
  TreePine, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Home,
  Settings,
  FolderKanban,
  UserCog,
  LogOut
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck },
  { title: "Contratos", url: "/contratos", icon: FileText },
  { title: "Serviços", url: "/servicos", icon: Settings },
  { title: "Contas Bancárias", url: "/contas-bancarias", icon: CreditCard },
  { title: "Centro de Custos", url: "/centro-custos", icon: FolderKanban },
  { title: "Plano de Contas", url: "/plano-contas", icon: TreePine },
  { title: "Contas a Receber", url: "/contas-receber", icon: TrendingUp },
  { title: "Contas a Pagar", url: "/contas-pagar", icon: TrendingDown },
  { title: "Extrato", url: "/extrato", icon: BarChart3 },
  { title: "Usuários", url: "/usuarios", icon: UserCog },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate('/auth');
  };

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      <header className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">A&EIGHT</h2>
            <p className="text-sm text-muted-foreground">ERP System</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-3">Menu Principal</p>
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive(item.url)
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <footer className="p-4 border-t border-border">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground px-2">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-foreground hover:bg-secondary"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </footer>
    </aside>
  );
}