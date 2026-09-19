/**
 * Streaming AI Agent endpoint.
 * Frontend → this route → Lovable AI Gateway (Responses API) → tools → database.
 */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import {
  createLovableAiGatewayRunIdFetch,
  createResponsesProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  MODELS,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { buildSystemPrompt, type AgentSnapshot } from "@/lib/agent/persona.server";
import { createAgentTools } from "@/lib/agent/tools.server";
import { getUserFromRequest } from "@/lib/agent/request-auth.server";

type Body = { messages?: UIMessage[]; threadId?: string; locale?: "ar" | "en" };

function textOf(message: UIMessage): string {
  return message.parts
    .map((p) => ("text" in p && typeof p.text === "string" ? p.text : ""))
    .join(" ")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const { messages, threadId } = body;
        const locale = body.locale === "en" ? "en" : "ar";
        if (!Array.isArray(messages) || !threadId) {
          return new Response("messages and threadId are required", { status: 400 });
        }

        const auth = await getUserFromRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { supabase, userId } = auth;

        const { data: thread } = await supabase
          .from("conversations")
          .select("id, title")
          .eq("id", threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!thread) return new Response("Conversation not found", { status: 404 });

        // ---- Career Brain snapshot (structured memory, not raw chat logs) ----
        const [profileRes, prefsRes, targetsRes, skillsRes, memoryRes, cvRes, stateRes] = await Promise.all([
          supabase.from("profiles").select("full_name, headline, city, country, years_experience, seniority").eq("user_id", userId).maybeSingle(),
          supabase.from("career_preferences").select("target_countries, target_cities, work_arrangements, salary_min, salary_max, salary_currency, match_threshold").eq("user_id", userId).maybeSingle(),
          supabase.from("career_targets").select("title, kind").eq("user_id", userId).neq("status", "removed"),
          supabase.from("user_skills").select("name").eq("user_id", userId).limit(40),
          supabase.from("career_memory").select("key, value").eq("user_id", userId).limit(40),
          supabase.from("cvs").select("id").eq("user_id", userId).is("deleted_at", null).limit(1),
          supabase.from("agent_states").select("state").eq("user_id", userId).maybeSingle(),
        ]);

        const snapshot: AgentSnapshot = {
          locale,
          state: stateRes.data?.state ?? "NEW_USER",
          fullName: profileRes.data?.full_name ?? null,
          headline: profileRes.data?.headline ?? null,
          city: profileRes.data?.city ?? null,
          country: profileRes.data?.country ?? null,
          yearsExperience: profileRes.data?.years_experience ? Number(profileRes.data.years_experience) : null,
          seniority: profileRes.data?.seniority ?? null,
          hasCv: (cvRes.data?.length ?? 0) > 0,
          targets: (targetsRes.data ?? []).map((t) => ({ kind: t.kind, title: t.title })),
          skills: (skillsRes.data ?? []).map((s) => s.name),
          memory: (memoryRes.data ?? []).map((m) => ({ key: m.key, value: JSON.stringify(m.value) })),
          preferences: prefsRes.data ?? null,
        };

        // ---- Persist the incoming user message ----
        const last = messages[messages.length - 1];
        if (last?.role === "user") {
          await supabase.from("messages").upsert(
            { conversation_id: threadId, user_id: userId, role: "user", parts: last.parts as never, client_message_id: last.id },
            { onConflict: "conversation_id,client_message_id" },
          );
          const title = thread.title ?? (textOf(last).slice(0, 60) || null);
          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString(), title })
            .eq("id", threadId);
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);

        let lovable: ReturnType<typeof createResponsesProvider>;
        try {
          lovable = createResponsesProvider(runIdFetch);
        } catch {
          return new Response("AI is not configured", { status: 503 });
        }

        const result = streamText({
          model: lovable.responses(MODELS.reasoning),
          system: buildSystemPrompt(snapshot),
          messages: await convertToModelMessages(messages),
          tools: createAgentTools(supabase, userId),
          stopWhen: stepCountIs(50),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              store: false,
              include: ["reasoning.encrypted_content"],
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages,
            sendReasoning: true,
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
            onFinish: async ({ responseMessage }) => {
              const { error } = await supabase.from("messages").upsert(
                {
                  conversation_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  parts: responseMessage.parts as never,
                  client_message_id: responseMessage.id,
                },
                { onConflict: "conversation_id,client_message_id" },
              );
              if (error) console.error("[agent] failed to persist assistant message", error.message);
              await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});
