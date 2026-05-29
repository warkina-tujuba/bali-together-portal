import { cn } from "@/lib/utils";
import { LayoutGrid, Map as MapIcon, Columns2 } from "lucide-react";

export type DiscoverView = "grid" | "map" | "split";

export function ViewToggle({ value, onChange, showSplit }: { value: DiscoverView; onChange: (v: DiscoverView) => void; showSplit?: boolean }) {
  const opts: Array<{ id: DiscoverView; label: string; icon: React.ReactNode }> = [
    { id: "grid", label: "Grid", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "map", label: "Map", icon: <MapIcon className="h-3.5 w-3.5" /> },
  ];
  if (showSplit) opts.push({ id: "split", label: "Split", icon: <Columns2 className="h-3.5 w-3.5" /> });
  return (
    <div className="inline-flex items-center rounded-full border bg-card p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1.5 font-medium transition",
            value === o.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}
