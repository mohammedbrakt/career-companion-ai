import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentChat } from "@/components/agent/AgentChat";

export const Route = createFileRoute("/_authenticated/agent/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — Shoghlni | شغلني" },
      { name: "description", content: "A conversation with your AI career agent." },
      { property: "og:title", content: "Conversation — Shoghlni" },
      { property: "og:description", content: "Chat with your AI career agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { t, dir } = useI18n();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  const thread = useQuery({
    queryKey: ["conversation", threadId],
    queryFn: async () => {
      const [conv, msgs] = await Promise.all([
        supabase.from("conversations").select("id, title, kind").eq("id", threadId).single(),
        supabase.from("messages").select("id, role, parts, client_message_id, created_at").eq("conversation_id", threadId).order("created_at"),
      ]);
      if (conv.error) throw conv.error;
      if (msgs.error) throw msgs.error;
      const history: UIMessage[] = (msgs.data ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.client_message_id ?? m.id,
          role: m.role as "user" | "assistant",
          parts: (Array.isArray(m.parts) ? m.parts : []) as UIMessage["parts"],
        }));
      return { conversation: conv.data, history };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-xl">
        <Link to="/agent" aria-label={t.common.back} className="flex size-9 items-center justify-center rounded-xl hover:bg-accent">
          <Back className="size-5" />
        </Link>
        <BrandMark size={28} />
        <div className="min-w-0 flex-1 truncate font-bold">
          {thread.isLoading ? <Skeleton className="h-4 w-32" /> : (thread.data?.conversation?.title ?? t.agent.untitled)}
        </div>
      </header>

      {thread.isLoading ? (
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <AgentChat key={threadId} threadId={threadId} initialMessages={thread.data?.history ?? []} />
      )}
    </div>
  );
}
