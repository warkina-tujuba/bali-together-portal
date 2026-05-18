import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
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

  // Scroll-driven background that continues down the page
  const pageRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end end"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.35, 1], [1, 0.18, 0.08]);
  const heroParallax = useTransform(scrollYProgress, [0, 0.4], ["0%", "-12%"]);

  return (
    <div ref={pageRef} className="relative min-h-screen bg-background">
      {/* Persistent scrolling backdrop — sticks behind every section */}
      <motion.div
        style={{ y: bgY, opacity: bgOpacity }}
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      >
        <LocationMarquee />
      </motion.div>

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-white">
          <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
            <img src={logo} alt="Magic Link" width={36} height={36} className="h-9 w-9" />
            <span>Magic Link</span>
          </Link>
          <Link to="/login" className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] backdrop-blur transition hover:bg-white/25">Sign in</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate z-10 min-h-[100svh] overflow-hidden">
        <motion.div
          style={{ y: heroParallax }}
          className="relative mx-auto flex min-h-[100svh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center text-white"
        >
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-[0.28em] backdrop-blur"
          >
            <Sparkles className="h-3 w-3" /> Group trips, anywhere
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-5 font-display text-5xl leading-[1.02] sm:text-7xl"
          >
            One magic link.<br />The whole trip.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mx-auto mt-5 max-w-xl text-base opacity-90 sm:text-lg"
          >
            From Bali to Tokyo to Lisbon, plan your trip with confidence. Create and drop one link for your party to join and create together. Everyone lands in the same private portal, ready to go.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full"
          >
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
              <Button
                size="lg"
                className="mt-4 h-12 w-full rounded-xl text-base font-semibold uppercase tracking-wider"
                onClick={() => navigate({ to: "/login" })}
              >
                Plan your trip
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Already hosting? <Link to="/login" className="underline">Sign in</Link>
              </p>
            </Card>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7, y: [0, 8, 0] }}
            transition={{ delay: 1, duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em]"
          >
            Scroll
          </motion.div>
        </motion.div>
      </section>

      {/* How it works — sophisticated, minimal */}
      <Section className="border-t border-white/10">
        <SectionHeader eyebrow="How it works" title="Three taps from invite to trip" />
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-border sm:grid-cols-3">
          {[
            { n: "01", icon: <CalendarDays className="h-5 w-5" />, t: "Create the event", d: "Occasion, destination, dates, vibe. Done in a minute." },
            { n: "02", icon: <MessageCircle className="h-5 w-5" />, t: "Send one link", d: "Magic link works in email, WhatsApp — anywhere you paste a URL." },
            { n: "03", icon: <Plane className="h-5 w-5" />, t: "Travel as a crew", d: "Flights, stays, chat, AI itinerary — all in one private portal." },
          ].map((f, i) => (
            <Reveal key={f.n} delay={i * 0.08}>
              <div className="group flex h-full flex-col gap-8 bg-background p-10 transition-colors hover:bg-secondary/40">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{f.n}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/70 transition group-hover:border-primary group-hover:text-primary">
                    {f.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-3xl leading-tight">{f.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Inside the portal — minimal grid */}
      <Section>
        <SectionHeader eyebrow="Inside the portal" title="Everything your group needs, in one place" />
        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Plane className="h-5 w-5" />, t: "Flight board", d: "Paste an airline confirmation — we pull out the details." },
            { icon: <MapPin className="h-5 w-5" />, t: "Villa map", d: "Drop your Airbnb or hotel link — we pin it for the crew." },
            { icon: <MessageCircle className="h-5 w-5" />, t: "Group chat", d: "A private real-time thread for everyone on the trip." },
            { icon: <Sparkles className="h-5 w-5" />, t: "AI itinerary", d: "A day-by-day plan tuned to your dates and stay." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.06}>
              <div className="border-t border-border pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/[0.04] text-foreground">{f.icon}</div>
                <p className="mt-6 font-display text-2xl">{f.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Quiet CTA */}
        <Reveal>
          <div className="mt-24 flex flex-col items-center gap-5 text-center">
            <p className="font-display text-4xl sm:text-5xl">Ready when your crew is.</p>
            <Link
              to="/login"
              className="inline-flex h-12 items-center rounded-full bg-foreground px-8 text-sm font-medium uppercase tracking-[0.2em] text-background transition hover:bg-foreground/85"
            >
              Plan your trip
            </Link>
          </div>
        </Reveal>
      </Section>

      <footer className="relative z-10 border-t border-border bg-background py-10 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
          <img src={logo} alt="" width={28} height={28} className="h-7 w-7 opacity-70" loading="lazy" />
          <p>Magic Link · one invite, the whole trip</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative z-10 bg-background ${className}`}>
      <div className="mx-auto max-w-6xl px-5 py-28 sm:py-36">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal>
      <div className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">{eyebrow}</p>
        <h2 className="max-w-3xl font-display text-4xl leading-[1.05] sm:text-6xl">{title}</h2>
      </div>
    </Reveal>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
