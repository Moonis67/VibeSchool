import { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { TopCommandBar } from "@/components/layout/TopCommandBar";

// Same auth gate/loading behavior that previously lived inline in App.tsx's
// AppLayout — moved, not rewritten.
export const AppShell = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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
    <div className="flex h-dvh bg-background font-sans w-full overflow-hidden">
      <SidebarNav />
      <MobileNavigation isOpen={isMobileNavOpen} toggle={() => setIsMobileNavOpen((prev) => !prev)} />

      <div className="flex-1 w-full min-w-0 flex flex-col lg:pl-20 overflow-hidden">
        <TopCommandBar onOpenMobileNav={() => setIsMobileNavOpen(true)} />
        <main className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
