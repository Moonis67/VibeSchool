import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearSensitiveClientState } from "@/lib/security";
import { createSession, listSessions, type VibeSession } from "@/lib/sessionsApi";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS } from "@/lib/navigation";
import { useProfileSummary } from "@/hooks/useProfileSummary";
import { useVibe } from "@/lib/vibeStore";
import { Settings, LogOut, Sparkles, Plus, Loader2, User, History, Layers } from "lucide-react";
import { toast } from "sonner";
import vibeschoolMark from "@/assets/vibeschool-mark.png";
import vibeschoolLogo from "@/assets/vibeschool-logo-full.png";

// Desktop-only rail. Collapse-on-hover, with tooltips so the collapsed icon
// rail is actually usable without first waiting for the hover-expand — you
// shouldn't have to guess what an icon means or expand the whole sidebar
// just to confirm it.
function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export const SidebarNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fullName, avatarUrl } = useProfileSummary();
  const { mood } = useVibe();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [recentSessions, setRecentSessions] = useState<VibeSession[]>([]);

  useEffect(() => {
    listSessions()
      .then((rows) => setRecentSessions(rows.slice(0, 6)))
      .catch(() => { /* silent — recents just won't show */ });
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSensitiveClientState();
    navigate("/auth");
  };

  const handleNewSession = async () => {
    if (isCreatingSession) return;
    setIsCreatingSession(true);
    try {
      const session = await createSession("New Session");
      navigate(`/transform?mode=learn&session=${session.id}`);
    } catch {
      toast.error("Could not start a new session.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-full w-20 hover:w-64 bg-card border-r border-border z-40 flex-col transition-all duration-300 group shadow-sm">
      <div className="h-16 flex items-center px-5 shrink-0 border-b border-border">
        <div
          className="relative h-8 w-8 shrink-0 overflow-visible cursor-pointer"
          onClick={() => navigate(location.pathname === "/dashboard" ? "/" : "/dashboard")}
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

      <div className="px-3 pt-3 shrink-0 space-y-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="justify-start gap-3 h-11 w-full rounded-xl border-border bg-transparent text-foreground hover:bg-secondary"
              onClick={handleNewSession}
              disabled={isCreatingSession}
            >
              {isCreatingSession ? (
                <Loader2 className="w-4.5 h-4.5 shrink-0 animate-spin" />
              ) : (
                <Plus className="w-4.5 h-4.5 shrink-0" />
              )}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold text-sm">
                New Session
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="lg:group-hover:hidden">New Session</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-10 w-full rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <History className="w-4.5 h-4.5 shrink-0" />
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-semibold">
                    Recents
                  </span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="lg:group-hover:hidden">Recents</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-64" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Recent sessions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentSessions.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">No sessions yet</div>
            ) : (
              recentSessions.map((session) => (
                <DropdownMenuItem
                  key={session.id}
                  onClick={() => navigate(`/transform?mode=learn&session=${session.id}`)}
                  className="gap-2"
                >
                  <Layers className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{session.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(session.last_opened_at)}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 overflow-x-hidden">
        <nav className="pt-4 pb-2 flex flex-col gap-1 px-3">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Workspace
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`justify-start gap-4 h-11 w-full rounded-xl transition-colors ${
                      isActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:group-hover:hidden">{item.label}</TooltipContent>
              </Tooltip>
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={location.pathname === "/profile" ? "secondary" : "ghost"}
              className="justify-start gap-4 h-10 w-full rounded-xl text-muted-foreground"
              onClick={() => navigate("/profile")}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm">Settings</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="lg:group-hover:hidden">Settings</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="justify-start gap-4 h-10 w-full rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm">Sign Out</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="lg:group-hover:hidden">Sign Out</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
};
