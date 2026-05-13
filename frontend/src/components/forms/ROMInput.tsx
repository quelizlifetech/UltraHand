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

export const ROMInput = ({
  label,
  value,
  onChange,
  min,
  max,
  error,
}: Props) => {
  const invalid = !!error || value < min || value > max;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // allow empty
    if (raw === "") {
      onChange(min);
      return;
    }

    // 🔥 REMOVE NON-DIGITS
    raw = raw.replace(/[^0-9]/g, "");

    // 🔥 REMOVE LEADING ZEROS
    raw = raw.replace(/^0+(?=\d)/, "");

    let val = parseInt(raw, 10);

    if (isNaN(val)) val = min;

    // clamp
    if (val < min) val = min;
    if (val > max) val = max;

    onChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];

    if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>

      <div className="relative">
        <Input
          type="text" // ✅ FIXED (IMPORTANT)
          inputMode="numeric"
          value={value === 0 ? "" : String(value)} // ✅ prevents showing 0/040
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`h-9 pr-8 text-sm ${
            invalid
              ? "border-destructive focus-visible:ring-destructive"
              : ""
          }`}
        />

        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          °
        </span>
      </div>

      <div className="text-[10px] text-muted-foreground">
        {error || `Range ${min}–${max}°`}
      </div>
    </div>
  );
};