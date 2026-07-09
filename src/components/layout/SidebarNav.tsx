import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearSensitiveClientState } from "@/lib/security";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NAV_ITEMS } from "@/lib/navigation";
import { useProfileSummary } from "@/hooks/useProfileSummary";
import { useVibe } from "@/lib/vibeStore";
import { Settings, LogOut, User, Sparkles } from "lucide-react";
import vibeschoolMark from "@/assets/vibeschool-mark.png";
import vibeschoolLogo from "@/assets/vibeschool-logo-full.png";

// Desktop-only rail. Same collapse-on-hover behavior as the previous Sidebar,
// restyled slimmer with a polished active state and a profile/vibe chip.
export const SidebarNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fullName, avatarUrl } = useProfileSummary();
  const { mood } = useVibe();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSensitiveClientState();
    navigate("/auth");
  };

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-full w-20 hover:w-64 bg-card border-r border-border z-40 flex-col transition-all duration-300 group shadow-sm">
      <div className="h-16 flex items-center px-5 shrink-0 border-b border-border">
        <div
          className="relative h-8 w-8 shrink-0 overflow-visible cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img
            src={vibeschoolMark}
            alt="VibeSchool"
            className="absolute left-0 top-0 h-8 w-8 object-contain opacity-100 group-hover:opacity-0 transition-opacity duration-200"
          />
          <img
            src={vibeschoolLogo}
            alt="VibeSchool"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-auto max-w-none object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-x-hidden">
        <nav className="py-4 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={`justify-start gap-4 h-11 w-full rounded-xl transition-colors ${
                  isActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-border space-y-2 shrink-0">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-secondary transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-sm font-bold truncate">{fullName || "Scholar"}</p>
            <p className="text-[10px] text-primary font-semibold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> {mood}
            </p>
          </div>
        </button>

        <Button
          variant={location.pathname === "/profile" ? "secondary" : "ghost"}
          className="justify-start gap-4 h-10 w-full rounded-xl text-muted-foreground"
          onClick={() => navigate("/profile")}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm">Settings</span>
        </Button>
        <Button
          variant="ghost"
          className="justify-start gap-4 h-10 w-full rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};
