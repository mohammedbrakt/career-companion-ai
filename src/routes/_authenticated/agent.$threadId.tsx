import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Skeleton } from "@/components/ui/skeleton";

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

/** Thread shell. The streaming chat UI (AI Elements + tools) is the next module. */
function ThreadPage() {
  const { threadId } = Route.useParams();
  const { t, dir } = useI18n();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  const thread = useQuery({
    queryKey: ["conversation", threadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("id, title, kind").eq("id", threadId).single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-xl">
        <Link to="/agent" aria-label={t.common.back} className="flex size-9 items-center justify-center rounded-xl hover:bg-accent">
          <Back className="size-5" />
        </Link>
        <BrandMark size={28} />
        <div className="min-w-0 flex-1 truncate font-bold">
          {thread.isLoading ? <Skeleton className="h-4 w-32" /> : (thread.data?.title ?? t.agent.untitled)}
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <BrandMark size={56} className="opacity-80" />
        <h2 className="mt-4 text-lg font-extrabold">{t.agent.welcomeTitle}</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t.agent.welcomeBody}</p>
      </div>
    </div>
  );
}
