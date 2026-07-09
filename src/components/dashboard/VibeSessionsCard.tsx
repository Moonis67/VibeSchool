import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { listSessions, createSession, deleteSession, renameSession, type VibeSession } from "@/lib/sessionsApi";
import { Layers, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [pendingDelete, setPendingDelete] = useState<VibeSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [renaming, setRenaming] = useState(false);

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

  const startRename = (session: VibeSession) => {
    setEditingId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = async (session: VibeSession) => {
    const title = editingTitle.trim();
    if (!title || renaming) { setEditingId(null); return; }
    if (title === session.title) { setEditingId(null); return; }
    setRenaming(true);
    try {
      await renameSession(session.id, title);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, title } : s)));
      setEditingId(null);
    } catch {
      toast.error("Could not rename the session. Please try again.");
    } finally {
      setRenaming(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteSession(pendingDelete.id);
      setSessions((prev) => prev.filter((session) => session.id !== pendingDelete.id));
      toast.success(`"${pendingDelete.title}" was deleted.`);
      setPendingDelete(null);
    } catch {
      toast.error("Could not delete the session. Please try again.");
    } finally {
      setDeleting(false);
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
            <div
              key={session.id}
              className="w-full flex items-center justify-between gap-2 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors p-3.5"
            >
              {editingId === session.id ? (
                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                  <Input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); void handleSaveRename(session); }
                      else if (e.key === "Escape") setEditingId(null);
                    }}
                    maxLength={120}
                    className="h-8 rounded-lg text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => void handleSaveRename(session)}
                    aria-label="Save session name"
                  >
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel rename"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openSession(session)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSession(session); }
                    }}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold truncate">{session.title}</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(session);
                        }}
                        aria-label={`Rename ${session.title}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{session.subject || "General"} · {timeAgo(session.last_opened_at)}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(session);
                    }}
                    aria-label={`Delete ${session.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>This will permanently delete "{pendingDelete.title}". Your uploaded files stay in your library — only the session workspace is removed. This can't be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
