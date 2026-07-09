import { type LucideIcon } from "lucide-react";

type ChipVariant = "success" | "info" | "warning" | "neutral";

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  success: "bg-success/10 text-success border-success/20",
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  neutral: "bg-muted text-muted-foreground border-border",
};

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  icon?: LucideIcon;
  className?: string;
}

export const StatusChip = ({ label, variant = "neutral", icon: Icon, className }: StatusChipProps) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${VARIANT_CLASSES[variant]} ${className || ""}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
};
