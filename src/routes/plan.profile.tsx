import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanDraft } from "@/lib/plan-draft";
import { finalizeTripDraft, uploadProfilePhoto } from "@/lib/plan.functions";

export const Route = createFileRoute("/plan/profile")({ component: PlanProfile });

const MARKER_COLOURS = [
  "#FF6B6B", "#F59E0B", "#10B981", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#0F172A",
] as const;

function PlanProfile() {
  const navigate = useNavigate();
  const draft = usePlanDraft();
  const qc = useQueryClient();
  const finalize = useServerFn(finalizeTripDraft);
  const upload = useServerFn(uploadProfilePhoto);

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [colour, setColour] = useState<string>(MARKER_COLOURS[0]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) {
        navigate({ to: "/plan/auth", search: { next: "/plan/profile" } });
        return;
      }
      const meta = u.user_metadata ?? {};
      setName((meta.full_name as string) ?? (meta.name as string) ?? "");
      setPhoto((meta.avatar_url as string) ?? (meta.picture as string) ?? null);
    });
  }, [navigate]);

  // No draft? Send them back to /plan.
  useEffect(() => {
    if (!draft.destination) {
      // give zustand persist a tick to hydrate
      const t = setTimeout(() => {
        if (!usePlanDraft.getState().destination) navigate({ to: "/plan" });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [draft.destination, navigate]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const r = await upload({ data: { base64, contentType: f.type as "image/png" | "image/jpeg" } });
      setPhoto(r.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    if (!name.trim() || !draft.destination) return;
    setBusy(true);
    try {
      await finalize({
        data: {
          draft: {
            destination: draft.destination,
            start_date: draft.start_date,
            end_date: draft.end_date,
            duration_days: draft.duration_days,
            dates_flexible: draft.dates_flexible,
            places: draft.places,
            stays: draft.stays,
            arrival: draft.arrival,
            vibe: draft.vibe,
          },
          profile: {
            full_name: name.trim(),
            avatar_url: photo,
            marker_colour: colour,
          },
        },
      });
      draft.reset();
      await qc.invalidateQueries();
      navigate({ to: "/plan/ready" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save trip");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background px-5 pb-32 pt-10">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl sm:text-4xl">Last bit — you</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          How should your crew see you on the map?
        </p>

        <Card className="mt-6 rounded-3xl border-0 p-6 shadow-card">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-24 w-24 overflow-hidden rounded-full bg-secondary ring-4 ring-background"
              aria-label="Change photo"
            >
              {photo ? (
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Camera className="h-8 w-8" />
                </div>
              )}
              <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Upload a photo
            </button>
          </div>

          <div className="mt-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>

          <div className="mt-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Map pin colour</Label>
            <div className="mt-2 grid grid-cols-8 gap-2">
              {MARKER_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColour(c)}
                  style={{ background: c }}
                  className={cn(
                    "relative h-10 w-10 rounded-full transition",
                    colour === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:scale-110",
                  )}
                  aria-label={`Colour ${c}`}
                >
                  {colour === c && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Button
          onClick={handleFinish}
          disabled={busy || !name.trim()}
          className="mt-6 h-12 w-full rounded-xl text-base"
        >
          {busy ? "Saving your trip…" : "Save & enter your trip"}
        </Button>
      </div>
    </div>
  );
}
