import { MapPin, Sun, Sparkles } from "lucide-react";

export function DiscoverHero({
  destination,
  coverUrl,
  onNearMe,
  onToday,
  onMustDo,
  activeChip,
}: {
  destination: string;
  coverUrl?: string | null;
  onNearMe: () => void;
  onToday: () => void;
  onMustDo: () => void;
  activeChip?: "near" | "today" | "must" | null;
}) {
  const fallback =
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80";
  const img = coverUrl || fallback;
  return (
    <section className="relative overflow-hidden rounded-[28px] shadow-soft">
      <div className="relative aspect-[5/6] w-full sm:aspect-[16/9]">
        <img src={img} alt={`Discover ${destination}`} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 text-white">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Discover</p>
          <h1 className="font-display text-3xl leading-[1.05] sm:text-4xl">Discover {destination}</h1>
          <p className="max-w-md text-sm text-white/85">Find experiences that fit your itinerary.</p>
          <div className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <HeroChip active={activeChip === "near"} onClick={onNearMe} icon={<MapPin className="h-3.5 w-3.5" />} label="Near me" />
            <HeroChip active={activeChip === "today"} onClick={onToday} icon={<Sun className="h-3.5 w-3.5" />} label="Today" />
            <HeroChip active={activeChip === "must"} onClick={onMustDo} icon={<Sparkles className="h-3.5 w-3.5" />} label="Must do" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroChip({ active, onClick, icon, label }: { active?: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium backdrop-blur transition ${
        active ? "bg-white text-foreground" : "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
      }`}
    >
      {icon} {label}
    </button>
  );
}
