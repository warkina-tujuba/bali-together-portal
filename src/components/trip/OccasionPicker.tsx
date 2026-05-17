const OCCASIONS = [
  { value: "birthday", label: "🎂 Birthday" },
  { value: "bachelorette", label: "👯 Bachelor/ette" },
  { value: "honeymoon", label: "💍 Honeymoon" },
  { value: "reunion", label: "🤝 Reunion" },
  { value: "anniversary", label: "❤️ Anniversary" },
  { value: "just-because", label: "✨ Just because" },
];

export function OccasionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {OCCASIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
            value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function occasionLabel(v: string): string {
  return OCCASIONS.find((o) => o.value === v)?.label ?? v;
}
