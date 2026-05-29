import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

const searchSchema = z.object({ invite: z.string().optional() });

// Legacy /start path now redirects to the new /plan flow.
export const Route = createFileRoute("/_authenticated/start")({
  validateSearch: searchSchema,
  component: StartRedirect,
});

function StartRedirect() {
  const { invite } = useSearch({ from: "/_authenticated/start" });
  const navigate = useNavigate();
  useEffect(() => {
    if (invite) {
      navigate({ to: "/plan", search: { invite }, replace: true });
    } else {
      navigate({ to: "/plan", replace: true });
    }
  }, [invite, navigate]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      Redirecting to your new trip planner…
    </div>
  );
}
