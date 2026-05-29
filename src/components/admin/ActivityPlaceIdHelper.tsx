import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListActivities, adminAttachActivityPlaceId } from "@/lib/trip.functions";
import { searchPlacesAutocomplete, refreshActivityGoogleData } from "@/lib/places.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Check, MapPin } from "lucide-react";

export function ActivityPlaceIdHelper() {
  const listFn = useServerFn(adminListActivities);
  const { data, refetch, isLoading } = useQuery({ queryKey: ["admin-activities"], queryFn: () => listFn(), retry: false });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading activities…</div>;
  const activities = data?.activities ?? [];

  return (
    <Card className="rounded-3xl border-0 p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl">Google Place IDs</h3>
        <p className="text-xs text-muted-foreground">{activities.filter((a) => a.google_place_id).length}/{activities.length} linked</p>
      </div>
      <ul className="divide-y divide-border">
        {activities.map((a) => (
          <ActivityRow key={a.id} activity={a} onChanged={refetch} />
        ))}
        {activities.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">No activities yet.</li>
        )}
      </ul>
    </Card>
  );
}

type Activity = {
  id: string;
  title: string;
  location: string | null;
  day_date: string;
  google_place_id: string | null;
  google_data_last_refreshed_at: string | null;
  cached_google_rating: number | null;
};

function ActivityRow({ activity, onChanged }: { activity: Activity; onChanged: () => void }) {
  const autocompleteFn = useServerFn(searchPlacesAutocomplete);
  const attachFn = useServerFn(adminAttachActivityPlaceId);
  const refreshFn = useServerFn(refreshActivityGoogleData);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(activity.location ?? activity.title);
  const [hits, setHits] = useState<Array<{ place_id: string; main_text: string; secondary_text: string }>>([]);
  const [busy, setBusy] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await autocompleteFn({ data: { input: q } });
      setHits(r.suggestions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function attach(placeId: string) {
    setBusy(true);
    try {
      await attachFn({ data: { activityId: activity.id, placeId } });
      await refreshFn({ data: { activityId: activity.id, placeId } });
      toast.success("Linked + cached");
      setOpen(false);
      onChanged();
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshOnly() {
    if (!activity.google_place_id) return;
    setBusy(true);
    try {
      await refreshFn({ data: { activityId: activity.id, placeId: activity.google_place_id } });
      toast.success("Refreshed");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{activity.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {activity.day_date}{activity.location ? ` · ${activity.location}` : ""}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {activity.google_place_id ? (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                <Check className="mr-1 h-3 w-3" />Linked
                {activity.cached_google_rating != null && ` · ${activity.cached_google_rating}★`}
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full text-[10px]">Unlinked</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {activity.google_place_id && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={refreshOnly} className="h-8 w-8 p-0">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)} className="h-8 rounded-full text-xs">
            {open ? "Cancel" : activity.google_place_id ? "Re-link" : "Link"}
          </Button>
        </div>
      </div>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl bg-secondary p-2">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
              placeholder="Search Google Places"
              className="h-9 rounded-lg text-sm"
            />
            <Button size="sm" disabled={busy} onClick={search} className="h-9 rounded-lg">Search</Button>
          </div>
          {hits.length > 0 && (
            <ul className="max-h-60 overflow-auto rounded-lg bg-card">
              {hits.map((h) => (
                <li key={h.place_id}>
                  <button
                    onClick={() => attach(h.place_id)}
                    disabled={busy}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-secondary"
                  >
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <span><span className="font-medium">{h.main_text}</span><span className="text-muted-foreground"> · {h.secondary_text}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
