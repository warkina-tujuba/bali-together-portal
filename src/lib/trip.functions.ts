import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

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
    avatar_url: z.string().url().max(500).optional().nullable(),
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
