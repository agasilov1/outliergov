import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import SetPassword from "./pages/SetPassword";
import Expired from "./pages/Expired";
import Dashboard from "./pages/Dashboard";
import ProviderDetail from "./pages/ProviderDetail";
import Methodology from "./pages/Methodology";
import DataSources from "./pages/DataSources";
import Admin from "./pages/Admin";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import ProviderCompare from "./pages/ProviderCompare";
import MedicareBillingOutlierAnalysis from "./pages/MedicareBillingOutlierAnalysis";
import QuiTamResearchTools from "./pages/QuiTamResearchTools";
import HealthcareFraudDataAttorneys from "./pages/HealthcareFraudDataAttorneys";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/invite" element={<AcceptInvite />} />
            <Route path="/auth/callback" element={<SetPassword />} />
            <Route path="/expired" element={<Expired />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProviderDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/methodology"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Methodology />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-sources"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DataSources />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <Admin />
                  </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/compare"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ProviderCompare />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/medicare-billing-outlier-analysis" element={<MedicareBillingOutlierAnalysis />} />
          <Route path="/accountability-research-tools" element={<QuiTamResearchTools />} />
          <Route path="/provider-registry" element={<HealthcareFraudDataAttorneys />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
