import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { z } from "zod";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: Landing,
});

function Landing() {
  const { invite } = useSearch({ from: "/" });
  const navigate = useNavigate();
  const [token, setToken] = useState(invite ?? "");

  useEffect(() => { if (invite) setToken(invite); }, [invite]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(27,43,33,0.55) 0%, rgba(27,43,33,0.85) 100%), url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="mx-auto max-w-3xl px-5 pt-20 pb-28 text-center text-white sm:pt-28 sm:pb-36">
          <p className="font-sans text-sm uppercase tracking-[0.3em] opacity-80">Private trip portal</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] sm:text-6xl">Warkina turns 30 in Bali</h1>
          <p className="mt-5 text-base opacity-90 sm:text-lg">
            One link, one place — your flight, your villa, our map, the group chat.
          </p>

          <Card className="mx-auto mt-10 max-w-md rounded-3xl border-0 bg-white/95 p-6 text-left text-foreground shadow-card backdrop-blur">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Invite code
            </label>
            <div className="mt-2 flex gap-2">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="paste your invite code"
                className="h-12 rounded-xl text-base"
              />
              <Button
                size="lg"
                className="h-12 rounded-xl bg-primary px-5 text-base"
                onClick={() => navigate({ to: "/login", search: { invite: token } })}
                disabled={!token.trim()}
              >
                Open
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              No invite?{" "}
              <Link to="/login" className="underline">Sign in</Link> if you've been here before.
            </p>
          </Card>
        </div>
      </div>

      {/* Features */}
      <section className="mx-auto -mt-16 grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-3">
        {[
          { t: "Flights, together", d: "See everyone's arrivals on one board." },
          { t: "Stay map", d: "Find your villa and your friends' villas." },
          { t: "Day-by-day", d: "Sunrise hikes, dinners, surf — all here." },
        ].map((f) => (
          <Card key={f.t} className="rounded-3xl border-0 bg-card p-6 shadow-soft">
            <h3 className="font-display text-2xl">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
