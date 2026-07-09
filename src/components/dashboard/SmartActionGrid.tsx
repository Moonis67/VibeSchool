import { MessageSquare, BrainCircuit, FileText, Share2, Map, Headphones } from "lucide-react";
import { SmartActionCard, type SmartAction } from "@/components/dashboard/SmartActionCard";

export const SMART_ACTIONS: SmartAction[] = [
  {
    title: "Ask Tutor",
    description: "Stuck on a concept? Get a simple explanation with examples.",
    actionLabel: "Ask now",
    path: "/transform?mode=learn&style=socratic",
    icon: MessageSquare,
  },
  {
    title: "Practice Weak Spots",
    description: "Generate questions from your uploaded lectures.",
    actionLabel: "Start quiz",
    path: "/transform?mode=quiz&quiz=rapid",
    icon: BrainCircuit,
  },
  {
    title: "Turn Lecture into Notes",
    description: "Upload slides and get clean revision notes.",
    actionLabel: "Upload & summarize",
    path: "/transform?mode=learn&format=notes",
    icon: FileText,
  },
  {
    title: "Visualize Concept",
    description: "Create flowcharts, diagrams, and memory maps.",
    actionLabel: "Create visual",
    path: "/transform?mode=visualize&viz=flowchart",
    icon: Share2,
  },
  {
    title: "Build Roadmap",
    description: "Turn any topic into a step-by-step learning path.",
    actionLabel: "Build plan",
    path: "/transform?mode=plan",
    icon: Map,
  },
  {
    title: "AI Podcast",
    description: "Convert your notes into a spoken revision lesson.",
    actionLabel: "Generate podcast",
    path: "/transform?mode=learn&format=podcast",
    icon: Headphones,
  },
];

interface SmartActionGridProps {
  onOpen: (path: string, label: string) => void;
}

export const SmartActionGrid = ({ onOpen }: SmartActionGridProps) => {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {SMART_ACTIONS.map((action) => (
        <SmartActionCard key={action.title} action={action} onOpen={onOpen} />
      ))}
    </div>
  );
};
