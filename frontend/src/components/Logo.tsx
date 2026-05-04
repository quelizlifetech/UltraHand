import { Activity } from "lucide-react";

export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center shadow-[var(--shadow-soft)]">
      <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
    </div>
    <div className="leading-tight">
      <div className="font-semibold text-sm tracking-tight">UltraHand</div>
      <div className="text-[10px] text-muted-foreground -mt-0.5">AI Hand Therapy</div>
    </div>
  </div>
);
