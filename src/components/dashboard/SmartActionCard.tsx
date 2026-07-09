import { type LucideIcon, ArrowRight } from "lucide-react";
import { StatusChip } from "@/components/shared/StatusChip";

export interface SmartAction {
  title: string;
  description: string;
  actionLabel: string;
  path: string;
  icon: LucideIcon;
  statusLabel?: string;
}

interface SmartActionCardProps {
  action: SmartAction;
  onOpen: (path: string, label: string) => void;
}

export const SmartActionCard = ({ action, onOpen }: SmartActionCardProps) => {
  const { title, description, actionLabel, path, icon: Icon, statusLabel } = action;

  return (
    <button
      type="button"
      onClick={() => onOpen(path, title)}
      className="group flex flex-col text-left h-full rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5" />
        </div>
        {statusLabel && <StatusChip label={statusLabel} variant="info" />}
      </div>
      <h3 className="font-bold text-sm text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed flex-1">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
        {actionLabel} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </button>
  );
};
