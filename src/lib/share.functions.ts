import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// Set scope on an activity you own (personal vs shared with crew)
export const setActivityScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      activity_id: z.string().uuid(),
      scope: z.enum(["personal", "shared"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: act } = await supabaseAdmin.from("activities").select("owner_user_id").eq("id", data.activity_id).maybeSingle();
    if (!act) throw new Error("Not found");
    if (act.owner_user_id !== userId) throw new Error("Only the owner can change visibility");
    const { error } = await supabaseAdmin.from("activities").update({ scope: data.scope as never }).eq("id", data.activity_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Subscribe — clone the activity into your own plan, link via source_activity_id
export const subscribeToActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ activity_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");

    const { data: src } = await supabaseAdmin.from("activities").select("*").eq("id", data.activity_id).maybeSingle();
    if (!src) throw new Error("Activity not found");
    if (src.trip_id !== profile.trip_id) throw new Error("Different trip");
    if (src.owner_user_id === userId) throw new Error("Already yours");

    // Idempotent: avoid duplicate subscription
    const { data: existingSub } = await supabaseAdmin
      .from("activity_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("activity_id", data.activity_id)
      .maybeSingle();
    if (existingSub) return { ok: true, already: true };

    // Insert subscription record
    const { error: subErr } = await supabaseAdmin.from("activity_subscriptions").insert({
      user_id: userId,
      activity_id: data.activity_id,
    });
    if (subErr) throw new Error(subErr.message);

    // Clone the activity into the user's personal plan at same time slot
    const { error: cloneErr } = await supabaseAdmin.from("activities").insert({
      trip_id: profile.trip_id,
      created_by: userId,
      owner_user_id: userId,
      day_date: src.day_date,
      start_time: src.start_time,
      end_time: src.end_time,
      duration_min: src.duration_min,
      title: src.title,
      description: src.description,
      location: src.location,
      lat: src.lat,
      lng: src.lng,
      image_url: src.image_url,
      cost_usd: src.cost_usd,
      website_url: src.website_url,
      booking_url: src.booking_url,
      category: src.category,
      tags: src.tags,
      scope: "personal" as never,
      is_host_event: false,
      parked: false,
      source_activity_id: src.id,
    });
    if (cloneErr) throw new Error(cloneErr.message);

    return { ok: true };
  });

export const unsubscribeFromActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ activity_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await supabaseAdmin.from("activity_subscriptions").delete().eq("user_id", userId).eq("activity_id", data.activity_id);
    await supabaseAdmin.from("activities").delete().eq("source_activity_id", data.activity_id).eq("owner_user_id", userId);
    return { ok: true };
  });

// Park / unpark an activity (move between calendar and backlog)
export const setActivityParked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      activity_id: z.string().uuid(),
      parked: z.boolean(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: act } = await supabaseAdmin
      .from("activities")
      .select("owner_user_id, created_by")
      .eq("id", data.activity_id)
      .maybeSingle();
    if (!act) throw new Error("Not found");
    if (act.owner_user_id !== userId && act.created_by !== userId) {
      throw new Error("Not yours to move");
    }
    const { error } = await supabaseAdmin
      .from("activities")
      .update({ parked: data.parked })
      .eq("id", data.activity_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Crew view: who's subscribed to what (plus stub source ids)
export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) return { subscriptions: [] };
    // RLS already filters to current trip
    const { data } = await supabase.from("activity_subscriptions").select("user_id, activity_id, created_at");
    return { subscriptions: data ?? [] };
  });
