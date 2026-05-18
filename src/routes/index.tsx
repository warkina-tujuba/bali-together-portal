import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { z } from "zod";
import { Sparkles, MessageCircle, MapPin, Plane, CalendarDays } from "lucide-react";
import logo from "@/assets/logo.png";
import { LocationMarquee } from "@/components/home/LocationMarquee";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: Landing,
  head: () => ({
    meta: [
      { title: "Magic Link — One invite for the whole trip" },
      { name: "description", content: "Send one magic link. Your crew opens it, picks their hero, adds their flight and stay — and your whole group trip lives in one private portal." },
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-white">
          <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
            <img src={logo} alt="Magic Link" width={36} height={36} className="h-9 w-9" />
            <span>Magic Link</span>
          </Link>
          <Link to="/login" className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] backdrop-blur transition hover:bg-white/25">Sign in</Link>
        </div>
      </header>

      {/* Hero — sliding global locations */}
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <LocationMarquee />
        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-[0.28em] backdrop-blur">
            <Sparkles className="h-3 w-3" /> Group trips, anywhere
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[1.02] sm:text-7xl">
            One magic link.<br />The whole trip.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base opacity-90 sm:text-lg">
            From Bali to Tokyo to Lisbon, plan your trip with confidence. Create and drop one link for your party to join and create together. Everyone lands in the same private portal, ready to go.
          </p>

          <Card className="mx-auto mt-9 w-full max-w-md rounded-3xl border-0 bg-white/95 p-5 text-left text-foreground shadow-card backdrop-blur">
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
                className="h-12 rounded-xl px-5 text-base"
                onClick={() => navigate({ to: "/login", search: { invite: token } })}
                disabled={!token.trim()}
              >
                Enter
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Hosting a trip? <Link to="/login" className="underline">Sign in</Link> to your portal.
            </p>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">How it works</p>
        <h2 className="mt-2 text-center font-display text-4xl sm:text-5xl">Three taps from invite to trip</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", icon: <CalendarDays className="h-5 w-5" />, t: "Create the event", d: "Occasion, destination, dates, vibe. Add a cover photo. Done in a minute." },
            { n: "02", icon: <MessageCircle className="h-5 w-5" />, t: "Send one link", d: "Magic link works in email, WhatsApp, Messages — anywhere you can paste a URL." },
            { n: "03", icon: <Plane className="h-5 w-5" />, t: "Travel as a crew", d: "Flight board, villa map, group chat, AI itinerary — under one private portal." },
          ].map((f) => (
            <Card key={f.n} className="rounded-3xl border-0 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{f.icon}</div>
                <p className="font-mono text-xs text-muted-foreground">{f.n}</p>
              </div>
              <h3 className="mt-4 font-display text-2xl">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* What's in the portal */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <div className="rounded-3xl bg-secondary p-8 sm:p-12">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Inside the portal</p>
          <h2 className="mt-2 font-display text-4xl sm:text-5xl">Everything your group needs, in one place</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Plane className="h-5 w-5" />, t: "Flight board", d: "Paste your airline confirmation — we'll pull out the details." },
              { icon: <MapPin className="h-5 w-5" />, t: "Villa map", d: "Drop your Airbnb or hotel link — we pin it for the crew." },
              { icon: <MessageCircle className="h-5 w-5" />, t: "Group chat", d: "A private real-time chat for everyone on the trip." },
              { icon: <Sparkles className="h-5 w-5" />, t: "AI itinerary", d: "A day-by-day plan generated from your dates and stay." },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl bg-background p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{f.icon}</div>
                <p className="mt-4 font-display text-xl">{f.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live trip showcase */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid items-center gap-8 rounded-3xl border border-border p-8 sm:grid-cols-2 sm:p-12">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Live on the platform</p>
            <h2 className="mt-3 font-display text-4xl">Warkina turns 30 — Bali</h2>
            <p className="mt-3 text-muted-foreground">
              A private trip portal hosted on Magic Link. Twelve friends, one villa map, one flight board, one group chat. One link sent.
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
        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
          <img src={logo} alt="" width={28} height={28} className="h-7 w-7 opacity-70" loading="lazy" />
          <p>Magic Link · one invite, the whole trip</p>
        </div>
      </footer>
    </div>
  );
}
