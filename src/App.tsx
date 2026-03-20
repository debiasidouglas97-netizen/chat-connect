import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Demandas from "./pages/Demandas";
import Liderancas from "./pages/Liderancas";
import Cidades from "./pages/Cidades";
import Emendas from "./pages/Emendas";
import Agenda from "./pages/Agenda";
import Documentos from "./pages/Documentos";
import Mensagens from "./pages/Mensagens";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/demandas" element={<Demandas />} />
            <Route path="/liderancas" element={<Liderancas />} />
            <Route path="/cidades" element={<Cidades />} />
            <Route path="/emendas" element={<Emendas />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/mensagens" element={<Mensagens />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
