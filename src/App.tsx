import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import Contratos from "./pages/Contratos";
import NovoContrato from "./pages/NovoContrato";
import VisualizarContrato from "./pages/VisualizarContrato";
import EditarContrato from "./pages/EditarContrato";
import Servicos from "./pages/Servicos";
import ContasBancarias from "./pages/ContasBancarias";
import PlanoContas from "./pages/PlanoContas";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import Extrato from "./pages/Extrato";
import CentroCustos from "./pages/CentroCustos";
import EditarContratoCompleto from "./pages/EditarContratoCompleto";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/contratos/novo" element={<NovoContrato />} />
            <Route path="/contratos/:id" element={<VisualizarContrato />} />
            <Route path="/contratos/:id/edit" element={<EditarContrato />} />
            <Route path="/contratos/:id/edit-completo" element={<EditarContratoCompleto />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/contas-bancarias" element={<ContasBancarias />} />
            <Route path="/plano-contas" element={<PlanoContas />} />
            <Route path="/contas-receber" element={<ContasReceber />} />
            <Route path="/contas-pagar" element={<ContasPagar />} />
            <Route path="/extrato" element={<Extrato />} />
            <Route path="/centro-custos" element={<CentroCustos />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
