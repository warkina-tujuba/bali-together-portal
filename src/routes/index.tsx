import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { z } from "zod";
import { Sparkles, MessageCircle, MapPin, Users, Plane, CalendarDays } from "lucide-react";
import logo from "@/assets/logo.png";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: Landing,
  head: () => ({
    meta: [
      { title: "Magic Link — One invite for the whole trip" },
      { name: "description", content: "Send one magic link. Your crew opens it, picks their hero, adds their flight and stay, and the whole trip is live in one private portal. Like a Facebook event — for travel." },
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
            <img src={logo} alt="Magic Link" width={36} height={36} className="h-9 w-9 rounded-lg bg-white/95 p-1 shadow-soft" />
            <span>Magic Link</span>
          </Link>
          <Link to="/login" className="text-sm opacity-90 hover:opacity-100">Host sign in →</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(15,30,24,0.55) 0%, rgba(15,30,24,0.92) 100%), url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="mx-auto max-w-3xl px-5 pt-24 pb-24 text-center text-white sm:pt-32 sm:pb-32">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-[0.28em] backdrop-blur">
            <Sparkles className="h-3 w-3" /> Group trip invites
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[1.02] sm:text-7xl">
            One magic link.<br />The whole trip.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base opacity-90 sm:text-lg">
            Plan your group escape like a Facebook event — occasion, dates, vibe — then drop a single link in email or WhatsApp. Everyone lands in the same portal, ready to go.
          </p>

          <Card className="mx-auto mt-9 max-w-md rounded-3xl border-0 bg-white/95 p-5 text-left text-foreground shadow-card backdrop-blur">
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
              Hosting a trip? <Link to="/login" className="underline">Sign in</Link> to your portal.
            </p>
          </Card>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto -mt-12 grid max-w-5xl gap-4 px-5 sm:grid-cols-3">
        {[
          { icon: <CalendarDays className="h-5 w-5" />, t: "Event-style invites", d: "Set the occasion, dates and description. Like creating a Facebook event — built for travel." },
          { icon: <MessageCircle className="h-5 w-5" />, t: "Share anywhere", d: "Email it, paste it in WhatsApp, drop it in a group chat. Every link is private to your crew." },
          { icon: <Sparkles className="h-5 w-5" />, t: "Pick your hero", d: "Guests choose a Marvel, DC or Pokémon avatar — and the whole trip feels like a crew, not a spreadsheet." },
        ].map((f) => (
          <Card key={f.t} className="rounded-3xl border-0 bg-card p-6 shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{f.icon}</div>
            <h3 className="mt-4 font-display text-2xl">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </Card>
        ))}
      </section>

      {/* How it works */}
      <section className="mx-auto mt-20 max-w-5xl px-5">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">How it works</p>
        <h2 className="mt-2 text-center font-display text-4xl sm:text-5xl">Three taps from invite to trip</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", t: "Create the event", d: "Occasion, destination, dates, vibe. Add a cover photo. Done in a minute." },
            { n: "02", t: "Send one link", d: "Magic link works in email, WhatsApp, Messages — anywhere you can paste a URL." },
            { n: "03", t: "Travel as a crew", d: "Flights board, villa map, AI itinerary, group chat — all under one private portal." },
          ].map((f) => (
            <Card key={f.n} className="rounded-3xl border-0 bg-card p-6 shadow-soft">
              <p className="font-mono text-xs text-muted-foreground">{f.n}</p>
              <h3 className="mt-2 font-display text-2xl">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* What's in the portal */}
      <section className="mx-auto mt-20 max-w-5xl px-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Plane className="h-4 w-4" />, t: "Flight board", d: "Everyone's arrivals on one timeline." },
            { icon: <MapPin className="h-4 w-4" />, t: "Villa map", d: "Pin who's staying where." },
            { icon: <Users className="h-4 w-4" />, t: "The crew", d: "Heroes, dietary, room prefs." },
            { icon: <Sparkles className="h-4 w-4" />, t: "AI itinerary", d: "Day-by-day plan from your dates." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">{f.icon}</div>
              <p className="mt-3 font-medium">{f.t}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live trip showcase */}
      <section className="mx-auto mt-20 max-w-5xl px-5 pb-24">
        <div className="grid items-center gap-8 rounded-3xl bg-secondary p-8 sm:grid-cols-2 sm:p-12">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Live on the platform</p>
            <h2 className="mt-3 font-display text-4xl">Warkina turns 30 — Bali</h2>
            <p className="mt-3 text-muted-foreground">
              A private trip portal hosted on Magic Link. Twelve friends, one villa map, one flight board, one chat. One link sent in WhatsApp.
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
