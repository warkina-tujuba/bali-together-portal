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
  head: () => ({
    meta: [
      { title: "Magic Link to Connect — Group trip itineraries, one link away" },
      { name: "description", content: "Plan and share your group trip with one magic link. Flights, stays, map, itinerary and group chat — all in one private portal." },
    ],
  }),
});

function Landing() {
  const { invite } = useSearch({ from: "/" });
  const navigate = useNavigate();
  const [token, setToken] = useState(invite ?? "");

  useEffect(() => { if (invite) setToken(invite); }, [invite]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 text-white">
          <Link to="/" className="font-display text-2xl tracking-tight">Magic Link</Link>
          <Link to="/login" className="text-sm opacity-90 hover:opacity-100">Host sign in →</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(27,43,33,0.65) 0%, rgba(27,43,33,0.92) 100%), url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="mx-auto max-w-3xl px-5 pt-28 pb-28 text-center text-white sm:pt-36 sm:pb-40">
          <p className="font-sans text-xs uppercase tracking-[0.32em] opacity-80">Group trip itineraries</p>
          <h1 className="mt-5 font-display text-5xl leading-[1.02] sm:text-7xl">
            One magic link.<br />The whole crew, connected.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base opacity-90 sm:text-lg">
            Share a single link with your friends. Everyone lands inside the same trip portal — flights, villas, map, itinerary, and the group chat.
          </p>

          <Card className="mx-auto mt-10 max-w-md rounded-3xl border-0 bg-white/95 p-6 text-left text-foreground shadow-card backdrop-blur">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Got a magic link?
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
                Enter
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Hosting a trip?{" "}
              <Link to="/login" className="underline">Sign in</Link> to your portal.
            </p>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto -mt-16 grid max-w-5xl gap-4 px-5 sm:grid-cols-3">
        {[
          { n: "01", t: "Create your trip", d: "Set the destination, dates, and the vibe." },
          { n: "02", t: "Send one magic link", d: "Drop it in WhatsApp. Everyone joins in seconds." },
          { n: "03", t: "Travel together", d: "Flights, stays, map, plan — synced for all." },
        ].map((f) => (
          <Card key={f.n} className="rounded-3xl border-0 bg-card p-6 shadow-soft">
            <p className="font-mono text-xs text-muted-foreground">{f.n}</p>
            <h3 className="mt-2 font-display text-2xl">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </Card>
        ))}
      </section>

      {/* Live trip showcase */}
      <section className="mx-auto mt-20 max-w-5xl px-5 pb-24">
        <div className="grid items-center gap-8 rounded-3xl bg-secondary p-8 sm:grid-cols-2 sm:p-12">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Live on the platform</p>
            <h2 className="mt-3 font-display text-4xl">Warkina turns 30 — Bali</h2>
            <p className="mt-3 text-muted-foreground">
              A private trip portal hosted on Magic Link. Twelve friends, one villa map, one flight board, one chat.
            </p>
            <Link to="/login" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground">
              View the trip
            </Link>
          </div>
          <div
            className="aspect-[4/3] rounded-2xl bg-cover bg-center shadow-card"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=1200&q=80')" }}
          />
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8 text-center text-xs text-muted-foreground">
        Magic Link · group trip itineraries
      </footer>
    </div>
  );
}
