import { useVibe } from "@/lib/vibeStore";
import { Sparkles } from "lucide-react";

const SUBJECTS = ["Computer Science", "Mathematics", "Physics", "Biology", "History", "Business"];
const LEVELS = ["school", "college", "university"];
const MOODS = ["enthusiastic", "focused", "tired", "curious"];
const TIMES = ["10", "15", "30", "60"];
const MODES: Array<{ id: "learn" | "quiz" | "visualize" | "plan"; label: string }> = [
  { id: "learn", label: "Learn" },
  { id: "quiz", label: "Quiz" },
  { id: "visualize", label: "Visual" },
  { id: "plan", label: "Plan" },
];

const PillGroup = ({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: string[];
  active: string;
  onSelect: (value: string) => void;
}) => (
  <div className="space-y-1.5">
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
            active === option ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

export const VibeEnginePanel = () => {
  const { subject, level, mood, timeAvailable, mode, setVibe } = useVibe();

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-bold text-sm">Vibe Engine</h2>
          <p className="text-xs text-muted-foreground">
            VibeSchool adapts your lesson style based on your energy, time, and confidence.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <PillGroup label="Subject" options={SUBJECTS} active={subject} onSelect={(subject) => setVibe({ subject })} />
        <PillGroup label="Level" options={LEVELS} active={level} onSelect={(level) => setVibe({ level })} />
        <PillGroup label="Mood" options={MOODS} active={mood} onSelect={(mood) => setVibe({ mood })} />
        <PillGroup label="Time" options={TIMES} active={timeAvailable} onSelect={(timeAvailable) => setVibe({ timeAvailable })} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mode</p>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setVibe({ mode: m.id })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
