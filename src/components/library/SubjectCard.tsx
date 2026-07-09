import { useNavigate } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubjectCardProps {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  docsCount?: number;
  nextTopic?: string;
}

export const SubjectCard = ({ id, name, icon: Icon, description, docsCount, nextTopic }: SubjectCardProps) => {
  const navigate = useNavigate();

  const goMode = (mode: "learn" | "quiz" | "visualize", e: React.MouseEvent) => {
    e.stopPropagation();
    const topic = nextTopic || name;
    navigate(`/transform?mode=${mode}&topic=${encodeURIComponent(topic)}`);
  };

  return (
    <button
      type="button"
      onClick={() => navigate(`/subject/${id}`)}
      className="text-left rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        {typeof docsCount === "number" && (
          <span className="text-[11px] font-bold text-muted-foreground bg-secondary rounded-full px-2.5 py-1 shrink-0">
            {docsCount} lecture{docsCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <h3 className="font-bold text-base">{name}</h3>
      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{description}</p>
      {nextTopic && (
        <p className="text-xs font-semibold text-primary mt-2">Next: {nextTopic}</p>
      )}

      <div className="flex gap-1.5 mt-4">
        <Button size="sm" variant="secondary" className="rounded-lg h-7 text-xs px-2.5 flex-1" onClick={(e) => goMode("learn", e)}>
          Learn
        </Button>
        <Button size="sm" variant="secondary" className="rounded-lg h-7 text-xs px-2.5 flex-1" onClick={(e) => goMode("quiz", e)}>
          Quiz
        </Button>
        <Button size="sm" variant="secondary" className="rounded-lg h-7 text-xs px-2.5 flex-1" onClick={(e) => goMode("visualize", e)}>
          Visual
        </Button>
      </div>
    </button>
  );
};
