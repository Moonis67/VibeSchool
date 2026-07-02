import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard"; 
import Transform from "./pages/Transform";
import Classroom from "./pages/Classroom";
import NotFound from "./pages/NotFound";
import Subject from "./pages/Subject"; 
import Profile from "./pages/Profile"; // Added Profile Page Import

const queryClient = new QueryClient();

const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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