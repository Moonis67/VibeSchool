import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusChip } from "@/components/shared/StatusChip";
import { UploadCloud, FileText, MessageSquare, BrainCircuit, Sparkles, Headphones } from "lucide-react";

interface KnowledgeDocRow {
  document_id: string;
  file_name: string;
  processing_status: string;
  processed_at: string | null;
  created_at: string;
}

interface KnowledgeBasePanelProps {
  onOpen: (path: string, label: string) => void;
}

const statusVariant = (status: string) => {
  if (status === "processed") return "success" as const;
  if (status === "failed") return "warning" as const;
  return "info" as const;
};

export const KnowledgeBasePanel = ({ onOpen }: KnowledgeBasePanelProps) => {
  const [docs, setDocs] = useState<KnowledgeDocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchDocs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data, error } = await supabase
          .from("documents")
          .select("document_id, file_name, processing_status, processed_at, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        if (!cancelled) setDocs(data || []);
      } catch {
        // Silent — panel falls back to the empty state below.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDocs();
    return () => { cancelled = true; };
  }, []);

  const quickActions = (fileName: string) => [
    { label: "Ask", icon: MessageSquare, path: `/transform?mode=learn&topic=${encodeURIComponent(fileName)}` },
    { label: "Quiz", icon: BrainCircuit, path: `/transform?mode=quiz&topic=${encodeURIComponent(fileName)}` },
    { label: "Cheat Sheet", icon: Sparkles, path: `/transform?mode=visualize&viz=cheatsheet&topic=${encodeURIComponent(fileName)}` },
    { label: "Podcast", icon: Headphones, path: `/transform?mode=learn&format=podcast&topic=${encodeURIComponent(fileName)}` },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <FileText className="w-4 h-4" />
        </div>
        <h2 className="font-bold text-sm">Knowledge Base</h2>
      </div>

      {!loading && docs.length === 0 && (
        <EmptyState
          icon={UploadCloud}
          title="No lectures uploaded yet"
          description="Upload lecture slides and VibeSchool will turn them into notes, quizzes, visuals, and revision plans."
          actionLabel="Upload a lecture"
          onAction={() => onOpen("/transform?mode=learn", "AI Tutor")}
        />
      )}

      {docs.length > 0 && (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.document_id} className="rounded-xl bg-secondary/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold truncate">{doc.file_name}</p>
                <StatusChip label={doc.processing_status} variant={statusVariant(doc.processing_status)} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickActions(doc.file_name).map((action) => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-xs gap-1 rounded-lg bg-background"
                    onClick={() => onOpen(action.path, action.label)}
                  >
                    <action.icon className="w-3 h-3" /> {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
