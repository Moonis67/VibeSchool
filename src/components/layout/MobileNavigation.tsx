import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearSensitiveClientState } from "@/lib/security";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/navigation";
import { useProfileSummary } from "@/hooks/useProfileSummary";
import { useVibe } from "@/lib/vibeStore";
import { Settings, LogOut, User, Sparkles } from "lucide-react";

interface MobileNavigationProps {
  isOpen: boolean;
  toggle: () => void;
}

export const MobileNavigation = ({ isOpen, toggle }: MobileNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fullName, avatarUrl } = useProfileSummary();
  const { mood, subject } = useVibe();

  const handleNavigate = (path: string) => {
    navigate(path);
    toggle();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSensitiveClientState();
    navigate("/auth");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) toggle(); }}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col lg:hidden">
        <div className="p-4 border-b border-border">
          <button
            type="button"
            onClick={() => handleNavigate("/profile")}
            className="w-full flex items-center gap-3 rounded-2xl bg-secondary/60 p-3 text-left"
          >
            <div className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{fullName || "Scholar"}</p>
              <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {subject} · {mood}
              </p>
            </div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={`justify-start gap-4 h-12 w-full rounded-xl ${
                  isActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"
                }`}
                onClick={() => handleNavigate(item.path)}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Button
            variant="ghost"
            className="justify-start gap-4 h-11 w-full rounded-xl text-muted-foreground"
            onClick={() => handleNavigate("/profile")}
          >
            <Settings className="w-4 h-4" /> Settings
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-4 h-11 w-full rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
