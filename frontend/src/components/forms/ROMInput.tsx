import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  error?: string;
}

export const ROMInput = ({ label, value, onChange, min, max, error }: Props) => {
  const invalid = !!error || value < min || value > max;
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`h-9 pr-8 text-sm ${invalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°</span>
      </div>
      <div className="text-[10px] text-muted-foreground">
        {error || `Range ${min}–${max}°`}
      </div>
    </div>
  );
};
