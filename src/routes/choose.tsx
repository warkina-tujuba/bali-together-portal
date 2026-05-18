import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Users, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/choose")({ component: ChoosePage });

function ChoosePage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
      else setReady(true);
    });
  }, [navigate]);

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-8 flex items-center gap-2 font-display text-xl">
          <img src={logo} alt="" className="h-8 w-8" />Magic Link
        </Link>

        <h1 className="font-display text-4xl sm:text-5xl">What brings you here?</h1>
        <p className="mt-2 text-muted-foreground">Start a new trip, or jump into one a friend invited you to.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link to="/start">
            <Card className="group h-full cursor-pointer rounded-3xl border-0 p-7 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-2xl">Create a trip</h2>
              <p className="mt-1 text-sm text-muted-foreground">Plan the dates, drop a pin, draft a day plan, then share one link.</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">Start a trip <ArrowRight className="h-4 w-4" /></span>
            </Card>
          </Link>

          <Card className="rounded-3xl border-0 p-7 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-2xl">Join a trip</h2>
            <p className="mt-1 text-sm text-muted-foreground">Paste your magic link or invite code.</p>
            <form
              className="mt-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const t = extractToken(token);
                if (!t) return;
                navigate({ to: "/start", search: { invite: t } });
              }}
            >
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste link or code…" className="h-11 rounded-xl" />
              <Button type="submit" disabled={!extractToken(token)} className="h-11 w-full rounded-xl">Continue</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function extractToken(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const url = new URL(t);
    const fromQuery = url.searchParams.get("invite");
    if (fromQuery) return fromQuery;
  } catch { /* not a URL */ }
  if (/^[A-Za-z0-9]{8,}$/.test(t)) return t;
  return null;
}
