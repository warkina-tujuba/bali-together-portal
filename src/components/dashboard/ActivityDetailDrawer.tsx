import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, DollarSign, ExternalLink, Crown, Trash2, Users, UserPlus, UserMinus, Lock } from "lucide-react";

export type DrawerActivity = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_min: number | null;
  image_url: string | null;
  booking_url: string | null;
  website_url: string | null;
  cost_usd: number | null;
  is_host_event: boolean;
  lat: number | null;
  lng: number | null;
  scope: "core" | "personal" | "shared" | null;
  owner_user_id: string | null;
};

export type SubscriberAvatar = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export function ActivityDetailDrawer({
  activity, open, onOpenChange,
  onDelete, onRsvp, myRsvp,
  isOwner, isSubscribed, subscribers,
  onSubscribe, onUnsubscribe, onToggleShare,
}: {
  activity: DrawerActivity | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onDelete?: (id: string) => void;
  onRsvp?: (id: string, status: "going" | "maybe") => void;
  myRsvp?: "going" | "maybe" | "declined" | null;
  isOwner?: boolean;
  isSubscribed?: boolean;
  subscribers?: SubscriberAvatar[];
  onSubscribe?: (id: string) => void;
  onUnsubscribe?: (id: string) => void;
  onToggleShare?: (id: string, scope: "personal" | "shared") => void;
}) {
  if (!activity) return null;
  const a = activity;
  const subs = subscribers ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {a.image_url && (
          <div className="-mx-6 -mt-6 mb-4 aspect-[16/9] overflow-hidden">
            <img src={a.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <SheetHeader>
          <div className="flex items-center gap-2">
            {a.is_host_event && <Badge className="bg-primary text-primary-foreground"><Crown className="mr-1 h-3 w-3" />Hosted</Badge>}
            {a.scope === "shared" && <Badge variant="secondary"><Users className="mr-1 h-3 w-3" />Shared</Badge>}
            {a.scope === "personal" && isOwner && <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />Just you</Badge>}
          </div>
          <SheetTitle className="font-display text-2xl leading-tight">{a.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3 text-sm">
          {a.start_time && (
            <Row icon={<Clock className="h-4 w-4" />}>
              {a.start_time.slice(0, 5)}{a.end_time ? ` – ${a.end_time.slice(0, 5)}` : ""}
              {a.duration_min ? <span className="ml-2 text-muted-foreground">· {Math.round(a.duration_min / 60 * 10) / 10}h</span> : null}
            </Row>
          )}
          {a.location && <Row icon={<MapPin className="h-4 w-4" />}>{a.location}</Row>}
          {a.cost_usd != null && <Row icon={<DollarSign className="h-4 w-4" />}>${a.cost_usd} per person</Row>}
          {a.description && (
            <p className="rounded-2xl bg-secondary p-3 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {a.website_url && (
              <a href={a.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs">
                Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {a.booking_url && (
              <a href={a.booking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                Book <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {a.lat != null && a.lng != null && (
              <a href={`https://maps.google.com/?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs">
                Open in Maps <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Crew subscribers */}
          {subs.length > 0 && (
            <div className="rounded-2xl border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">In the crew · {subs.length}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {subs.map((s) => (
                  <div key={s.user_id} title={s.full_name ?? ""} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border bg-background text-[11px] font-medium">
                    {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-full w-full object-cover" /> : (s.full_name?.[0] ?? "?")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner: share toggle */}
          {isOwner && onToggleShare && a.scope !== "core" && (
            <div className="flex items-center justify-between rounded-2xl border bg-card p-3 text-xs">
              <div>
                <p className="font-medium">{a.scope === "shared" ? "Visible to crew" : "Private to you"}</p>
                <p className="text-muted-foreground">{a.scope === "shared" ? "Crew members can subscribe." : "Share so others can join."}</p>
              </div>
              <Button size="sm" variant={a.scope === "shared" ? "outline" : "default"} className="rounded-full"
                onClick={() => onToggleShare(a.id, a.scope === "shared" ? "personal" : "shared")}
              >
                {a.scope === "shared" ? "Make private" : "Share with crew"}
              </Button>
            </div>
          )}

          {/* Non-owner: subscribe */}
          {!isOwner && onSubscribe && a.scope === "shared" && (
            <Button
              className="h-11 w-full rounded-xl"
              variant={isSubscribed ? "outline" : "default"}
              onClick={() => isSubscribed && onUnsubscribe ? onUnsubscribe(a.id) : onSubscribe(a.id)}
            >
              {isSubscribed ? (<><UserMinus className="mr-1 h-4 w-4" />Leave activity</>) : (<><UserPlus className="mr-1 h-4 w-4" />I'm in — add to my plan</>)}
            </Button>
          )}

          {onRsvp && a.is_host_event && (
            <div className="flex gap-2 pt-3">
              <Button size="sm" className="flex-1 rounded-full" variant={myRsvp === "going" ? "default" : "outline"} onClick={() => onRsvp(a.id, "going")}>I'm in</Button>
              <Button size="sm" className="flex-1 rounded-full" variant={myRsvp === "maybe" ? "secondary" : "ghost"} onClick={() => onRsvp(a.id, "maybe")}>Maybe</Button>
            </div>
          )}

          {onDelete && isOwner && (
            <button onClick={() => { onDelete(a.id); onOpenChange(false); }} className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" /> Remove from trip
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center gap-2"><span className="text-muted-foreground">{icon}</span><span>{children}</span></div>;
}
