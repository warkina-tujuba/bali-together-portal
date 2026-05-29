import { createFileRoute } from "@tanstack/react-router";
import { placePhotoRedirect } from "@/lib/google-maps.server";

// Public proxy that resolves a Google Places photo reference to its hosted URL
// and redirects. Keeps the server API key off the client.
export const Route = createFileRoute("/api/public/place-photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const name = url.searchParams.get("name");
        const w = Math.min(1600, Math.max(100, parseInt(url.searchParams.get("w") ?? "800", 10) || 800));
        if (!name || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) {
          return new Response("Invalid name", { status: 400 });
        }
        try {
          const photoUri = await placePhotoRedirect(name, w);
          return Response.redirect(photoUri, 302);
        } catch (e) {
          return new Response(`Photo error: ${(e as Error).message}`, { status: 502 });
        }
      },
    },
  },
});
