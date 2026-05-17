import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { planTrip, buildDaySummaries } from "@/lib/itinerary-planner";

// ---- Public: accept invite token ----
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ token: z.string().min(8).max(200) }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (error || !invite) return { ok: false, error: "Invite not found" as const };

    // mark used (idempotent)
    await supabaseAdmin
      .from("invites")
      .update({ used_at: invite.used_at ?? new Date().toISOString(), used_by: invite.used_by ?? userId })
      .eq("id", invite.id);

    // link profile to trip & seed name
    await supabaseAdmin
      .from("profiles")
      .update({ trip_id: invite.trip_id, full_name: invite.full_name })
      .eq("id", userId);

    return { ok: true as const, tripId: invite.trip_id };
  });

// ---- Dashboard: get my profile + trip + everyone ----
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) return { profile, trip: null, members: [], flights: [], stays: [] };
    const tripId = profile.trip_id;
    const [{ data: trip }, { data: members }, { data: flights }, { data: stays }] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
      supabase.from("profiles").select("id, full_name, avatar_url, whatsapp_joined_at").eq("trip_id", tripId),
      supabase.from("flights").select("*").eq("trip_id", tripId).order("scheduled_at", { ascending: true }),
      supabase.from("accommodations").select("*").eq("trip_id", tripId),
    ]);
    return { profile, trip, members: members ?? [], flights: flights ?? [], stays: stays ?? [] };
  });

export const getItinerary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) return { days: [], activities: [] };
    const [{ data: days }, { data: activities }] = await Promise.all([
      supabase.from("itinerary_days").select("*").eq("trip_id", profile.trip_id).order("day_date"),
      supabase.from("activities").select("*").eq("trip_id", profile.trip_id).order("day_date").order("start_time", { ascending: true, nullsFirst: true }),
    ]);
    return { days: days ?? [], activities: activities ?? [] };
  });

// ---- Profile updates ----
export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    full_name: z.string().min(1).max(120).optional(),
    phone: z.string().max(40).optional().nullable(),
    dietary: z.string().max(200).optional().nullable(),
    room_preference: z.string().max(100).optional().nullable(),
    avatar_url: z.string().max(4000).optional().nullable(),
    onboarding_step: z.number().int().min(0).max(10).optional(),
    onboarding_complete: z.boolean().optional(),
    whatsapp_joined: z.boolean().optional(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { whatsapp_joined, ...rest } = data;
    const patch = whatsapp_joined ? { ...rest, whatsapp_joined_at: new Date().toISOString() } : rest;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    airline: z.string().max(120).optional().nullable(),
    airline_iata: z.string().max(3).optional().nullable(),
    flight_number: z.string().min(1).max(20),
    scheduled_at: z.string().min(1).max(60),
    origin_iata: z.string().max(6).optional().nullable(),
    origin_city: z.string().max(120).optional().nullable(),
    destination_iata: z.string().max(6).optional().nullable(),
    destination_city: z.string().max(120).optional().nullable(),
    direction: z.enum(["arrival", "departure"]).default("arrival"),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("Join a trip first");
    // upsert by user+direction
    const { data: existing } = await supabase.from("flights").select("id").eq("user_id", userId).eq("direction", data.direction).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("flights").update({ ...data, trip_id: profile.trip_id }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("flights").insert({ ...data, user_id: userId, trip_id: profile.trip_id });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const saveAccommodation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional().nullable(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    check_in: z.string().max(20).optional().nullable(),
    check_out: z.string().max(20).optional().nullable(),
    place_id: z.string().max(200).optional().nullable(),
    booking_source: z.string().max(40).optional().nullable(),
    booking_url: z.string().url().max(800).optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("Join a trip first");
    const { data: existing } = await supabase.from("accommodations").select("id").eq("user_id", userId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("accommodations").update({ ...data, trip_id: profile.trip_id }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("accommodations").insert({ ...data, user_id: userId, trip_id: profile.trip_id });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ---- Nominatim proxy (free geocoding) ----
export const geocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ q: z.string().min(3).max(120) }))
  .handler(async ({ data }) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "WarkinaBali/1.0 (trip portal)", "Accept-Language": "en" },
    });
    if (!res.ok) return { results: [] as Array<{ place_id: string; name: string; address: string; lat: number; lng: number }> };
    const json = (await res.json()) as Array<{ place_id: number; display_name: string; lat: string; lon: string; name?: string }>;
    return {
      results: json.map((r) => ({
        place_id: String(r.place_id),
        name: r.name || r.display_name.split(",")[0],
        address: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      })),
    };
  });

