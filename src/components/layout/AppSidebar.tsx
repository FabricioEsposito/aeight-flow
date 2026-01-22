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
  ChevronDown,
  ShoppingCart,
  DollarSign,
  UserCheck
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useFavorites } from "@/hooks/useFavorites";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  adminOnly?: boolean;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

const allNavigationGroups: NavGroup[] = [
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
    name: "Comercial",
    items: [
      { title: "Dashboard Comercial", url: "/dashboard-comercial", icon: ShoppingCart },
      { title: "Vendedores", url: "/vendedores", icon: UserCheck },
      { title: "Comissionamento", url: "/comissionamento", icon: DollarSign },
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

const allStandaloneItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Solicitações", url: "/solicitacoes", icon: ClipboardList },
  { title: "Usuários", url: "/usuarios", icon: UserCog, adminOnly: true },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { role, permissions, getRoleLabel } = useUserRole();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Cadastro": false,
    "Comercial": false,
    "Financeiro": false
  });

  // Filter navigation based on role permissions
  const filteredNavigationGroups = useMemo(() => {
    return allNavigationGroups
      .map(group => {
        // Filter group visibility
        if (group.name === "Cadastro" && !permissions.canAccessCadastro) return null;
        if (group.name === "Comercial" && !permissions.canAccessComercial) return null;
        if (group.name === "Financeiro" && !permissions.canAccessFinanceiro) return null;

        // For salesperson, only show Dashboard Comercial and Comissionamento
        if (role === 'salesperson' && group.name === "Comercial") {
          return {
            ...group,
            items: group.items.filter(item => 
              item.url === '/dashboard-comercial' || item.url === '/comissionamento'
            )
          };
        }

        return group;
      })
      .filter(Boolean) as NavGroup[];
  }, [permissions, role]);

  const filteredStandaloneItems = useMemo(() => {
    return allStandaloneItems.filter(item => {
      if (item.url === "/" && !permissions.canAccessDashboard) return false;
      if (item.url === "/solicitacoes" && !permissions.canAccessSolicitacoes) return false;
      if (item.adminOnly && !permissions.canAccessUsuarios) return false;
      return true;
    });
  }, [permissions]);

  // Flatten all visible items for favorites
  const allVisibleItems = useMemo(() => [
    ...filteredStandaloneItems,
    ...filteredNavigationGroups.flatMap(g => g.items)
  ], [filteredStandaloneItems, filteredNavigationGroups]);

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

  const favoriteItems = allVisibleItems.filter(item => isFavorite(item.url));

  const salespersonItems = useMemo(() => {
    if (role !== 'salesperson') return [];
    const comercialGroup = filteredNavigationGroups.find(g => g.name === 'Comercial');
    return comercialGroup?.items ?? [];
  }, [filteredNavigationGroups, role]);

  const handleNavigation = () => {
    onNavigate?.();
  };

  const renderNavItem = (item: NavItem, showFavoriteStar = true) => (
    <div key={item.title} className="flex items-center gap-1 group">
      <NavLink
        to={item.url}
        onClick={handleNavigation}
        className={cn(
          "flex-1 flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200",
          isActive(item.url)
            ? "bg-primary text-primary-foreground font-medium shadow-sm"
            : "text-foreground hover:bg-secondary"
        )}
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
            "p-1.5 rounded transition-all duration-200 opacity-0 group-hover:opacity-100",
            isFavorite(item.url) 
              ? "text-warning opacity-100" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", isFavorite(item.url) && "fill-current")} />
        </button>
      )}
    </div>
  );

  // If user has no permissions (basic user), show limited sidebar
  const hasAnyAccess = permissions.canAccessDashboard || 
    permissions.canAccessCadastro || 
    permissions.canAccessComercial || 
    permissions.canAccessFinanceiro;

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full md:fixed md:left-0 md:top-0 md:h-screen">
      {/* Header with A&EIGHT branding */}
      <header className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground tracking-tight">A&EIGHT</h2>
            <p className="text-xs text-muted-foreground font-medium">ERP System</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {!hasAnyAccess ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <UserCog className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Seu acesso ainda não foi configurado. Aguarde um administrador atribuir seu nível hierárquico.
            </p>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {filteredStandaloneItems.find(item => item.url === "/") && (
              <div className="mb-4">
                {renderNavItem(filteredStandaloneItems.find(item => item.url === "/")!)}
              </div>
            )}

            {/* Favoritos */}
            {favoriteItems.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 px-3 flex items-center gap-2 uppercase tracking-wider">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  Favoritos
                </p>
                <nav className="space-y-1">
                  {favoriteItems.map((item) => renderNavItem(item, false))}
                </nav>
              </div>
            )}

            {/* Navigation */}
            {role === 'salesperson' ? (
              <div className="mb-3">
                <nav className="space-y-1">
                  {salespersonItems.map((item) => renderNavItem(item))}
                </nav>
              </div>
            ) : (
              <>
                {/* Grouped Navigation */}
                {filteredNavigationGroups.map((group) => (
                  <Collapsible
                    key={group.name}
                    open={openGroups[group.name]}
                    onOpenChange={() => toggleGroup(group.name)}
                    className="mb-3"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
                      <span>{group.name}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          openGroups[group.name] && "rotate-180"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 animate-accordion-down">
                      <nav className="space-y-1">{group.items.map((item) => renderNavItem(item))}</nav>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </>
            )}

            {/* Standalone Items (Solicitações, Usuários) */}
            {filteredStandaloneItems.filter(item => item.url !== "/").length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <nav className="space-y-1">
                  {filteredStandaloneItems
                    .filter(item => item.url !== "/")
                    .map((item) => renderNavItem(item))}
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with user info */}
      <footer className="p-4 border-t border-border flex-shrink-0 bg-secondary/30">
        <div className="space-y-3">
          <div className="px-2">
            <div className="text-sm font-medium text-foreground truncate">{user?.email}</div>
            {role && (
              <div className="text-xs mt-0.5 text-primary font-medium">{getRoleLabel(role)}</div>
            )}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
