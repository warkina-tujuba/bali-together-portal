import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { Sparkles, MessageCircle, MapPin, Plane, CalendarDays, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { LocationMarquee } from "@/components/home/LocationMarquee";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: Landing,
  head: () => ({
    meta: [
      { title: "Travel Link — One invite for the whole trip" },
      { name: "description", content: "From Bali to Tokyo to Lisbon, plan your trip with confidence. Drop one link for your party and create together — flights, stays, and AI-built itineraries in one private portal." },
      { property: "og:title", content: "Travel Link — One invite for the whole trip" },
      { property: "og:description", content: "Plan group trips with AI-powered recommendations. Everyone lands in the same private portal." },
    ],
  }),
});

function Landing() {
  const { invite } = useSearch({ from: "/" });
  const navigate = useNavigate();
  const [token, setToken] = useState(invite ?? "");
  useEffect(() => { if (invite) setToken(invite); }, [invite]);

  const pageRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end end"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "-22%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.35, 1], [1, 0.22, 0.1]);

  return (
    <div ref={pageRef} className="relative min-h-[100dvh] bg-background">
      {/* Persistent scrolling backdrop */}
      <motion.div
        style={{ y: bgY, opacity: bgOpacity }}
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      >
        <LocationMarquee />
      </motion.div>

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-ivory sm:px-6 sm:py-5">
          <Link to="/" className="flex items-center gap-2 font-display text-lg tracking-tight text-white sm:text-xl">
            <img src={logo} alt="Travel Link" width={32} height={32} className="h-8 w-8 sm:h-9 sm:w-9" />
            <span>Travel Link</span>
          </Link>
          <Link to="/login" className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white backdrop-blur transition hover:bg-white/25 sm:px-4 sm:py-2 sm:text-xs">
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero — fits inside viewport on mobile */}
      <section className="relative isolate z-10 flex min-h-[100dvh] flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pt-20 pb-24 text-center text-white sm:px-6 sm:pt-28 sm:pb-32">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.25em] backdrop-blur sm:text-xs sm:tracking-[0.28em]"
          >
            <Sparkles className="h-3 w-3" /> Group trips, anywhere
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-4 font-display leading-[1.02] text-[clamp(2.5rem,11vw,5.5rem)] sm:mt-5"
          >
            One link.<br />The whole trip.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-4 max-w-md text-sm leading-relaxed opacity-90 sm:mt-5 sm:max-w-xl sm:text-base"
          >
            From Bali to Tokyo to Lisbon, plan your trip with confidence. Drop one link for your party to join — everyone lands in the same private portal, ready to go.
          </motion.p>

          {/* CTA card — compact on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-7 w-full max-w-md sm:mt-9"
          >
            <div className="rounded-2xl border border-white/10 bg-white/95 p-4 text-left text-foreground shadow-card backdrop-blur sm:rounded-3xl sm:p-5">
              <Button
                size="lg"
                className="h-12 w-full rounded-xl bg-accent text-base font-semibold uppercase tracking-wider text-accent-foreground hover:bg-accent/90 sm:h-14"
                onClick={() => navigate({ to: "/login" })}
              >
                Plan your trip <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> Got a magic link? <span className="h-px flex-1 bg-border" />
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="paste your invite code"
                  className="h-11 rounded-xl text-sm"
                />
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-11 rounded-xl px-4"
                  onClick={() => navigate({ to: "/login", search: { invite: token } })}
                  disabled={!token.trim()}
                >
                  Enter
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7, y: [0, 8, 0] }}
          transition={{ delay: 1, duration: 2, repeat: Infinity }}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-white motion-reduce:hidden"
        >
          Scroll
        </motion.div>
      </section>

      {/* How it works */}
      <Section className="border-t border-white/10">
        <SectionHeader eyebrow="How it works" title="Three taps from invite to trip" />
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-border sm:mt-14 sm:rounded-3xl md:grid-cols-3">
          {[
            { n: "01", icon: <CalendarDays className="h-5 w-5" />, t: "Create the event", d: "Destination, dates, vibe. Done in a minute." },
            { n: "02", icon: <MessageCircle className="h-5 w-5" />, t: "Send one link", d: "Works in email, WhatsApp — anywhere you paste a URL." },
            { n: "03", icon: <Plane className="h-5 w-5" />, t: "Travel as a crew", d: "Flights, stays, chat, AI itinerary — one portal." },
          ].map((f, i) => (
            <Reveal key={f.n} delay={i * 0.08}>
              <div className="group flex h-full flex-col gap-6 bg-background p-6 transition-colors hover:bg-secondary/40 sm:gap-8 sm:p-10">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{f.n}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/70 transition group-hover:border-accent group-hover:text-accent">
                    {f.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-2xl leading-tight sm:text-3xl">{f.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3">{f.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Inside the portal */}
      <Section>
        <SectionHeader eyebrow="Inside the portal" title="Everything your group needs, in one place" />
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Plane className="h-5 w-5" />, t: "Flight board", d: "Paste an airline confirmation — we pull out the details." },
            { icon: <MapPin className="h-5 w-5" />, t: "Villa map", d: "Drop your Airbnb or hotel link — we pin it for the crew." },
            { icon: <MessageCircle className="h-5 w-5" />, t: "Group chat", d: "A private real-time thread for everyone on the trip." },
            { icon: <Sparkles className="h-5 w-5" />, t: "AI itinerary", d: "A day-by-day plan tuned to your dates and stay." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.06}>
              <div className="border-t border-border pt-5 sm:pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">{f.icon}</div>
                <p className="mt-5 font-display text-xl sm:text-2xl">{f.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-20 flex flex-col items-center gap-5 text-center sm:mt-24">
            <p className="font-display text-3xl sm:text-5xl">Ready when your crew is.</p>
            <Link
              to="/login"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-8 text-sm font-medium uppercase tracking-[0.2em] text-accent-foreground transition hover:bg-accent/90"
            >
              Plan your trip <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </Section>

      <footer className="relative z-10 border-t border-border bg-background py-8 text-center text-xs text-muted-foreground sm:py-10">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4">
          <img src={logo} alt="" width={28} height={28} className="h-7 w-7 opacity-70" loading="lazy" />
          <p>Travel Link · one invite, the whole trip</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative z-10 bg-background ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 md:py-36">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal>
      <div className="flex flex-col gap-3 sm:gap-4">
        <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground sm:text-xs">{eyebrow}</p>
        <h2 className="max-w-3xl font-display text-3xl leading-[1.08] sm:text-5xl md:text-6xl">{title}</h2>
      </div>
    </Reveal>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
