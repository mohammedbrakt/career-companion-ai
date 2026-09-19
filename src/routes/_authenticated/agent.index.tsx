import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatDate } from "@/lib/i18n/context";
import { conversationsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandMark } from "@/components/brand/BrandMark";

export const Route = createFileRoute("/_authenticated/agent/")({
  head: () => ({
    meta: [
      { title: "AI Agent — Shoghlni | شغلني" },
      { name: "description", content: "Talk to your personal AI career agent." },
      { property: "og:title", content: "AI Agent — Shoghlni" },
      { property: "og:description", content: "Your conversations with your AI career agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentIndex,
});

function AgentIndex() {
  const { user } = Route.useRouteContext();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const threads = useQuery(conversationsQuery(user.id));

  async function newThread(kind: "general" | "onboarding" = "general") {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, kind, title: null })
      .select("id")
      .single();
    if (error || !data) {
      toast.error(t.auth.genericError);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
    navigate({ to: "/agent/$threadId", params: { threadId: data.id } });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t.agent.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.agent.threads}</p>
        </div>
        <Button onClick={() => newThread()} className="h-11 rounded-2xl">
          <MessageSquarePlus className="size-4" /> {t.agent.newChat}
        </Button>
      </header>

      {threads.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : threads.data && threads.data.length > 0 ? (
        <ul className="space-y-2">
          {threads.data.map((c) => (
            <li key={c.id}>
              <Link to="/agent/$threadId" params={{ threadId: c.id }} className="surface-card flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-agent-soft text-primary"><MessageSquareText className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.title ?? t.agent.untitled}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(c.last_message_at ?? c.created_at, locale)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="navy-panel flex flex-col items-center p-8 text-center animate-fade-up">
          <BrandMark size={64} />
          <h2 className="mt-4 text-xl font-extrabold">{t.agent.welcomeTitle}</h2>
          <p className="mt-2 max-w-sm text-sm text-navy-foreground/80">{t.agent.welcomeBody}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {t.agent.suggestions.map((s) => (
              <button key={s} type="button" onClick={() => newThread("onboarding")} className="rounded-full border border-navy-foreground/20 px-3.5 py-1.5 text-xs font-semibold text-navy-foreground hover:bg-navy-foreground/10">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
