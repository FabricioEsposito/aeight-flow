import { 
  Building2, 
  Users, 
  Truck, 
  FileText, 
  CreditCard, 
  TreePine, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Home,
  Settings,
  FolderKanban,
  UserCog,
  LogOut,
  ClipboardList,
  Receipt,
  Star,
  ChevronDown
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useFavorites } from "@/hooks/useFavorites";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigationGroups = [
  {
    name: "Cadastro",
    items: [
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Fornecedores", url: "/fornecedores", icon: Truck },
      { title: "Contratos", url: "/contratos", icon: FileText },
      { title: "Serviços", url: "/servicos", icon: Settings },
    ]
  },
  {
    name: "Financeiro",
    items: [
      { title: "Controle de Faturamento", url: "/controle-faturamento", icon: Receipt },
      { title: "Extrato", url: "/extrato", icon: BarChart3 },
      { title: "Contas a Receber", url: "/contas-receber", icon: TrendingUp },
      { title: "Contas a Pagar", url: "/contas-pagar", icon: TrendingDown },
      { title: "Contas Bancárias", url: "/contas-bancarias", icon: CreditCard },
      { title: "Centro de Custos", url: "/centro-custos", icon: FolderKanban },
      { title: "Plano de Contas", url: "/plano-contas", icon: TreePine },
    ]
  },
];

const standaloneItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Solicitações", url: "/solicitacoes", icon: ClipboardList },
  { title: "Usuários", url: "/usuarios", icon: UserCog, adminOnly: true },
];

// Flatten all navigation items for favorites lookup
const allNavigationItems = [
  ...standaloneItems,
  ...navigationGroups.flatMap(g => g.items)
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Cadastro": false,
    "Financeiro": false
  });

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

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const favoriteItems = allNavigationItems.filter(item => 
    isFavorite(item.url) && (!('adminOnly' in item) || !item.adminOnly || isAdmin)
  );

  const renderNavItem = (item: typeof standaloneItems[0], showFavoriteStar = true) => (
    <div key={item.title} className="flex items-center gap-1 group">
      <NavLink
        to={item.url}
        className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
          isActive(item.url)
            ? "bg-primary text-primary-foreground font-medium"
            : "hover:bg-secondary text-foreground"
        }`}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">{item.title}</span>
      </NavLink>
      {showFavoriteStar && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(item.url);
          }}
          className={cn(
            "p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100",
            isFavorite(item.url) 
              ? "text-yellow-500 opacity-100" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", isFavorite(item.url) && "fill-current")} />
        </button>
      )}
    </div>
  );

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col fixed left-0 top-0 h-screen">
      <header className="p-4 border-b border-border flex-shrink-0">
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

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Dashboard */}
        <div className="mb-4">
          {renderNavItem(standaloneItems[0])}
        </div>

        {/* Favoritos */}
        {favoriteItems.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 px-3 flex items-center gap-2">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              Favoritos
            </p>
            <nav className="space-y-1">
              {favoriteItems.map((item) => renderNavItem(item, false))}
            </nav>
          </div>
        )}

        {/* Grouped Navigation */}
        {navigationGroups.map((group) => (
          <Collapsible 
            key={group.name} 
            open={openGroups[group.name]} 
            onOpenChange={() => toggleGroup(group.name)}
            className="mb-4"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <span>{group.name}</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                openGroups[group.name] && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              <nav className="space-y-1">
                {group.items.map((item) => renderNavItem(item))}
              </nav>
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* Standalone Items (Solicitações, Usuários) */}
        <div className="mt-4 pt-4 border-t border-border">
          <nav className="space-y-1">
            {standaloneItems.slice(1)
              .filter(item => !item.adminOnly || isAdmin)
              .map((item) => renderNavItem(item))}
          </nav>
        </div>
      </div>

      <footer className="p-4 border-t border-border flex-shrink-0">
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
