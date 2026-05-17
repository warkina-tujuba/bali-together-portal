import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { setTripWhatsApp, updateProfile, adminCreateInvite } from "@/lib/trip.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle, Share2, Link as LinkIcon } from "lucide-react";

type Props = {
  trigger: React.ReactNode;
  isAdmin: boolean;
  inviteUrl: string | null;
  joined: boolean;
  tripName: string;
};

export function WhatsAppDialog({ trigger, isAdmin, inviteUrl, joined, tripName }: Props) {
  const [open, setOpen] = useState(false);
  const setWa = useServerFn(setTripWhatsApp);
  const updFn = useServerFn(updateProfile);
  const inviteFn = useServerFn(adminCreateInvite);
  const qc = useQueryClient();

  const [url, setUrl] = useState(inviteUrl ?? "");
  const [savingUrl, setSavingUrl] = useState(false);

  // Magic-link sender (host only)
  const [guestName, setGuestName] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  async function saveUrl() {
    setSavingUrl(true);
    try {
      await setWa({ data: { whatsapp_invite_url: url } });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Group link saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSavingUrl(false); }
  }

  async function markJoined() {
    await updFn({ data: { whatsapp_joined: true } });
    await qc.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Confirmed — you're in the group");
  }

  async function createMagicLink() {
    if (!guestName.trim()) return;
    setCreatingInvite(true);
    try {
      const r = await inviteFn({ data: { full_name: guestName.trim() } });
      const link = `${window.location.origin}/onboarding?invite=${r.invite.token}`;
      setMagicLink(link);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setCreatingInvite(false); }
  }

  function shareViaWhatsApp() {
    if (!magicLink) return;
    const msg = [
      `You're invited to ${tripName} 🌴`,
      `Tap your magic link — it logs you in and adds you to the crew:`,
      magicLink,
      inviteUrl ? `\nJoin the WhatsApp group: ${inviteUrl}` : "",
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">WhatsApp crew</DialogTitle>
          <DialogDescription>One tap to join — and host can fire off the magic-link invites here.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isAdmin && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Group invite URL (host)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..." className="h-11 rounded-xl" />
                <Button onClick={saveUrl} disabled={savingUrl || !url} className="h-11 rounded-xl">Save</Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Create the group in WhatsApp → Invite via link → paste here.</p>
            </div>
          )}

          {inviteUrl ? (
            <div className="space-y-2">
              <a href={inviteUrl} target="_blank" rel="noreferrer" onClick={() => { if (!joined) markJoined(); }}>
                <Button className="h-12 w-full rounded-xl bg-[#25D366] text-white hover:bg-[#1ebe5a]">
                  <MessageCircle className="mr-2 h-5 w-5" />{joined ? "Open group" : "Join WhatsApp group"}
                </Button>
              </a>
              {!joined && (
                <button onClick={markJoined} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
                  I'm already in — confirm
                </button>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
              {isAdmin ? "Add the group invite URL above so the crew can join." : "Waiting on the host to share the group link."}
            </p>
          )}

          {isAdmin && (
            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm font-medium">Send a magic link via WhatsApp</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Creates a one-tap link that signs your guest in and auto-connects them to the trip.</p>
              <div className="mt-3 flex gap-2">
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" className="h-10 rounded-lg" />
                <Button onClick={createMagicLink} disabled={creatingInvite || !guestName.trim()} className="h-10 rounded-lg" variant="secondary">
                  <LinkIcon className="mr-1.5 h-4 w-4" />Generate
                </Button>
              </div>
              {magicLink && (
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg bg-secondary p-2 text-xs break-all">{magicLink}</div>
                  <Button onClick={shareViaWhatsApp} className="h-11 w-full rounded-xl bg-[#25D366] text-white hover:bg-[#1ebe5a]">
                    <Share2 className="mr-2 h-4 w-4" />Send via WhatsApp
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
