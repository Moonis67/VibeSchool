import { Button } from "@/components/ui/button";
import { ConfidenceBar } from "@/components/shared/ConfidenceBar";
import { MOCK_WEAK_TOPICS, type WeakTopic } from "@/lib/mockData";
import { TrendingUp } from "lucide-react";

interface ContinueLearningProps {
  topics?: WeakTopic[];
  onOpen: (path: string, label: string) => void;
}

export const ContinueLearning = ({ topics = MOCK_WEAK_TOPICS, onOpen }: ContinueLearningProps) => {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <TrendingUp className="w-4 h-4" />
        </div>
        <h2 className="font-bold text-sm">Continue Learning</h2>
      </div>

      <div className="space-y-4">
        {topics.map((item) => (
          <div key={item.topic} className="rounded-xl bg-secondary/40 p-3.5 space-y-2.5">
            <ConfidenceBar label={item.topic} value={item.confidence} />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{item.recommendedAction}</p>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-lg text-xs h-7 px-3 shrink-0"
                onClick={() => onOpen(`/transform?mode=${item.mode}&topic=${encodeURIComponent(item.topic)}`, item.topic)}
              >
                Practice Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
