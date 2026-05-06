import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SessionTimeoutProvider } from "./components/SessionTimeoutProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import Contratos from "./pages/Contratos";
import NovoContrato from "./pages/NovoContrato";
import VisualizarContrato from "./pages/VisualizarContrato";
// EditarContrato was merged into EditarContratoCompleto
import Servicos from "./pages/Servicos";
import ContasBancarias from "./pages/ContasBancarias";
import PlanoContas from "./pages/PlanoContas";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import Extrato from "./pages/Extrato";
import CentroCustos from "./pages/CentroCustos";
import EditarContratoCompleto from "./pages/EditarContratoCompleto";
import Usuarios from "./pages/Usuarios";
import Perfil from "./pages/Perfil";
import Configuracoes from "./pages/Configuracoes";
import Solicitacoes from "./pages/Solicitacoes";
import ControleFaturamento from "./pages/ControleFaturamento";
import Vendedores from "./pages/Vendedores";
import DashboardComercial from "./pages/DashboardComercial";
import Comissionamento from "./pages/Comissionamento";
import RHDashboardPage from "./pages/RHDashboardPage";
import RHFolhaPagamento from "./pages/RHFolhaPagamento";
import RHBeneficios from "./pages/RHBeneficios";
import RHAprovacoes from "./pages/RHAprovacoes";
import RHConfirmacaoFinanceiro from "./pages/RHConfirmacaoFinanceiro";
import FerramentasSoftware from "./pages/FerramentasSoftware";
import AreaContador from "./pages/AreaContador";
import Tutoriais from "./pages/Tutoriais";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalReembolsos from "./pages/portal/PortalReembolsos";
import PortalNotasFiscais from "./pages/portal/PortalNotasFiscais";
import AprovacaoPrestadores from "./pages/AprovacaoPrestadores";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <OnboardingProvider>
            <SessionTimeoutProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/install" element={<Install />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
                <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
                <Route path="/contratos/novo" element={<ProtectedRoute><NovoContrato /></ProtectedRoute>} />
                <Route path="/contratos/:id" element={<ProtectedRoute><VisualizarContrato /></ProtectedRoute>} />
                <Route path="/contratos/:id/edit" element={<ProtectedRoute><EditarContratoCompleto /></ProtectedRoute>} />
                <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
                <Route path="/contas-bancarias" element={<ProtectedRoute><ContasBancarias /></ProtectedRoute>} />
                <Route path="/plano-contas" element={<ProtectedRoute><PlanoContas /></ProtectedRoute>} />
                <Route path="/contas-receber" element={<ProtectedRoute><ContasReceber /></ProtectedRoute>} />
                <Route path="/contas-pagar" element={<ProtectedRoute><ContasPagar /></ProtectedRoute>} />
                <Route path="/extrato" element={<ProtectedRoute><Extrato /></ProtectedRoute>} />
                <Route path="/controle-faturamento" element={<ProtectedRoute><ControleFaturamento /></ProtectedRoute>} />
                <Route path="/centro-custos" element={<ProtectedRoute><CentroCustos /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
                <Route path="/solicitacoes" element={<ProtectedRoute><Solicitacoes /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/vendedores" element={<ProtectedRoute><Vendedores /></ProtectedRoute>} />
                <Route path="/dashboard-comercial" element={<ProtectedRoute><DashboardComercial /></ProtectedRoute>} />
                <Route path="/comissionamento" element={<ProtectedRoute><Comissionamento /></ProtectedRoute>} />
                <Route path="/rh" element={<ProtectedRoute><RHDashboardPage /></ProtectedRoute>} />
                <Route path="/rh/folha" element={<ProtectedRoute><RHFolhaPagamento /></ProtectedRoute>} />
                <Route path="/rh/beneficios" element={<ProtectedRoute><RHBeneficios /></ProtectedRoute>} />
                <Route path="/rh/aprovacoes" element={<ProtectedRoute><RHAprovacoes /></ProtectedRoute>} />
                <Route path="/rh/confirmacao" element={<ProtectedRoute><RHConfirmacaoFinanceiro /></ProtectedRoute>} />
                <Route path="/ferramentas-software" element={<ProtectedRoute><FerramentasSoftware /></ProtectedRoute>} />
                <Route path="/area-contador" element={<ProtectedRoute><AreaContador /></ProtectedRoute>} />
                <Route path="/tutoriais" element={<ProtectedRoute><Tutoriais /></ProtectedRoute>} />
                <Route path="/portal" element={<ProtectedRoute portal><PortalDashboard /></ProtectedRoute>} />
                <Route path="/portal/reembolsos" element={<ProtectedRoute portal><PortalReembolsos /></ProtectedRoute>} />
                <Route path="/portal/notas-fiscais" element={<ProtectedRoute portal><PortalNotasFiscais /></ProtectedRoute>} />
                <Route path="/aprovacao-prestadores" element={<ProtectedRoute><AprovacaoPrestadores /></ProtectedRoute>} />
                <Route path="/vinculos-prestadores" element={<ProtectedRoute><VinculosPrestadores /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SessionTimeoutProvider>
            </OnboardingProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
