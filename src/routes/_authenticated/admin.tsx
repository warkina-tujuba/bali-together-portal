import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListGuests, adminCreateInvite, adminBecomeAdmin } from "@/lib/trip.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { ActivityPlaceIdHelper } from "@/components/admin/ActivityPlaceIdHelper";

export const Route = createFileRoute("/_authenticated/admin")({ component: Admin });

function Admin() {
  const listFn = useServerFn(adminListGuests);
  const createFn = useServerFn(adminCreateInvite);
  const claimFn = useServerFn(adminBecomeAdmin);
  const qc = useQueryClient();
  const { data, error, refetch } = useQuery({ queryKey: ["admin"], queryFn: () => listFn(), retry: false });
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");

  if (error) return (
    <div className="mx-auto max-w-md p-6">
      <Card className="rounded-3xl border-0 p-7 shadow-card">
        <h2 className="font-display text-3xl">Admin access</h2>
        <p className="mt-2 text-sm text-muted-foreground">Bootstrap the first admin with the secret <code>warkina</code>.</p>
        <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="secret" className="mt-4 h-12 rounded-xl" />
        <Button className="mt-3 h-12 w-full rounded-xl" onClick={async () => {
          try { await claimFn({ data: { secret } }); toast.success("You're admin"); refetch(); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
        }}>Claim admin</Button>
      </Card>
    </div>
  );

  if (!data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-6 space-y-5">
      <h1 className="font-display text-4xl">Host dashboard</h1>

      <Card className="rounded-3xl border-0 p-5 shadow-soft">
        <h3 className="font-display text-xl">Generate invite</h3>
        <div className="mt-3 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className="h-12 rounded-xl" />
          <Button
            className="h-12 rounded-xl"
            disabled={!name.trim()}
            onClick={async () => {
              try {
                const r = await createFn({ data: { full_name: name } });
                const url = `${window.location.origin}/?invite=${r.invite.token}`;
                await navigator.clipboard.writeText(url);
                toast.success("Invite copied to clipboard");
                setName("");
                qc.invalidateQueries({ queryKey: ["admin"] });
              } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            }}
          >Create + copy link</Button>
        </div>
      </Card>

      <Card className="rounded-3xl border-0 p-5 shadow-soft">
        <h3 className="font-display text-xl">Invites ({data.invites.length})</h3>
        <ul className="mt-3 divide-y divide-border">
          {data.invites.map((i) => (
            <li key={i.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{i.full_name}</p>
                <p className="text-xs text-muted-foreground">{i.used_at ? "Used" : "Pending"} • token …{i.token.slice(-8)}</p>
              </div>
              <button
                className="text-xs text-primary"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?invite=${i.token}`); toast.success("Copied"); }}
              >Copy link</button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="rounded-3xl border-0 p-5 shadow-soft">
        <h3 className="font-display text-xl">Guests ({data.profiles.length})</h3>
        <ul className="mt-3 divide-y divide-border">
          {data.profiles.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{p.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{p.email ?? ""} {p.onboarding_complete ? "• ✓ onboarded" : "• in progress"}</p>
              </div>
              <span className="text-xs text-muted-foreground">{p.whatsapp_joined_at ? "WA ✓" : "—"}</span>
            </li>
          ))}
        </ul>
      </Card>

      <ActivityPlaceIdHelper />
    </main>
  );
}
