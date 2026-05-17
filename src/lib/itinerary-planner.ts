import { BALI_CATALOGUE, type CatalogueEntry } from "@/data/bali-activities";

export type Preferences = {
  vibes: string[];
  must_do: string[];
  avoid: string[];   // "early", "drives", "crowds"
  pace: number;      // 1..5 (chill .. packed)
  budget: number;    // 1..3 ($ .. $$$)
};

export type PlannedEvent = {
  day_date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  title: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  category: CatalogueEntry["category"];
  image_url: string;
  catalogue_id: string;
};

function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const s = new Date(startISO);
  const e = new Date(endISO);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return out;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
    if (out.length > 30) break;
  }
  return out;
}

function scoreEntry(e: CatalogueEntry, p: Preferences): number {
  let score = 0;
  // Vibe matches (heavy weight)
  for (const v of p.vibes) if (e.vibes.includes(v as CatalogueEntry["vibes"][number])) score += 6;
  // Must-do tag matches (very heavy)
  for (const t of p.must_do) if (e.tags.includes(t as CatalogueEntry["tags"][number])) score += 10;
  // Budget — penalize over-budget items
  if (e.budget > p.budget) score -= (e.budget - p.budget) * 4;
  // Avoid rules
  if (p.avoid.includes("early") && e.daypart === "morning" && e.duration_min > 180) score -= 8;
  if (p.avoid.includes("drives") && (e.area === "amed" || e.area === "munduk" || e.area === "nusa-penida")) score -= 6;
  if (p.avoid.includes("crowds") && (e.id.includes("monkey-forest") || e.id.includes("uluwatu-temple") || e.id.includes("finns") || e.id.includes("savaya"))) score -= 5;
  return score;
}

const dayparts: Array<{ slot: "morning" | "afternoon" | "evening"; start: string }> = [
  { slot: "morning", start: "09:00" },
  { slot: "afternoon", start: "13:30" },
  { slot: "evening", start: "18:30" },
];

function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor((total / 60) % 24);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/**
 * Builds a day-by-day plan using the curated catalogue and the host's prefs.
 * Picks 1-4 events per day based on `pace`. Never reuses the same activity twice.
 */
export function planTrip(start: string, end: string, p: Preferences): PlannedEvent[] {
  const dates = dateRange(start, end);
  if (dates.length === 0) return [];

  const used = new Set<string>();
  const result: PlannedEvent[] = [];

  // Pace 1 → 1 event/day, 5 → 4 events/day. Always at least 1, at most 4.
  const eventsPerDay = Math.max(1, Math.min(4, Math.round(0.75 * p.pace + 0.5)));

  for (const date of dates) {
    // Rank candidates fresh per day so each day gets best-fit options
    const ranked = BALI_CATALOGUE
      .filter((e) => !used.has(e.id))
      .map((e) => ({ entry: e, score: scoreEntry(e, p) }))
      .sort((a, b) => b.score - a.score);

    // Fill slots in daypart order
    const slotsToFill = dayparts.slice(0, eventsPerDay);
    for (const slot of slotsToFill) {
      // Prefer entry matching this daypart; fall back to any positive-scored entry
      const pick =
        ranked.find((r) => !used.has(r.entry.id) && r.entry.daypart === slot.slot && r.score > -10)
        ?? ranked.find((r) => !used.has(r.entry.id) && r.score > -10);
      if (!pick) continue;
      used.add(pick.entry.id);
      const e = pick.entry;
      result.push({
        day_date: date,
        start_time: slot.start,
        end_time: addMinutesToTime(slot.start, e.duration_min),
        duration_min: e.duration_min,
        title: e.title,
        description: e.description,
        location: e.location,
        lat: e.lat,
        lng: e.lng,
        category: e.category,
        image_url: e.image_url,
        catalogue_id: e.id,
      });
    }
  }

  return result;
}

export function buildDaySummaries(events: PlannedEvent[]): Array<{ date: string; title: string; summary: string }> {
  const byDate = new Map<string, PlannedEvent[]>();
  for (const ev of events) {
    if (!byDate.has(ev.day_date)) byDate.set(ev.day_date, []);
    byDate.get(ev.day_date)!.push(ev);
  }
  return Array.from(byDate.entries()).map(([date, evs]) => {
    // Pick a title from the most "headline" event (longest duration or first cultural/activity)
    const headline = [...evs].sort((a, b) => b.duration_min - a.duration_min)[0];
    return {
      date,
      title: headline?.title ?? "Open day",
      summary: evs.map((e) => `${e.start_time.slice(0, 5)} ${e.title}`).join(" • "),
    };
  });
}
