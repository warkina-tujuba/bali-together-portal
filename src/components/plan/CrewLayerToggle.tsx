import { cn } from "@/lib/utils";
import { Users, User } from "lucide-react";

export type CrewLayer = "mine" | "crew" | "both";

export function CrewLayerToggle({ value, onChange, crewCount }: { value: CrewLayer; onChange: (v: CrewLayer) => void; crewCount: number }) {
  const opts: Array<{ id: CrewLayer; label: string; icon: React.ReactNode }> = [
    { id: "mine", label: "Me", icon: <User className="h-3 w-3" /> },
    { id: "both", label: "Both", icon: <Users className="h-3 w-3" /> },
    { id: "crew", label: `Crew (${crewCount})`, icon: <Users className="h-3 w-3" /> },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border bg-card p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1 transition",
            value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}
