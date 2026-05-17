import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function EventForm({ dayDate, onAdd }: { dayDate: string; onAdd: (d: { day_date: string; title: string; start_time?: string; location?: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [loc, setLoc] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
        <Plus className="h-3.5 w-3.5" /> Add event
      </button>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        try {
          await onAdd({ day_date: dayDate, title: title.trim(), start_time: time || undefined, location: loc || undefined });
          setTitle(""); setTime(""); setLoc(""); setOpen(false);
        } finally { setBusy(false); }
      }}
      className="mt-3 space-y-2 rounded-xl bg-background p-3"
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Sunset at Uluwatu)" className="h-9 rounded-lg" />
      <div className="grid grid-cols-2 gap-2">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 rounded-lg" />
        <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Where" className="h-9 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !title.trim()} className="rounded-lg">Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} className="rounded-lg">Cancel</Button>
      </div>
    </form>
  );
}
