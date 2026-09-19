import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import {
  Briefcase,
  Brain,
  FileText,
  ListChecks,
  Search,
  Target,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";

const TOOL_ICONS: Record<string, typeof Wrench> = {
  get_career_profile: UserRound,
  update_career_profile: UserRound,
  set_career_preferences: ListChecks,
  propose_target_roles: Target,
  remember_fact: Brain,
  search_jobs: Search,
  get_job_details: Briefcase,
  save_job: Briefcase,
  hide_job: Briefcase,
  mark_interested: Briefcase,
  get_applications: ListChecks,
  set_agent_state: FileText,
};

type Props = { threadId: string; initialMessages: UIMessage[] };

export function AgentChat({ threadId, initialMessages }: Props) {
  const { t, locale } = useI18n();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({ threadId, locale }),
      }),
    [threadId, locale],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (error) => toast.error(error.message || t.auth.genericError),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, threadId]);

  async function submit(message: PromptInputMessage) {
    const text = (message.text ?? input).trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  async function quickSend(text: string) {
    if (busy) return;
    await sendMessage({ text });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<BrandMark size={52} />}
              title={t.agent.welcomeTitle}
              description={t.agent.welcomeBody}
            >
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {t.agent.suggestions.map((s) => (
                  <Button key={s} variant="outline" className="rounded-full" onClick={() => quickSend(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent
                  className={message.role === "assistant" ? "bg-transparent p-0 text-foreground" : undefined}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <MessageResponse key={i}>{part.text}</MessageResponse>;
                    }
                    if (part.type === "reasoning" && part.text) {
                      return (
                        <p key={i} className="text-xs italic text-muted-foreground">
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      const toolPart = part as never as {
                        type: string;
                        state: "input-streaming" | "input-available" | "output-available" | "output-error";
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      const name = toolPart.type.replace(/^tool-/, "");
                      const Icon = TOOL_ICONS[name] ?? Wrench;
                      return (
                        <Tool key={i} defaultOpen={false} className="my-2">
                          <ToolHeader
                            type={toolPart.type as `tool-${string}`}
                            state={toolPart.state}
                            icon={<Icon className="size-4 text-primary" />}
                            title={name.replace(/_/g, " ")}
                          />
                          <ToolContent>
                            <ToolInput input={toolPart.input} />
                            <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}

          {status === "submitted" ? (
            <Message from="assistant">
              <MessageContent className="bg-transparent p-0">
                <Shimmer>{t.agent.thinking}</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border/60 bg-card/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput onSubmit={submit} className="rounded-2xl">
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.agent.placeholder}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={!input.trim() && !busy} onClick={busy ? () => stop() : undefined} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
