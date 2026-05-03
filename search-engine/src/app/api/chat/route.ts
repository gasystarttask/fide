import { NextRequest, NextResponse } from "next/server";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { HybridRetriever } from "@search/lib/hybrid-retriever";
import { getDb } from "@search/lib/mongodb";
import { registerDefaultLlmProviders } from "@search/lib/llm/providers";
import { executeWithFallback } from "@search/lib/llm/resilience";
import { rateLimit } from "@search/lib/rate-limit";
import { routeQuery } from "@search/lib/query-router";
import {
  assembleHybridContext,
  buildGroundedStreamingSystemPrompt,
  isOutOfDomainQuery,
} from "@search/lib/context-injection";

const UNKNOWN_RESPONSE = "Je ne sais pas d'après les Écritures fournies.";
const CHAT_TIMEOUT_MS = Number(process.env.LLM_CHAT_TIMEOUT_MS ?? "30000");
const CHAT_EXECUTION_TIMEOUT_MS = Number(process.env.LLM_CHAT_EXEC_TIMEOUT_MS ?? "35000");

registerDefaultLlmProviders();

const PERF_TRACE_ENABLED =
  process.env.LLM_PERF_TRACE === "true" || process.env.NODE_ENV !== "production";

type ChatPart = { type?: string; text?: string };
type ChatMessage = {
  role?: string;
  content?: string | ChatPart[];
  parts?: ChatPart[];
};

type ChatRequestBody = {
  messages?: ChatMessage[];
};

type UpstreamErrorLike = {
  message?: string;
  statusCode?: number;
  responseHeaders?: Headers | Record<string, string>;
  lastError?: UpstreamErrorLike;
  errors?: UpstreamErrorLike[];
};

function createStaticAssistantResponse(text: string): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = "unknown-response";

      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

function extractMessageText(message: ChatMessage): string {
  if (typeof message.content === "string") {
    return message.content.trim();
  }

  const partSource = Array.isArray(message.parts)
    ? message.parts
    : Array.isArray(message.content)
      ? message.content
      : [];

  return partSource
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();
}

function extractLastUserMessage(body: ChatRequestBody): string | null {
  const messages = body.messages ?? [];

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;

    const text = extractMessageText(message);
    if (text) return text;
  }

  return null;
}

function getHeaderValue(
  headers: Headers | Record<string, string> | undefined,
  key: string
): string | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    return headers.get(key) ?? undefined;
  }

  const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === key.toLowerCase());
  return entry?.[1];
}

