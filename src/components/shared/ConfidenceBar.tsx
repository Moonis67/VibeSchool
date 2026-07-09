import { Progress } from "@/components/ui/progress";

interface ConfidenceBarProps {
  label: string;
  value: number; // 0-100
  className?: string;
}

const toneClass = (value: number) => {
  if (value >= 70) return "text-success";
  if (value >= 50) return "text-primary";
  return "text-amber-600";
};

export const ConfidenceBar = ({ label, value, className }: ConfidenceBarProps) => {
  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-foreground">{label}</span>
        <span className={toneClass(value)}>{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
};
