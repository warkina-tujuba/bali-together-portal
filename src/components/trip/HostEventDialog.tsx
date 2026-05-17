import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { createHostEvent } from "@/lib/trip.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Crown } from "lucide-react";

export function HostEventDialog({ defaultDate, trigger }: { defaultDate: string; trigger?: React.ReactNode }) {
  const create = useServerFn(createHostEvent);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("19:00");
  const [end, setEnd] = useState("22:00");
  const [loc, setLoc] = useState("");
  const [desc, setDesc] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setBusy(true);
    try {
      await create({ data: {
        day_date: date,
        title: title.trim(),
        start_time: start || null,
        end_time: end || null,
        location: loc || null,
        description: desc || null,
        booking_url: bookingUrl || null,
        category: "activity",
      }});
      toast.success("Host event added — everyone can see it");
      qc.invalidateQueries({ queryKey: ["itineraryHome"] });
      setOpen(false);
      setTitle(""); setLoc(""); setDesc(""); setBookingUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add event");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="rounded-full">
            <Crown className="mr-2 h-4 w-4" /> Host an event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Host an event</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Blocks out the time slot. Crew can RSVP.</p>
        <form onSubmit={submit} className="mt-2 space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Birthday dinner at La Brisa" className="mt-1 h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">Start</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Where</Label>
            <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Venue or address" className="mt-1 h-11 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Booking link (optional)</Label>
            <Input value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://…" className="mt-1 h-11 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Dress code, what to bring…" className="mt-1 rounded-xl" rows={2} />
          </div>
          <Button type="submit" disabled={busy || !title.trim()} className="h-11 w-full rounded-xl">
            <Crown className="mr-2 h-4 w-4" /> {busy ? "Adding…" : "Add as host event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
