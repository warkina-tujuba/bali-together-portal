import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FlightSmartForm } from "@/components/trip/FlightSmartForm";

type Initial = {
  airline?: string | null;
  airline_iata?: string | null;
  flight_number?: string | null;
  scheduled_at?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
};

export function FlightDialog({
  trigger,
  initial,
  defaultDate,
}: {
  trigger: React.ReactNode;
  initial?: Initial;
  defaultDate?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Your flight</DialogTitle>
        </DialogHeader>
        <FlightSmartForm
          initial={initial}
          defaultDate={defaultDate ?? null}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
