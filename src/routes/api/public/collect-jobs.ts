/**
 * CJDE cron endpoint — runs the central collectors.
 * Public prefix, so the caller is authenticated here with a shared secret.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/collect-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CJDE_CRON_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const provided = request.headers.get("x-cjde-secret");
        if (provided !== secret) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runIngestion } = await import("@/lib/jobs/ingest.server");
        const result = await runIngestion(supabaseAdmin);
        return Response.json(result);
      },
    },
  },
});
