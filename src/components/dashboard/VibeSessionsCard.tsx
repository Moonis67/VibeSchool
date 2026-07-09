import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { listSessions, createSession, type VibeSession } from "@/lib/sessionsApi";
import { Layers, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

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

export const VibeSessionsCard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<VibeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listSessions()
      .then((rows) => { if (!cancelled) setSessions(rows); })
      .catch(() => { /* silent — falls back to empty state */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openSession = (session: VibeSession) => {
    navigate(`/transform?mode=learn&session=${session.id}`);
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const session = await createSession("New Session");
      navigate(`/transform?mode=learn&session=${session.id}`);
    } catch {
      toast.error("Could not create a new session.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm">Vibe Sessions</h2>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl" onClick={handleCreate} disabled={creating}>
          <Plus className="w-3.5 h-3.5" /> New
        </Button>
      </div>

      {!loading && sessions.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No sessions yet"
          description="A session keeps a topic's files and chat together so you can pick up right where you left off."
          actionLabel="Create your first session"
          onAction={handleCreate}
        />
      )}

      {sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.slice(0, 5).map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => openSession(session)}
              className="w-full flex items-center justify-between gap-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors p-3.5 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{session.title}</p>
                <p className="text-xs text-muted-foreground">{session.subject || "General"} · {timeAgo(session.last_opened_at)}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
