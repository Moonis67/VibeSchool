import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard"; 
import Transform from "./pages/Transform";
import Classroom from "./pages/Classroom";
import NotFound from "./pages/NotFound";
import Subject from "./pages/Subject"; 
import Profile from "./pages/Profile"; // Added Profile Page Import
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background font-sans w-full overflow-x-hidden">
      {/* The Sidebar is called ONCE here globally */}
      <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      {/* Mobile Toggle Button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
          <Button size="icon" variant="outline" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="w-5 h-5" />
          </Button>
      </div>

      {/* Main Content Area: flex-1 allows it to take up remaining width */}
      <main className="flex-1 w-full transition-all duration-300 lg:pl-20">
        <div className="w-full h-full min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          
          <Route element={<AppLayout />}>
             <Route path="/dashboard" element={<Dashboard />} />
             <Route path="/transform" element={<Transform />} />
             <Route path="/classroom" element={<Classroom />} />
             <Route path="/subjects" element={<Subject />} />
             <Route path="/subject/:id" element={<Subject />} />
             <Route path="/profile" element={<Profile />} /> {/* Added Profile Path Hook */}
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