// ---- AI booking parsers ----
async function callAiJson(prompt: string, system: string): Promise<unknown> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit — try again shortly");
  if (res.status === 402) throw new Error("AI credits exhausted");
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  try { return JSON.parse(json.choices?.[0]?.message?.content ?? "{}"); } catch { return {}; }
}

export const parseFlightText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ text: z.string().min(3).max(8000) }))
  .handler(async ({ data }) => {
    const parsed = await callAiJson(
      `Extract flight details from this text. Return strict JSON with keys:
{ "airline": string|null, "flight_number": string|null, "scheduled_at": ISO8601 string|null (arrival time if both, else departure), "origin_iata": 3-letter|null, "destination_iata": 3-letter|null, "confidence": "high"|"medium"|"low" }
If only a booking reference is given without flight info, return confidence "low" and fill what you can.
Text:
"""${data.text}"""`,
      "You are a precise travel data extractor. Reply with strict JSON only. Use null for unknown fields. Never invent flight numbers or times.",
    ) as Record<string, unknown>;
    return {
      airline: (parsed.airline as string) ?? null,
      flight_number: (parsed.flight_number as string) ?? null,
      scheduled_at: (parsed.scheduled_at as string) ?? null,
      origin_iata: (parsed.origin_iata as string) ?? null,
      destination_iata: (parsed.destination_iata as string) ?? null,
      confidence: ((parsed.confidence as string) ?? "low") as "high" | "medium" | "low",
    };
  });

export const parseStayText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ text: z.string().min(3).max(8000) }))
  .handler(async ({ data }) => {
    // Detect URL + source from raw text first
    let booking_url: string | null = null;
    let booking_source: string | null = null;
    const urlMatch = data.text.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) {
      booking_url = urlMatch[0];
      try {
        const host = new URL(booking_url).hostname.replace(/^www\./, "");
        if (host.includes("airbnb")) booking_source = "airbnb";
        else if (host.includes("booking")) booking_source = "booking";
        else if (host.includes("agoda")) booking_source = "agoda";
        else if (host.includes("expedia")) booking_source = "expedia";
        else if (host.includes("vrbo")) booking_source = "vrbo";
        else if (host.includes("trivago")) booking_source = "trivago";
        else if (host.includes("hotels.com")) booking_source = "hotels";
        else booking_source = "other";
      } catch { /* ignore */ }
    }
    const parsed = await callAiJson(
      `Extract accommodation booking details. Return strict JSON:
{ "name": string|null, "address": string|null (full street address), "check_in": "YYYY-MM-DD"|null, "check_out": "YYYY-MM-DD"|null, "lat": number|null, "lng": number|null, "confidence": "high"|"medium"|"low" }
Text:
"""${data.text}"""`,
      "You are a precise travel data extractor. Reply with strict JSON only. Use null for unknown fields. Never invent addresses.",
    ) as Record<string, unknown>;
    return {
      name: (parsed.name as string) ?? null,
      address: (parsed.address as string) ?? null,
      check_in: (parsed.check_in as string) ?? null,
      check_out: (parsed.check_out as string) ?? null,
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
      booking_url,
      booking_source,
      confidence: ((parsed.confidence as string) ?? "low") as "high" | "medium" | "low",
    };
  });

