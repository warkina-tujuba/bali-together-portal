import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, MapPin, Plane, Sparkles, X } from "lucide-react";
import { useState } from "react";

type Prompt = {
  id: string;
  icon: typeof Home;
  title: string;
  desc: string;
  cta: string;
  onAction: () => void;
};

type Props = {
  staysCount: number;
  plannedPlacesCount: number;
  flightsCount: number;
  hasPreferences: boolean;
  onAddStay: () => void;
  onAddFlight: () => void;
  onAddPlaces?: () => void;
  onAddVibe?: () => void;
};

const DISMISS_KEY = "tl:setup-prompts:dismissed:v1";

function loadDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]"); } catch { return []; }
}

export function SetupPrompts({
  staysCount, plannedPlacesCount, flightsCount, hasPreferences,
  onAddStay, onAddFlight, onAddPlaces, onAddVibe,
}: Props) {
  const [dismissed, setDismissed] = useState<string[]>(() => loadDismissed());

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch {}
  };

  const prompts: Prompt[] = [];
  if (staysCount === 0) {
    prompts.push({
      id: "stay", icon: Home,
      title: "Add your stay",
      desc: "Unlock route planning and nearby recommendations.",
      cta: "Add stay", onAction: onAddStay,
    });
  }
  if (plannedPlacesCount === 0 && onAddPlaces) {
    prompts.push({
      id: "places", icon: MapPin,
      title: "Add places on your radar",
      desc: "Pin neighbourhoods or islands to improve recommendations.",
      cta: "Add places", onAction: onAddPlaces,
    });
  }
  if (flightsCount === 0) {
    prompts.push({
      id: "flight", icon: Plane,
      title: "Add arrival details",
      desc: "Help the crew know when you land.",
      cta: "Add flight", onAction: onAddFlight,
    });
  }
  if (!hasPreferences && onAddVibe) {
    prompts.push({
      id: "vibe", icon: Sparkles,
      title: "Set your trip vibe",
      desc: "Tune discovery to your travel style.",
      cta: "Set vibe", onAction: onAddVibe,
    });
  }

  const visible = prompts.filter((p) => !dismissed.includes(p.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground">Finish setting up</h3>
        <span className="text-xs text-muted-foreground">{visible.length} left</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {visible.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="relative min-w-[260px] snap-start p-4 border-dashed">
              <button
                aria-label="Dismiss"
                onClick={() => dismiss(p.id)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-sm">{p.title}</div>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                  <Button size="sm" variant="secondary" className="mt-2" onClick={p.onAction}>
                    {p.cta}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
