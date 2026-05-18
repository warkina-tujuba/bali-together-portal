import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VibeSchema = z.object({
  adventure: z.number().min(0).max(100), // 0=relax, 100=adventure
  culture: z.number().min(0).max(100),   // 0=party, 100=culture
  budget: z.number().min(0).max(100),    // 0=budget, 100=luxury
  foodie: z.number().min(0).max(100),    // 0=light, 100=foodie
  pace: z.number().min(0).max(100),      // 0=spontaneous, 100=planned
});

export type VibePrefs = z.infer<typeof VibeSchema>;

export const saveTripPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ vibe: VibeSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const v = data.vibe;
    const vibes: string[] = [];
    vibes.push(v.adventure > 60 ? "adventure" : v.adventure < 40 ? "relaxed" : "balanced");
    vibes.push(v.culture > 60 ? "cultural" : v.culture < 40 ? "party" : "mixed");
    if (v.foodie > 55) vibes.push("foodie");
    const pace = Math.max(1, Math.min(5, Math.round((v.pace / 100) * 4 + 1)));
    const budget = v.budget < 33 ? 1 : v.budget < 66 ? 2 : 3;
    const { error } = await supabase.from("trip_preferences").upsert({
      trip_id: profile.trip_id,
      created_by: userId,
      vibes,
      pace,
      budget,
      must_do: [],
      avoid: [],
    }, { onConflict: "trip_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SuggestionSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  est_cost_usd: z.number().nullable(),
  est_duration_min: z.number().nullable(),
  image_url: z.string().nullable(),
  url: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  tags: z.array(z.string()),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const recommendActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ limit: z.number().min(1).max(30).default(15) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const [{ data: trip }, { data: prefs }] = await Promise.all([
      supabase.from("trips").select("destination,start_date,end_date").eq("id", profile.trip_id).maybeSingle(),
      supabase.from("trip_preferences").select("vibes,pace,budget").eq("trip_id", profile.trip_id).maybeSingle(),
    ]);
    if (!trip) throw new Error("No trip");

    const slug = (trip.destination || "").toLowerCase().split(",")[0].trim().replace(/\s+/g, "-");
    const candidates = ["bali", slug];
    const { data: seeds } = await supabase
      .from("activity_seeds")
      .select("*")
      .in("destination_slug", candidates)
      .limit(60);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const seedContext = (seeds ?? []).slice(0, 30).map((s) => ({
      title: s.title, category: s.category, cost: s.est_cost_usd,
      dur: s.est_duration_min, tags: s.tags, image: s.image_url, lat: s.lat, lng: s.lng,
    }));

    const prompt = `You are picking ${data.limit} amazing activities for a trip.

Destination: ${trip.destination}
Dates: ${trip.start_date} → ${trip.end_date}
Vibes: ${(prefs?.vibes ?? []).join(", ") || "balanced"}
Pace (1=spontaneous, 5=planned): ${prefs?.pace ?? 3}
Budget (1=cheap, 3=luxury): ${prefs?.budget ?? 2}

Use these curated real seeds as anchors and supplement with similar real places. Return JSON {"items":[...]}. Each item: key (kebab slug), title, description (1-2 sentences), category, est_cost_usd (number or null), est_duration_min (number or null), image_url (unsplash URL), url (booking/info or null), lat, lng, tags (array). Prefer seeds when they fit vibes; otherwise add real well-known options.

Seeds JSON:
${JSON.stringify(seedContext)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a precise travel concierge. Output strict JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("AI rate limit — try again");
    if (res.status === 402) throw new Error("AI credits exhausted");
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let items: Suggestion[] = [];
    try {
      const parsed = JSON.parse(content) as { items?: unknown[] };
      items = z.array(SuggestionSchema).parse(parsed.items ?? []);
    } catch {
      // fallback: just use seeds
      items = (seeds ?? []).slice(0, data.limit).map((s) => ({
        key: s.id,
        title: s.title,
        description: s.description ?? "",
        category: s.category,
        est_cost_usd: s.est_cost_usd as number | null,
        est_duration_min: s.est_duration_min as number | null,
        image_url: s.image_url as string | null,
        url: s.url as string | null,
        lat: s.lat as number | null,
        lng: s.lng as number | null,
        tags: (s.tags as string[] | null) ?? [],
      }));
    }
    return { items };
  });

export const recordSwipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    suggestion: SuggestionSchema,
    verdict: z.enum(["save", "skip", "must"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const { error } = await supabase.from("activity_swipes").upsert({
      trip_id: profile.trip_id,
      user_id: userId,
      suggestion_key: data.suggestion.key,
      payload: data.suggestion as unknown as Record<string, unknown>,
      verdict: data.verdict,
    }, { onConflict: "user_id,suggestion_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
