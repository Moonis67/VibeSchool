import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 py-10 px-6 ${className || ""}`}>
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-base text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" className="mt-2 rounded-xl" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
