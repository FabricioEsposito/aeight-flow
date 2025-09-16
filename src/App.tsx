import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import ContratosClientes from "./pages/ContratosClientes";
import ContratosFornecedores from "./pages/ContratosFornecedores";
import Servicos from "./pages/Servicos";
import ContasBancarias from "./pages/ContasBancarias";
import PlanoContas from "./pages/PlanoContas";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import Extrato from "./pages/Extrato";
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
            <Route path="/contratos-clientes" element={<ContratosClientes />} />
            <Route path="/contratos-fornecedores" element={<ContratosFornecedores />} />
            {/* Legacy redirect */}
            <Route path="/contratos" element={<ContratosClientes />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/contas-bancarias" element={<ContasBancarias />} />
            <Route path="/plano-contas" element={<PlanoContas />} />
            <Route path="/contas-receber" element={<ContasReceber />} />
            <Route path="/contas-pagar" element={<ContasPagar />} />
            <Route path="/extrato" element={<Extrato />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
