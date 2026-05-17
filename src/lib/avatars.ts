// Curated character avatars across three universes.
// Uses emoji + themed gradient backgrounds to stay copyright-safe while
// still feeling like Marvel / DC / Pokemon characters.

export type AvatarUniverse = "marvel" | "dc" | "pokemon";

export type CharacterAvatar = {
  id: string;
  name: string;
  emoji: string;
  // CSS gradient (matches each character's signature palette)
  gradient: string;
  universe: AvatarUniverse;
};

export const CHARACTER_AVATARS: CharacterAvatar[] = [
  // Marvel
  { id: "marvel-spiderman", name: "Spider-Man", emoji: "🕷️", gradient: "linear-gradient(135deg,#e23636,#1e3a8a)", universe: "marvel" },
  { id: "marvel-ironman", name: "Iron Man", emoji: "🤖", gradient: "linear-gradient(135deg,#b91c1c,#facc15)", universe: "marvel" },
  { id: "marvel-thor", name: "Thor", emoji: "⚡", gradient: "linear-gradient(135deg,#1e3a8a,#94a3b8)", universe: "marvel" },
  { id: "marvel-hulk", name: "Hulk", emoji: "💚", gradient: "linear-gradient(135deg,#166534,#84cc16)", universe: "marvel" },
  { id: "marvel-cap", name: "Captain America", emoji: "🛡️", gradient: "linear-gradient(135deg,#1d4ed8,#e11d48)", universe: "marvel" },
  { id: "marvel-blackwidow", name: "Black Widow", emoji: "🕸️", gradient: "linear-gradient(135deg,#111827,#9f1239)", universe: "marvel" },
  { id: "marvel-drstrange", name: "Doctor Strange", emoji: "🔮", gradient: "linear-gradient(135deg,#7e22ce,#fb923c)", universe: "marvel" },
  { id: "marvel-blackpanther", name: "Black Panther", emoji: "🐆", gradient: "linear-gradient(135deg,#0f172a,#7c3aed)", universe: "marvel" },

  // DC
  { id: "dc-batman", name: "Batman", emoji: "🦇", gradient: "linear-gradient(135deg,#111827,#374151)", universe: "dc" },
  { id: "dc-superman", name: "Superman", emoji: "🦸", gradient: "linear-gradient(135deg,#1d4ed8,#dc2626)", universe: "dc" },
  { id: "dc-wonderwoman", name: "Wonder Woman", emoji: "👑", gradient: "linear-gradient(135deg,#b91c1c,#ca8a04)", universe: "dc" },
  { id: "dc-flash", name: "The Flash", emoji: "⚡", gradient: "linear-gradient(135deg,#dc2626,#facc15)", universe: "dc" },
  { id: "dc-aquaman", name: "Aquaman", emoji: "🔱", gradient: "linear-gradient(135deg,#0e7490,#fb923c)", universe: "dc" },
  { id: "dc-greenlantern", name: "Green Lantern", emoji: "💚", gradient: "linear-gradient(135deg,#166534,#22c55e)", universe: "dc" },
  { id: "dc-harley", name: "Harley Quinn", emoji: "🎭", gradient: "linear-gradient(135deg,#db2777,#1d4ed8)", universe: "dc" },
  { id: "dc-joker", name: "Joker", emoji: "🃏", gradient: "linear-gradient(135deg,#7e22ce,#16a34a)", universe: "dc" },

  // Pokemon
  { id: "pkm-pikachu", name: "Pikachu", emoji: "⚡", gradient: "linear-gradient(135deg,#facc15,#f59e0b)", universe: "pokemon" },
  { id: "pkm-charizard", name: "Charizard", emoji: "🔥", gradient: "linear-gradient(135deg,#ea580c,#fbbf24)", universe: "pokemon" },
  { id: "pkm-bulbasaur", name: "Bulbasaur", emoji: "🌱", gradient: "linear-gradient(135deg,#16a34a,#84cc16)", universe: "pokemon" },
  { id: "pkm-squirtle", name: "Squirtle", emoji: "💧", gradient: "linear-gradient(135deg,#0284c7,#38bdf8)", universe: "pokemon" },
  { id: "pkm-eevee", name: "Eevee", emoji: "🦊", gradient: "linear-gradient(135deg,#a16207,#fbbf24)", universe: "pokemon" },
  { id: "pkm-mewtwo", name: "Mewtwo", emoji: "🧬", gradient: "linear-gradient(135deg,#7e22ce,#c084fc)", universe: "pokemon" },
  { id: "pkm-snorlax", name: "Snorlax", emoji: "😴", gradient: "linear-gradient(135deg,#1e3a8a,#60a5fa)", universe: "pokemon" },
  { id: "pkm-gengar", name: "Gengar", emoji: "👻", gradient: "linear-gradient(135deg,#581c87,#a855f7)", universe: "pokemon" },
];

const SVG_NS = "http://www.w3.org/2000/svg";

/** Encode a character avatar as a self-contained data: URL for storing in profiles.avatar_url. */
export function characterAvatarToDataUrl(c: CharacterAvatar): string {
  // Resolve gradient stops from "linear-gradient(135deg,#a,#b)" syntax.
  const m = c.gradient.match(/#[0-9a-fA-F]{3,8}/g) ?? ["#1B5E4F", "#0F3D33"];
  const [c1, c2] = [m[0], m[1] ?? m[0]];
  const svg = `<svg xmlns="${SVG_NS}" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="128" height="128" fill="url(#g)"/><text x="64" y="86" font-size="72" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${c.emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function findCharacterByDataUrl(url: string | null | undefined): CharacterAvatar | null {
  if (!url) return null;
  for (const c of CHARACTER_AVATARS) {
    if (characterAvatarToDataUrl(c) === url) return c;
  }
  return null;
}
