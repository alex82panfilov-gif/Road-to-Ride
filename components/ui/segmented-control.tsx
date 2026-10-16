import { cn } from "@/lib/cn";

type Option = { id: string; label: string };

export function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-canvas-secondary p-1">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-full px-3 py-2 text-sm transition-colors duration-150",
              active ? "bg-elevated text-ink shadow-[var(--shadow-card)]" : "text-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
