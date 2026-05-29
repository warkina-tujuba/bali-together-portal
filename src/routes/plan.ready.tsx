import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/trip.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, MapPin, CalendarDays, Home as HomeIcon, ArrowRight, Plane, Compass } from "lucide-react";

export const Route = createFileRoute("/plan/ready")({ component: PlanReady });

function PlanReady() {
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["plan-ready"],
    queryFn: () => fetchDashboard(),
  });

  useEffect(() => {
    // safety: if no trip yet, push to plan
    if (!isLoading && !data?.trip) {
      const t = setTimeout(() => navigate({ to: "/plan" }), 500);
      return () => clearTimeout(t);
    }
  }, [data, isLoading, navigate]);

  const trip = data?.trip;
  const stays = data?.stays ?? [];

  return (
    <div className="min-h-[100dvh] bg-background px-5 pb-12 pt-12">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl">You're all set</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We've laid the foundations for your trip. Take a look around.
          </p>
        </div>

        {trip && (
          <Card className="mt-8 rounded-3xl border-0 p-6 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Your trip</p>
                <p className="font-display text-2xl leading-tight">{trip.destination}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <Row icon={<CalendarDays className="h-4 w-4" />}>
                {trip.start_date && trip.end_date
                  ? `${trip.start_date} → ${trip.end_date}`
                  : trip.duration_days
                    ? `${trip.duration_days} days · dates TBD`
                    : "Dates to set"}
              </Row>
              <Row icon={<HomeIcon className="h-4 w-4" />}>
                {stays.length ? `${stays.length} stay${stays.length === 1 ? "" : "s"} pinned` : "No stays yet"}
              </Row>
              <Row icon={<Compass className="h-4 w-4" />}>
                Starter itinerary ready to refine
              </Row>
            </div>
          </Card>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild className="h-12 rounded-xl text-base">
            <Link to="/discover">Start discovering <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl">
            <Link to="/dashboard">View your plan</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
