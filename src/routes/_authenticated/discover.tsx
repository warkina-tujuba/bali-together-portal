import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Star, MapPin, Clock, DollarSign, Sparkles, ExternalLink } from "lucide-react";
import { recommendActivities, recordSwipe, type Suggestion } from "@/lib/recommend.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  component: DiscoverPage,
});

function DiscoverPage() {
  const navigate = useNavigate();
  const recFn = useServerFn(recommendActivities);
  const swipeFn = useServerFn(recordSwipe);

  const { data, isLoading, error } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => recFn({ data: { limit: 15 } }),
    staleTime: 1000 * 60 * 30,
  });

  const [index, setIndex] = useState(0);
  const items = data?.items ?? [];
  const current = items[index];

  async function swipe(verdict: "save" | "skip" | "must") {
    if (!current) return;
    try {
      await swipeFn({ data: { suggestion: current, verdict } });
    } catch (e) {
      console.error(e);
    }
    setIndex((i) => i + 1);
  }

  if (isLoading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load recommendations.</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>Go to dashboard</Button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
        <Sparkles className="h-10 w-10 text-accent" />
        <h2 className="font-display text-2xl">You're all set</h2>
        <p className="text-sm text-muted-foreground">We've saved your picks. Build your itinerary in the portal.</p>
        <Button onClick={() => navigate({ to: "/dashboard" })} className="rounded-xl">Open portal</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{index + 1} / {items.length}</p>
        <button onClick={() => navigate({ to: "/dashboard" })} className="text-xs text-muted-foreground hover:underline">
          Skip to portal
        </button>
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key + index}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, rotate: -5 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <SuggestionCard s={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <ActionBtn onClick={() => swipe("skip")} aria-label="Skip" className="bg-muted text-muted-foreground hover:bg-muted/80">
          <X className="h-6 w-6" />
        </ActionBtn>
        <ActionBtn onClick={() => swipe("save")} aria-label="Save" className="bg-accent text-accent-foreground hover:bg-accent/90 h-16 w-16">
          <Heart className="h-7 w-7" />
        </ActionBtn>
        <ActionBtn onClick={() => swipe("must")} aria-label="Must-do" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Star className="h-6 w-6" />
        </ActionBtn>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Skip · Save · Must-do</p>
    </div>
  );
}

function ActionBtn({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`flex h-14 w-14 items-center justify-center rounded-full shadow-md transition active:scale-95 ${className}`}>
      {children}
    </button>
  );
}

function SuggestionCard({ s }: { s: Suggestion }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-3xl border-0 shadow-card">
      {s.image_url && (
        <div className="relative h-64 w-full overflow-hidden bg-muted">
          <img src={s.image_url} alt={s.title} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium">
            {s.category}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-2xl leading-tight">{s.title}</h3>
        <p className="text-sm text-muted-foreground">{s.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {s.est_duration_min != null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(s.est_duration_min)}</span>}
          {s.est_cost_usd != null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ~${s.est_cost_usd}</span>}
          {s.lat != null && s.lng != null && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> on map</span>}
          {s.url && (
            <a href={s.url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-primary hover:underline">
              Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60); const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const FACTS = [
  "Bali has over 20,000 temples.",
  "Tokyo has 14 Michelin three-star restaurants.",
  "Lisbon is built on seven hills, like Rome.",
  "The best photo light is 30 min before sunset.",
  "Locals always know the better warung.",
];

function LoadingScreen() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % FACTS.length), 2500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent"
      />
      <h2 className="font-display text-2xl">Preparing your trip…</h2>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="max-w-xs text-sm text-muted-foreground"
        >
          {FACTS[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
