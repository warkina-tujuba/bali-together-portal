import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // SSR-safe: only check on client; on server we just render and let client handle redirect
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthShell,
});

function AuthShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
      else setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  const hideNav = location.pathname.startsWith("/onboarding");

  return (
    <div className="min-h-screen bg-background pb-24">
      {!hideNav && <TopNav />}
      <Outlet />
      {!hideNav && <BottomBar />}
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link to="/dashboard" className="font-display text-xl">Warkina Bali</Link>
        <button onClick={() => supabase.auth.signOut()} className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
      </div>
    </header>
  );
}

function BottomBar() {
  const items = [
    { to: "/dashboard", label: "Trip" },
    { to: "/map", label: "Map" },
    { to: "/itinerary", label: "Plan" },
    { to: "/admin", label: "Host" },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {items.map((i) => (
          <Link key={i.to} to={i.to} className="flex-1 rounded-2xl py-3 text-center text-sm font-medium text-muted-foreground transition [&.active]:text-primary" activeProps={{ className: "active" }}>
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
