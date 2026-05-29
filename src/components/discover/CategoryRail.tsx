import { cn } from "@/lib/utils";
import { Utensils, Mountain, Landmark, Music, Sun, Waves, Plus } from "lucide-react";

export const RAIL_ITEMS = [
  { id: "food", label: "Foodie", icon: Utensils, kind: "category" as const },
  { id: "activity", label: "Adventure", icon: Mountain, kind: "category" as const },
  { id: "culture", label: "Culture", icon: Landmark, kind: "category" as const },
  { id: "nightlife", label: "Nightlife", icon: Music, kind: "category" as const },
  { id: "chill", label: "Chill", icon: Sun, kind: "category" as const },
  { id: "beach", label: "Beach", icon: Waves, kind: "tag" as const },
  { id: "surf", label: "Surf", kind: "tag" as const },
  { id: "yoga", label: "Yoga", kind: "tag" as const },
  { id: "waterfall", label: "Waterfall", kind: "tag" as const },
  { id: "temple", label: "Temple", kind: "tag" as const },
  { id: "sunset", label: "Sunset", kind: "tag" as const },
  { id: "hike", label: "Hike", kind: "tag" as const },
  { id: "diving", label: "Diving", kind: "tag" as const },
  { id: "spa", label: "Spa", kind: "tag" as const },
];

export function CategoryRail({
  categories, tags, onToggle, onMore,
}: {
  categories: string[];
  tags: string[];
  onToggle: (kind: "category" | "tag", id: string) => void;
  onMore: () => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
      {RAIL_ITEMS.map((it) => {
        const active = it.kind === "category" ? categories.includes(it.id) : tags.includes(it.id);
        const Icon = "icon" in it && it.icon;
        return (
          <button
            key={it.id}
            onClick={() => onToggle(it.kind, it.id)}
            className={cn(
              "flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition",
              active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null} {it.label}
          </button>
        );
      })}
      <button
        onClick={onMore}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
      >
        <Plus className="h-3.5 w-3.5" /> More
      </button>
    </div>
  );
}
