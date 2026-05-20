import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function AddActivitySheet({
  open,
  onOpenChange,
  defaultDay,
  defaultStart,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  defaultDay: string;
  defaultStart: string; // "HH:MM"
  onSubmit: (data: {
    day_date: string;
    title: string;
    start_time: string;
    duration_min: number;
    location?: string;
    description?: string;
    cost_usd?: number;
    website_url?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        day_date: defaultDay,
        title: title.trim(),
        start_time: start,
        duration_min: duration,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        cost_usd: cost ? Number(cost) : undefined,
        website_url: url.trim() || undefined,
      });
      setTitle(""); setLocation(""); setDescription(""); setCost(""); setUrl("");
      onOpenChange(false);
    } finally { setSaving(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Add to {new Date(defaultDay).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">What</Label>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Surf lesson at Batu Bolong" className="mt-1.5 h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duration · {duration} min</Label>
              <Slider min={15} max={360} step={15} value={[duration]} onValueChange={([v]) => setDuration(v)} className="mt-4" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Where</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address or place name" className="mt-1.5 h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cost (USD)</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="20" className="mt-1.5 h-11" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Website</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="mt-1.5 h-11" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={3} placeholder="Anything the crew should know" />
          </div>
          <Button className="h-12 w-full rounded-xl text-base" onClick={submit} disabled={!title.trim() || saving}>
            {saving ? "Adding…" : "Add to plan"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