// ---- Group chat ----
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) return { messages: [] };
    const { data } = await supabase
      .from("messages")
      .select("id, trip_id, user_id, body, created_at")
      .eq("trip_id", profile.trip_id)
      .order("created_at", { ascending: true })
      .limit(500);
    return { messages: data ?? [] };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ body: z.string().min(1).max(4000) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("Join a trip first");
    const { error } = await supabase.from("messages").insert({ trip_id: profile.trip_id, user_id: userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- AI Itinerary suggestions ----
export const suggestItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("Join a trip first");
    const [{ data: trip }, { data: stays }, { data: flights }] = await Promise.all([
      supabase.from("trips").select("*").eq("id", profile.trip_id).maybeSingle(),
      supabase.from("accommodations").select("name,address").eq("trip_id", profile.trip_id),
      supabase.from("flights").select("scheduled_at,direction").eq("trip_id", profile.trip_id),
    ]);
    if (!trip) throw new Error("No trip");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");
    const prompt = `Plan a concise day-by-day itinerary for a group trip.
Trip: ${trip.name} — ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date}
Accommodations: ${(stays ?? []).map((s) => `${s.name} (${s.address ?? ""})`).join("; ") || "TBD"}
Arrivals: ${(flights ?? []).filter((f) => f.direction === "arrival").map((f) => f.scheduled_at).join(", ") || "TBD"}
Return JSON: { "days": [ { "date": "YYYY-MM-DD", "title": "...", "items": ["morning ...", "afternoon ...", "evening ..."] } ] }
Keep it grounded, local, and group-friendly. 3-5 items per day max.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a thoughtful travel concierge. Reply with strict JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("AI rate limit — try again shortly");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits in workspace settings");
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content) as { days: Array<{ date: string; title: string; items: string[] }> };
      return { days: parsed.days ?? [] };
    } catch {
      return { days: [] as Array<{ date: string; title: string; items: string[] }> };
    }
  });

// ---- Admin ----
export const adminListGuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: invites } = await supabaseAdmin.from("invites").select("*").order("created_at", { ascending: false });
    return { profiles: profiles ?? [], invites: invites ?? [] };
  });

export const adminCreateInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ full_name: z.string().min(1).max(120), email: z.string().email().optional().nullable() }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    const { data: trip } = await supabaseAdmin.from("trips").select("id").eq("is_active", true).limit(1).maybeSingle();
    if (!trip) throw new Error("No active trip");
    const token = crypto.randomUUID().replace(/-/g, "");
    const { data: inv, error } = await supabaseAdmin.from("invites").insert({
      token, full_name: data.full_name, email: data.email ?? null, trip_id: trip.id, created_by: userId,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { invite: inv };
  });

export const adminBecomeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ secret: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    // bootstrap: if no admins exist yet, anyone with secret "warkina" can claim
    if (data.secret !== "warkina") throw new Error("Bad secret");
    const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) {
      // require existing admin via service role? In bootstrap mode only.
      throw new Error("Admin already claimed");
    }
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTripWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ whatsapp_invite_url: z.string().url().max(500) }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden — host only");
    const { data: trip } = await supabaseAdmin.from("trips").select("id").eq("is_active", true).limit(1).maybeSingle();
    if (!trip) throw new Error("No active trip");
    const { error } = await supabaseAdmin.from("trips").update({ whatsapp_invite_url: data.whatsapp_invite_url }).eq("id", trip.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    return { admin: !!data };
  });

// ---- Live location sharing ----
export const updateMyLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().min(0).max(100000).optional().nullable(),
      heading: z.number().min(0).max(360).optional().nullable(),
      sharing: z.boolean().default(true),
    }),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("trip_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const { error } = await supabaseAdmin.from("live_locations").upsert({
      user_id: userId,
      trip_id: profile.trip_id,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy ?? null,
      heading: data.heading ?? null,
      sharing: data.sharing,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const stopSharingLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await supabaseAdmin.from("live_locations").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const listLiveLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase.from("live_locations").select("*").eq("sharing", true);
    return { locations: data ?? [] };
  });

// ---- Host: create a trip from scratch ----
export const createTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    name: z.string().min(1).max(120),
    occasion: z.string().min(1).max(60),
    destination: z.string().min(1).max(120),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    start_date: z.string().min(8).max(20),
    end_date: z.string().min(8).max(20),
    description: z.string().max(2000).optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Create trip
    const { data: trip, error } = await supabaseAdmin.from("trips").insert({
      name: data.name,
      destination: data.destination,
      occasion: data.occasion,
      start_date: data.start_date,
      end_date: data.end_date,
      description: data.description ?? null,
      map_center_lat: data.lat ?? null,
      map_center_lng: data.lng ?? null,
      is_active: false,
    }).select("*").single();
    if (error || !trip) throw new Error(error?.message ?? "Couldn't create trip");
    // Grant host admin role (idempotent)
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" },
    );
    // Link host's profile to this trip
    await supabaseAdmin.from("profiles").update({ trip_id: trip.id }).eq("id", userId);
    return { trip };
  });

// ---- Host: create a magic link (multi-use invite) ----
export const createMagicLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    full_name: z.string().min(1).max(120).default("Guest"),
    max_uses: z.number().int().min(1).max(500).default(50),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { data: inv, error } = await supabaseAdmin.from("invites").insert({
      token,
      full_name: data.full_name,
      trip_id: profile.trip_id,
      created_by: userId,
      max_uses: data.max_uses,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { invite: inv, token };
  });

// ---- Host: add a single event/activity ----
export const addActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    day_date: z.string().min(8).max(20),
    title: z.string().min(1).max(200),
    start_time: z.string().max(10).optional().nullable(),
    location: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const { error } = await supabaseAdmin.from("activities").insert({
      trip_id: profile.trip_id,
      day_date: data.day_date,
      title: data.title,
      start_time: data.start_time || null,
      location: data.location || null,
      description: data.description || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Host: persist AI-drafted days ----
export const saveItineraryDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    days: z.array(z.object({
      date: z.string().min(8).max(20),
      title: z.string().min(1).max(200),
      summary: z.string().max(2000).optional().nullable(),
    })).max(60),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    if (data.days.length === 0) return { ok: true };
    const tripId = profile.trip_id;
    const rows = data.days.map((d, i) => ({
      trip_id: tripId,
      day_date: d.date,
      title: d.title,
      summary: d.summary ?? null,
      sort_index: i,
    }));
    // Replace existing days for this trip with the fresh AI draft
    await supabaseAdmin.from("itinerary_days").delete().eq("trip_id", tripId);
    const { error } = await supabaseAdmin.from("itinerary_days").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// Flight lookup via AviationStack (no AI tokens)
// ============================================================
export const lookupFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    flight_number: z.string().min(3).max(10).regex(/^[A-Za-z0-9]{2,3}\s*\d{1,4}[A-Za-z]?$/),
    date: z.string().min(8).max(20).optional().nullable(),
  }))
  .handler(async ({ data }) => {
    const key = process.env.AVIATIONSTACK_API_KEY;
    if (!key) throw new Error("Flight lookup not configured");
    const fnum = data.flight_number.replace(/\s+/g, "").toUpperCase();
    // NOTE: AviationStack free tier rejects `flight_date`. We fetch the
    // recent window for the flight number and (if a date was provided)
    // pick the matching entry client-side, otherwise the most recent one
    // — schedules repeat daily so departure/arrival times still match.
    const url = new URL("https://api.aviationstack.com/v1/flights");
    url.searchParams.set("access_key", key);
    url.searchParams.set("flight_iata", fnum);
    url.searchParams.set("limit", "10");
    const res = await fetch(url.toString());
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      error?: { message?: string; code?: string };
    };
    if (json.error) {
      console.error("AviationStack error", json.error);
      return { found: false as const };
    }
    type Row = {
      flight_date?: string;
      airline?: { name?: string; iata?: string };
      flight?: { iata?: string; number?: string };
      departure?: { iata?: string; airport?: string; scheduled?: string };
      arrival?: { iata?: string; airport?: string; scheduled?: string };
      flight_status?: string;
    };
    const rows = (json.data ?? []) as Row[];
    if (rows.length === 0) return { found: false as const };
    const f =
      (data.date && rows.find((r) => r.flight_date === data.date)) ||
      rows[0];
    return {
      found: true as const,
      airline: f.airline?.name ?? null,
      airline_iata: f.airline?.iata ?? null,
      flight_number: f.flight?.iata ?? fnum,
      // If we had no exact-date match but the user supplied one, shift the
      // canonical schedule onto that date so the UI shows their trip date.
      scheduled_at: shiftToDate(
        f.arrival?.scheduled ?? f.departure?.scheduled ?? null,
        data.date && f.flight_date !== data.date ? data.date : null,
      ),
      origin_iata: f.departure?.iata ?? null,
      origin_city: f.departure?.airport ?? null,
      destination_iata: f.arrival?.iata ?? null,
      destination_city: f.arrival?.airport ?? null,
      status: f.flight_status ?? null,
    };
  });

function shiftToDate(iso: string | null, targetDate: string | null): string | null {
  if (!iso) return null;
  if (!targetDate) return iso;
  // Replace just the YYYY-MM-DD portion, keep time + offset.
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})(T.*)$/);
  if (!m) return iso;
  return `${targetDate}${m[2]}`;
}

// ============================================================
// Events: rich add + RSVPs + agenda
// ============================================================
export const addEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    day_date: z.string().min(8).max(20),
    title: z.string().min(1).max(200),
    start_time: z.string().max(10).optional().nullable(),
    end_time: z.string().max(10).optional().nullable(),
    location: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    category: z.enum(["food", "activity", "culture", "nightlife", "chill", "transit", "other"]).default("activity"),
    image_url: z.string().max(2000).optional().nullable(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("Join a trip first");
    const { error } = await supabaseAdmin.from("activities").insert({
      ...data,
      trip_id: profile.trip_id,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    activity_id: z.string().uuid(),
    status: z.enum(["going", "maybe", "declined"]),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const { data: existing } = await supabase.from("event_rsvps").select("id").eq("activity_id", data.activity_id).eq("user_id", userId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("event_rsvps").update({ status: data.status }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("event_rsvps").insert({
        activity_id: data.activity_id,
        user_id: userId,
        trip_id: profile.trip_id,
        status: data.status,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) return { events: [], rsvps: {} as Record<string, "going" | "maybe" | "declined">, counts: {} as Record<string, { going: number; maybe: number; declined: number }> };
    const [{ data: events }, { data: rsvps }] = await Promise.all([
      supabase.from("activities").select("*").eq("trip_id", profile.trip_id).order("day_date").order("start_time", { ascending: true, nullsFirst: true }),
      supabase.from("event_rsvps").select("*").eq("trip_id", profile.trip_id),
    ]);
    const myRsvps: Record<string, "going" | "maybe" | "declined"> = {};
    const counts: Record<string, { going: number; maybe: number; declined: number }> = {};
    for (const r of rsvps ?? []) {
      if (r.user_id === userId) myRsvps[r.activity_id] = r.status as "going" | "maybe" | "declined";
      const c = counts[r.activity_id] ?? { going: 0, maybe: 0, declined: 0 };
      c[r.status as "going" | "maybe" | "declined"]++;
      counts[r.activity_id] = c;
    }
    return { events: events ?? [], rsvps: myRsvps, counts };
  });

// ============================================================
// Apply preferences → deterministic Bali plan (no AI tokens)
// ============================================================
export const applyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    vibes: z.array(z.string().max(40)).max(20),
    must_do: z.array(z.string().max(40)).max(20),
    avoid: z.array(z.string().max(40)).max(20),
    pace: z.number().int().min(1).max(5),
    budget: z.number().int().min(1).max(3),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Host only");
    const { data: trip } = await supabaseAdmin.from("trips").select("start_date,end_date").eq("id", profile.trip_id).maybeSingle();
    if (!trip) throw new Error("No trip");

    const tripId = profile.trip_id;
    // Save preferences (delete-then-insert to avoid unique constraint requirement)
    await supabaseAdmin.from("trip_preferences").delete().eq("trip_id", tripId);
    await supabaseAdmin.from("trip_preferences").insert({
      trip_id: tripId,
      created_by: userId,
      vibes: data.vibes,
      must_do: data.must_do,
      avoid: data.avoid,
      pace: data.pace,
      budget: data.budget,
    });

    const events = planTrip(trip.start_date, trip.end_date, data);
    const days = buildDaySummaries(events);

    await supabaseAdmin.from("activities").delete().eq("trip_id", tripId);
    await supabaseAdmin.from("itinerary_days").delete().eq("trip_id", tripId);
    if (days.length > 0) {
      await supabaseAdmin.from("itinerary_days").insert(days.map((d, i) => ({
        trip_id: tripId, day_date: d.date, title: d.title, summary: d.summary, sort_index: i,
      })));
    }
    if (events.length > 0) {
      await supabaseAdmin.from("activities").insert(events.map((e, i) => ({
        trip_id: tripId, day_date: e.day_date, title: e.title, description: e.description,
        location: e.location, start_time: e.start_time, end_time: e.end_time, duration_min: e.duration_min,
        lat: e.lat, lng: e.lng, category: e.category, image_url: e.image_url, sort_index: i, created_by: userId,
      })));
    }
    return { ok: true, days: days.length, events: events.length };
  });

export const getTripPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) return { prefs: null };
    const { data } = await supabase.from("trip_preferences").select("*").eq("trip_id", profile.trip_id).maybeSingle();
    return { prefs: data };
  });

// ============================================================
// Group-first itinerary: activities + creators + RSVPs + stays
// ============================================================
export const getItineraryHome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) return { trip: null, activities: [], stays: [], rsvps: [], members: [] };
    const tripId = profile.trip_id;
    const [{ data: trip }, { data: activities }, { data: stays }, { data: rsvps }, { data: members }] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
      supabase.from("activities").select("*").eq("trip_id", tripId).order("day_date").order("is_host_event", { ascending: false }).order("start_time", { ascending: true, nullsFirst: true }),
      supabase.from("accommodations").select("*").eq("trip_id", tripId),
      supabase.from("event_rsvps").select("*").eq("trip_id", tripId),
      supabase.from("profiles").select("id, full_name, avatar_url").eq("trip_id", tripId),
    ]);
    return {
      trip,
      activities: activities ?? [],
      stays: stays ?? [],
      rsvps: rsvps ?? [],
      members: members ?? [],
      userId,
    };
  });

export const createHostEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    day_date: z.string().min(8).max(20),
    title: z.string().min(1).max(200),
    start_time: z.string().max(10).optional().nullable(),
    end_time: z.string().max(10).optional().nullable(),
    location: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    booking_url: z.string().url().max(800).optional().nullable(),
    category: z.enum(["food", "activity", "culture", "nightlife", "chill", "transit", "other"]).default("activity"),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Host only");
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const { data: act, error } = await supabaseAdmin.from("activities").insert({
      ...data,
      trip_id: profile.trip_id,
      created_by: userId,
      is_host_event: true,
    }).select("id").single();
    if (error || !act) throw new Error(error?.message ?? "Couldn't create event");
    // auto-RSVP host
    await supabaseAdmin.from("event_rsvps").insert({
      activity_id: act.id, user_id: userId, trip_id: profile.trip_id, status: "going",
    });
    return { ok: true, id: act.id };
  });

export const recommendActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    adventure: z.number().min(1).max(5).default(3),
    pace: z.number().min(1).max(5).default(3),
    popularity: z.number().min(1).max(5).default(3),
    limit: z.number().int().min(1).max(24).default(12),
  }))
  .handler(async ({ data, context }) => {
    const { BALI_CATALOGUE } = await import("@/data/bali-activities");
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    const used = new Set<string>();
    if (profile?.trip_id) {
      const { data: existing } = await supabase.from("activities").select("title").eq("trip_id", profile.trip_id);
      (existing ?? []).forEach((a) => used.add((a.title ?? "").toLowerCase()));
    }
    const POPULAR_IDS = new Set([
      "morning-tegalalang", "afternoon-monkey-forest", "afternoon-uluwatu-temple",
      "afternoon-nusa-penida", "evening-single-fin", "evening-finns-club",
      "evening-savaya", "evening-jimbaran-seafood", "morning-mt-batur",
    ]);
    const scored = BALI_CATALOGUE
      .filter((e) => !used.has(e.title.toLowerCase()))
      .map((e) => {
        const advScore = e.intensity === 3 ? 5 : e.intensity === 2 ? 3 : 1;
        const paceScore = e.duration_min < 120 ? 5 : e.duration_min < 240 ? 3 : 1;
        const popScore = POPULAR_IDS.has(e.id) ? 5 : 2;
        const dist = Math.abs(advScore - data.adventure) + Math.abs(paceScore - data.pace) + Math.abs(popScore - data.popularity);
        return { e, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, data.limit)
      .map(({ e }) => ({
        catalogue_id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        lat: e.lat,
        lng: e.lng,
        category: e.category,
        image_url: e.image_url,
        duration_min: e.duration_min,
        daypart: e.daypart,
        area: e.area,
      }));
    return { recommendations: scored };
  });

export const addCatalogueToTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    catalogue_id: z.string().min(1).max(80),
    day_date: z.string().min(8).max(20),
  }))
  .handler(async ({ data, context }) => {
    const { BALI_CATALOGUE } = await import("@/data/bali-activities");
    const { userId } = context;
    const entry = BALI_CATALOGUE.find((e) => e.id === data.catalogue_id);
    if (!entry) throw new Error("Recommendation not found");
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const start = entry.daypart === "morning" ? "09:00" : entry.daypart === "afternoon" ? "13:30" : "18:30";
    const { data: act, error } = await supabaseAdmin.from("activities").insert({
      trip_id: profile.trip_id,
      created_by: userId,
      day_date: data.day_date,
      title: entry.title,
      description: entry.description,
      location: entry.location,
      start_time: start,
      duration_min: entry.duration_min,
      lat: entry.lat,
      lng: entry.lng,
      category: entry.category,
      image_url: entry.image_url,
      is_host_event: false,
    }).select("id").single();
    if (error || !act) throw new Error(error?.message ?? "Couldn't add");
    // auto-RSVP the adder
    await supabaseAdmin.from("event_rsvps").insert({
      activity_id: act.id, user_id: userId, trip_id: profile.trip_id, status: "going",
    });
    return { ok: true, id: act.id };
  });
