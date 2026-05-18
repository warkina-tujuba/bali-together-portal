import { useState } from "react";
import { CHARACTER_AVATARS, type AvatarUniverse, type CharacterAvatar, characterAvatarToDataUrl } from "@/lib/avatars";
import { cn } from "@/lib/utils";

const TABS: { id: AvatarUniverse; label: string }[] = [
  { id: "marvel", label: "Marvel" },
  { id: "dc", label: "DC" },
  { id: "pokemon", label: "Pokémon" },
  // Added support for anime avatars. This tab will appear in the picker
  // allowing users to browse our curated anime avatars defined in
  // src/lib/avatars.ts. See CHARACTER_AVATARS for the full list.
  { id: "anime", label: "Anime" },
];

export function AvatarPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string, character: CharacterAvatar) => void;
}) {
  const [tab, setTab] = useState<AvatarUniverse>("marvel");
  const list = CHARACTER_AVATARS.filter((c) => c.universe === tab);

  return (
    <div>
      <div className="flex gap-1.5 rounded-full bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-xs font-medium transition",
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-4">
        {list.map((c) => {
          const url = characterAvatarToDataUrl(c);
          const selected = value === url;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(url, c)}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-2xl p-1.5 transition",
                selected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-secondary"
              )}
              aria-label={c.name}
              aria-pressed={selected}
            >
              <div
                className="flex aspect-square w-full items-center justify-center rounded-xl text-3xl shadow-soft sm:text-4xl"
                style={{ background: c.gradient }}
              >
                <span>{c.emoji}</span>
              </div>
              <span className="line-clamp-1 text-[10px] font-medium text-muted-foreground">{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
