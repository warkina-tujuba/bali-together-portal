import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Compass, Map as MapIcon, CalendarDays, Heart, MessageCircle, User, LogOut, Crown, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
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

  const hideNav = location.pathname.startsWith("/start");

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background pb-24">
      {!hideNav && <TopNav />}
      <Outlet />
      {!hideNav && <BottomBar />}
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <Sheet>
          <SheetTrigger className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-secondary">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">Travel Link</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1 text-sm">
              <MenuLink to="/dashboard" icon={<CalendarDays className="h-4 w-4" />}>My plan</MenuLink>
              <MenuLink to="/discover" icon={<Compass className="h-4 w-4" />}>Discover</MenuLink>
              <MenuLink to="/map" icon={<MapIcon className="h-4 w-4" />}>Map</MenuLink>
              <MenuLink to="/saved" icon={<BookmarkCheck className="h-4 w-4" />}>Saved</MenuLink>
              <MenuLink to="/chat" icon={<MessageCircle className="h-4 w-4" />}>Chat</MenuLink>
              <div className="my-2 h-px bg-border" />
              <MenuLink to="/admin" icon={<Crown className="h-4 w-4" />}>Host mode</MenuLink>
              <MenuLink to="/start" icon={<User className="h-4 w-4" />}>Profile &amp; trip</MenuLink>
              <button
                onClick={() => supabase.auth.signOut()}
                className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/discover" className="font-display text-lg tracking-tight sm:text-xl">Travel Link</Link>

        <Link to="/start" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/70">
          <User className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

function MenuLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground transition hover:bg-secondary [&.active]:bg-secondary [&.active]:font-medium"
      activeProps={{ className: "active" }}
    >
      {icon} {children}
    </Link>
  );
}

function BottomBar() {
  const items = [
    { to: "/discover", label: "Discover", icon: Compass },
    { to: "/map", label: "Map", icon: MapIcon },
    { to: "/dashboard", label: "Plan", icon: CalendarDays },
    { to: "/saved", label: "Saved", icon: Heart },
    { to: "/chat", label: "Chat", icon: MessageCircle },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-1 py-1">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <Link
              key={i.to}
              to={i.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium text-muted-foreground transition",
                "[&.active]:text-primary",
              )}
              activeProps={{ className: "active" }}
            >
              <Icon className="h-[18px] w-[18px]" />
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
