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
  UserCog
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

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
  const { state } = useSidebar();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={`border-r border-border`} collapsible="icon">
      <SidebarHeader className="p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">A&EIGHT</h2>
              <p className="text-sm text-muted-foreground">ERP System</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        isActive(item.url)
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-secondary text-foreground"
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}