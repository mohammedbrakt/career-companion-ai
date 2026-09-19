/**
 * Lovable AI Gateway seam.
 *
 * All model access goes through here so providers/models can be swapped without
 * touching agent logic. Server-only: never import from client code.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const BASE_URL = "https://ai.gateway.lovable.dev/v1";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Models by job: capable reasoning for career work, cheap models for bulk extraction. */
export const MODELS = {
  reasoning: "openai/gpt-6-astra",
  cheap: "google/gemini-3.8-flash",
} as const;

export function getLovableApiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

export function getLovableAiGatewayRunId(request: Request): string | undefined {
  return request.headers.get(RUN_ID_HEADER) ?? undefined;
}

/** Wraps fetch so the gateway-minted run id is captured and resent. */
export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId;
  const wrapped: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input, { ...init, headers });
    const returned = response.headers.get(RUN_ID_HEADER);
    if (returned) runId = returned;
    return response;
  };
  return {
    fetch: wrapped,
    get runId() {
      return runId;
    },
  };
}

export function getLovableAiGatewayResponseHeaders(
  base?: HeadersInit,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers = new Headers(base);
  for (const [k, v] of Object.entries(extra ?? {})) headers.set(k, v);
  return Object.fromEntries(headers.entries());
}

export function withLovableAiGatewayRunIdHeader(
  response: Response,
  runIdFetch: { readonly runId?: string | undefined },
): Response {
  if (!runIdFetch.runId) return response;
  const headers = new Headers(response.headers);
  headers.set(RUN_ID_HEADER, runIdFetch.runId);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** Responses-API provider (OpenAI models, reasoning-capable). */
export function createResponsesProvider(runIdFetch: { fetch: typeof fetch }) {
  const key = getLovableApiKey();
  return createOpenAI({
    baseURL: BASE_URL,
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
}

/** Chat-completions provider for non-OpenAI (cheap extraction/classification) models. */
export function createLovableAiGatewayProvider(apiKey = getLovableApiKey()) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: BASE_URL,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}
