import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/hooks/use-tenant";
import { ThemeProvider } from "@/hooks/use-theme";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Demandas from "./pages/Demandas";
import Liderancas from "./pages/Liderancas";
import Cidades from "./pages/Cidades";
import Emendas from "./pages/Emendas";
import Agenda from "./pages/Agenda";
import Documentos from "./pages/Documentos";
import Mensagens from "./pages/Mensagens";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDeputados from "./pages/admin/AdminDeputados";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TenantProvider>
          <ThemeProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            
            {/* Super Admin routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="deputados" element={<AdminDeputados />} />
            </Route>

            {/* Protected tenant routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/demandas" element={<Demandas />} />
              <Route path="/liderancas" element={<Liderancas />} />
              <Route path="/cidades" element={<Cidades />} />
              <Route path="/emendas" element={<Emendas />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/mensagens" element={<Mensagens />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TenantProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
