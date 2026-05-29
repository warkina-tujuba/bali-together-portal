import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

const searchSchema = z.object({
  invite: z.string().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/plan/auth")({
  validateSearch: searchSchema,
  component: PlanAuth,
});

function PlanAuth() {
  const { invite, next } = useSearch({ from: "/plan/auth" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const dest = invite ? `/start?invite=${invite}` : (next ?? "/plan/profile");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: dest });
    });
  }, [navigate, dest]);

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${dest}`,
      });
      if (result.error) throw new Error(result.error.message ?? "Google sign-in failed");
      if (result.redirected) return;
      navigate({ to: dest });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
      <Card className="w-full max-w-md rounded-3xl border-0 p-8 shadow-card">
        <div className="flex items-center gap-2 font-display text-xl">
          <img src={logo} alt="" className="h-8 w-8" /> Travel Link
        </div>
        <h1 className="mt-6 font-display text-3xl sm:text-4xl">Save your trip</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One tap with Google — we'll keep your draft, your photo, and your crew together.
        </p>

        <Button
          onClick={handleGoogle}
          disabled={loading}
          variant="outline"
          className="mt-6 h-12 w-full rounded-xl border-border bg-background text-base font-medium"
        >
          <svg className="mr-2.5 h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.2 5.2C41.6 35.4 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          Continue with Google
        </Button>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Your draft is saved locally — it'll be there when you come back.
        </p>
      </Card>
    </div>
  );
}
