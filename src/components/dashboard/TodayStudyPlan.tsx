import { Button } from "@/components/ui/button";
import { useVibe } from "@/lib/vibeStore";
import { MOCK_STREAK } from "@/lib/mockData";
import { Flame, MessageSquare, BrainCircuit, Sparkles } from "lucide-react";

interface TodayStudyPlanProps {
  firstName: string;
  nextMoveTopic: string | null;
  onOpen: (path: string, label: string) => void;
}

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

export const TodayStudyPlan = ({ firstName, nextMoveTopic, onOpen }: TodayStudyPlanProps) => {
  const { subject, level, mood, timeAvailable, mode } = useVibe();

  const bestMove = nextMoveTopic
    ? `Revise ${nextMoveTopic} for ${timeAvailable} minutes in Quiz Mode.`
    : `Start with ${subject} in ${mode === "quiz" ? "Quiz" : "Learn"} Mode — pick any topic to begin.`;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Good {getTimeOfDay()}, {firstName || "Scholar"}.
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-snug">
            Your best next move: <span className="text-primary">{bestMove}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {[subject, level, mood, `${timeAvailable} min`, mode].map((pill) => (
              <span
                key={pill}
                className="rounded-full bg-secondary text-secondary-foreground px-2.5 py-1 text-[11px] font-semibold capitalize"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 shrink-0 self-start">
          <Flame className="w-4 h-4 text-accent" />
          <div className="text-xs">
            <p className="font-bold leading-none">{MOCK_STREAK.days} day streak</p>
            <p className="text-muted-foreground leading-none mt-0.5">{MOCK_STREAK.label}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <Button className="rounded-xl gap-2" onClick={() => onOpen("/transform?mode=learn", "Focus Session")}>
          <Sparkles className="w-4 h-4" /> Start Focus Session
        </Button>
        <Button variant="outline" className="rounded-xl gap-2" onClick={() => onOpen("/transform?mode=quiz", "Quiz")}>
          <BrainCircuit className="w-4 h-4" /> Generate Quiz
        </Button>
        <Button
          variant="outline"
          className="rounded-xl gap-2"
          onClick={() => onOpen("/transform?mode=learn&style=socratic", "AI Tutor")}
        >
          <MessageSquare className="w-4 h-4" /> Ask AI Tutor
        </Button>
      </div>
    </div>
  );
};
