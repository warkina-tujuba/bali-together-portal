import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function OptimiseDialog({
  open, onOpenChange, beforeMin, afterMin, onAccept, loading,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  beforeMin: number;
  afterMin: number;
  onAccept: () => void;
  loading?: boolean;
}) {
  const saved = Math.max(0, beforeMin - afterMin);
  function fmt(m: number) { const h = Math.floor(m / 60), mm = m % 60; return h ? `${h}h ${mm}m` : `${mm}m`; }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Optimise this day?</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Stat label="Current driving" value={fmt(beforeMin)} />
          <Stat label="Optimised" value={fmt(afterMin)} highlight={saved > 0} />
        </div>
        {saved > 0 ? (
          <p className="text-sm text-muted-foreground">You'll save about <strong className="text-foreground">{fmt(saved)}</strong> on the road. Locked host events stay in place.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Your current order is already efficient — nothing to change.</p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Keep as is</Button>
          <Button onClick={onAccept} disabled={loading || saved === 0}>
            {loading ? "Applying…" : "Accept new order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${highlight ? "border-primary bg-primary/5" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