function extractUpstreamRateLimit(error: unknown): { retryAfterSeconds: number } | null {
  const root = error as UpstreamErrorLike;
  const candidates: UpstreamErrorLike[] = [
    root,
    ...(Array.isArray(root.errors) ? root.errors : []),
    ...(root.lastError ? [root.lastError] : []),
  ];

  for (const candidate of candidates) {
    const is429 = candidate.statusCode === 429;
    const saysTooManyRequests = (candidate.message ?? "").toLowerCase().includes("too many requests");

    if (!is429 && !saysTooManyRequests) continue;

    const retryHeader = getHeaderValue(candidate.responseHeaders, "retry-after");
    const fallbackHeader = getHeaderValue(candidate.responseHeaders, "x-ratelimit-timeremaining");
    const parsed = Number(retryHeader ?? fallbackHeader);

    return {
      retryAfterSeconds: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 60,
    };
  }

  return null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function logPerf(event: string, payload: Record<string, unknown>): void {
  if (!PERF_TRACE_ENABLED) {
    return;
  }

  console.info(`[perf][chat][${event}]`, payload);
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestStartedAt = Date.now();
  const traceId = `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const rateLimitResult = rateLimit(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  if (
    !process.env.GITHUB_TOKEN &&
    !process.env.OPENAI_API_KEY &&
    !process.env.GEMINI_API_KEY &&
    !process.env.OLLAMA_BASE_URL
  ) {
    return NextResponse.json(
      { error: "Server misconfiguration: no LLM provider credentials configured." },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = extractLastUserMessage(body);
  if (!query) {
    return NextResponse.json(
      { error: "User message is required." },
      { status: 400 }
    );
  }

  if (isOutOfDomainQuery(query)) {
    return createStaticAssistantResponse(UNKNOWN_RESPONSE);
  }

  try {
    console.info("[chat][trace] start", { traceId, query });
    const routeStartedAt = Date.now();
    const routing = await routeQuery({ query });
    const routeLatencyMs = Date.now() - routeStartedAt;
    console.info("[chat][trace] routed", {
      traceId,
      intent: routing.intent,
      k: routing.k,
      vectorWeight: routing.vectorWeight,
      graphWeight: routing.graphWeight,
      bm25Weight: routing.bm25Weight,
    });
    const retrievalStartedAt = Date.now();
    const db = await getDb();
    const retriever = new HybridRetriever(db);
    const retrievalResult = await retriever.retrieve(
      query,
      routing.k,
      routing.vectorWeight,
      routing.graphWeight,
      0,
      routing.filters,
      routing.bm25Weight
    );
    const retrievalLatencyMs = Date.now() - retrievalStartedAt;

    const context = assembleHybridContext(retrievalResult.verses, retrievalResult.entityFacts);
    console.info("[chat][trace] retrieved", {
      traceId,
      verses: retrievalResult.verses.length,
      entityFacts: retrievalResult.entityFacts.length,
      references: context.references.length,
    });
    logPerf("pre-stream", {
      traceId,
      query,
      routeLatencyMs,
      retrievalLatencyMs,
      totalPreStreamLatencyMs: Date.now() - requestStartedAt,
      verses: retrievalResult.verses.length,
      entityFacts: retrievalResult.entityFacts.length,
    });
    if (!context.references.length) {
      return createStaticAssistantResponse(UNKNOWN_RESPONSE);
    }

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const textId = "chat-response";
        const streamStartedAt = Date.now();
        let firstTokenLatencyMs: number | null = null;
        let tokenEventCount = 0;
        let selectedProvider: string | null = null;
        let selectedModel: string | null = null;
        let failoverCount = 0;
        console.info("[chat][trace] stream-execute", { traceId, textId });

        writer.write({ type: "text-start", id: textId });
        try {
          const executionTimeoutMs = Number.isFinite(CHAT_EXECUTION_TIMEOUT_MS) && CHAT_EXECUTION_TIMEOUT_MS > 0
            ? CHAT_EXECUTION_TIMEOUT_MS
            : 35000;

          const execution = await withTimeout(executeWithFallback({
            clientOptions: {
              purpose: "chat",
              timeoutMs: Number.isFinite(CHAT_TIMEOUT_MS) && CHAT_TIMEOUT_MS > 0 ? CHAT_TIMEOUT_MS : 30000,
            },
            execute: async (client, provider) => {
              if (client.stream) {
                for await (const token of client.stream({
                  temperature: 0,
                  messages: [
                    { role: "system", content: buildGroundedStreamingSystemPrompt() },
                    {
                      role: "user",
                      content: [
                        `Question: ${query}`,
                        "",
                        "Context:",
                        context.text,
                      ].join("\n"),
                    },
                  ],
                })) {
                  if (firstTokenLatencyMs == null) {
                    firstTokenLatencyMs = Date.now() - streamStartedAt;
                  }
                  tokenEventCount += 1;
                  writer.write({ type: "text-delta", id: textId, delta: token });
                }
                return {
                  mode: "stream" as const,
                  provider,
                  model: null,
                };
              }

              const response = await client.complete({
                temperature: 0,
                messages: [
                  { role: "system", content: buildGroundedStreamingSystemPrompt() },
                  {
                    role: "user",
                    content: [
                      `Question: ${query}`,
                      "",
                      "Context:",
                      context.text,
                    ].join("\n"),
                  },
                ],
              });

              if (response.content) {
                if (firstTokenLatencyMs == null) {
                  firstTokenLatencyMs = Date.now() - streamStartedAt;
                }
                tokenEventCount += 1;
                writer.write({ type: "text-delta", id: textId, delta: response.content });
              }

              return {
                mode: "complete" as const,
                provider,
                model: response.model ?? null,
              };
            },
          }), executionTimeoutMs, "Chat execution");

          selectedProvider = execution.provider;
          selectedModel = execution.result.model;
          failoverCount = execution.failovers.length;
          logPerf("provider", {
            traceId,
            query,
            provider: selectedProvider,
            model: selectedModel,
            mode: execution.result.mode,
            failoverCount,
            firstTokenLatencyMs,
            totalGenerationLatencyMs: Date.now() - streamStartedAt,
            tokenEventCount,
          });
        } finally {
          logPerf("stream", {
            traceId,
            query,
            firstTokenLatencyMs,
            totalStreamLatencyMs: Date.now() - streamStartedAt,
            provider: selectedProvider,
            model: selectedModel,
            failoverCount,
            tokenEventCount,
          });
          writer.write({ type: "text-end", id: textId });
        }
      },
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    const rateLimit = extractUpstreamRateLimit(error);
    if (rateLimit) {
      const message = `Rate limit reached on GitHub Models. Retry in ${rateLimit.retryAfterSeconds}s.`;
      return NextResponse.json(
        { error: message },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    console.error("[chat] Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to stream chat response." },
      { status: 500 }
    );
  }
}
