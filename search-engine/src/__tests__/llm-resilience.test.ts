import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearLlmProviderRegistry,
  registerLlmProvider,
} from "@search/lib/llm/factory";
import {
  classifyLlmError,
  executeWithFallback,
  isProviderCircuitOpen,
  recordProviderFailure,
  resetProviderCircuitState,
  resolveProviderOrder,
} from "@search/lib/llm/resilience";
import type { LlmClient, RegisteredLlmProvider } from "@search/lib/llm/types";

function createProvider(
  name: RegisteredLlmProvider["name"],
  behavior: () => Promise<string>
): RegisteredLlmProvider {
  const client: LlmClient = {
    async complete() {
      return {
        content: await behavior(),
        model: "test-model",
        provider: name,
      };
    },
  };

  return {
    name,
    displayName: `${name} test`,
    capabilities: {
      supportsStreaming: true,
      supportsJsonMode: true,
    },
    createClient: () => client,
  };
}

describe("llm resilience", () => {
  beforeEach(() => {
    clearLlmProviderRegistry();
    resetProviderCircuitState();
    delete process.env.LLM_FALLBACK_ORDER_CHAT;
  });

  afterEach(() => {
    clearLlmProviderRegistry();
    resetProviderCircuitState();
    delete process.env.LLM_FALLBACK_ORDER_CHAT;
  });

  it("uses env-configured provider order when present", () => {
    process.env.LLM_FALLBACK_ORDER_CHAT = "openai,gemini,ollama";

    expect(resolveProviderOrder("chat")).toEqual(["openai", "gemini", "ollama"]);
  });

  it("defaults to Gemini-first fallback order for supported workloads", () => {
    expect(resolveProviderOrder("chat")).toEqual(["gemini", "openai", "copilot", "ollama"]);
    expect(resolveProviderOrder("router")).toEqual(["gemini", "openai", "copilot", "ollama"]);
    expect(resolveProviderOrder("grounded-answer")).toEqual(["gemini", "openai", "copilot", "ollama"]);
    expect(resolveProviderOrder("extraction")).toEqual(["gemini", "openai", "copilot", "ollama"]);
  });

  it("classifies upstream rate-limit errors", () => {
    expect(classifyLlmError({ statusCode: 429 })).toBe("rate-limit");
    expect(classifyLlmError(new Error("Too many requests from upstream"))).toBe("rate-limit");
  });

  it("classifies not-found model errors as retryable server errors", () => {
    expect(classifyLlmError({ statusCode: 404 })).toBe("server-error");
    expect(classifyLlmError(new Error("Unknown model: gemini-2.5-flash"))).toBe("server-error");
  });

  it("classifies unauthorized errors as retryable server errors", () => {
    expect(classifyLlmError({ statusCode: 401 })).toBe("server-error");
    expect(classifyLlmError(new Error("401 Unauthorized"))).toBe("server-error");
  });

  it("falls back to the next provider on rate-limit failure", async () => {
    registerLlmProvider(
      createProvider("copilot", async () => {
        const error = new Error("Too many requests");
        (error as Error & { statusCode?: number }).statusCode = 429;
        throw error;
      })
    );
    registerLlmProvider(createProvider("openai", async () => "openai success"));

    const events: string[] = [];
    const result = await executeWithFallback({
      clientOptions: {
        purpose: "chat",
        model: "gpt-4o-mini",
        secrets: { githubToken: "github-token", openAIApiKey: "openai-key" },
      },
      providers: ["copilot", "openai"],
      execute: async (client) => (await client.complete({ messages: [{ role: "user", content: "hello" }] })).content,
      onFallback: (event) => events.push(`${event.from}->${event.to}:${event.errorType}`),
    });

    expect(result.provider).toBe("openai");
    expect(result.result).toBe("openai success");
    expect(events).toEqual(["copilot->openai:rate-limit"]);
  });

  it("opens the provider circuit after repeated failures", () => {
    recordProviderFailure("copilot", 2, 1_000, 10);
    expect(isProviderCircuitOpen("copilot", 10)).toBe(false);

    recordProviderFailure("copilot", 2, 1_000, 20);
    expect(isProviderCircuitOpen("copilot", 100)).toBe(true);
    expect(isProviderCircuitOpen("copilot", 1_100)).toBe(false);
  });

  it("throws when every provider fails", async () => {
    registerLlmProvider(
      createProvider("copilot", async () => {
        const error = new Error("Too many requests");
        (error as Error & { statusCode?: number }).statusCode = 429;
        throw error;
      })
    );
    registerLlmProvider(
      createProvider("openai", async () => {
        const error = new Error("provider unavailable");
        (error as Error & { statusCode?: number }).statusCode = 503;
        throw error;
      })
    );

    await expect(
      executeWithFallback({
        clientOptions: {
          purpose: "chat",
          model: "gpt-4o-mini",
          secrets: { githubToken: "github-token", openAIApiKey: "openai-key" },
        },
        providers: ["copilot", "openai"],
        execute: async (client) => (await client.complete({ messages: [{ role: "user", content: "hello" }] })).content,
      })
    ).rejects.toThrow("provider unavailable");
  });

  it("does not fail over on unknown non-retriable errors", async () => {
    registerLlmProvider(
      createProvider("copilot", async () => {
        throw new Error("missing prompt template");
      })
    );
    registerLlmProvider(createProvider("openai", async () => "should not run"));

    await expect(
      executeWithFallback({
        clientOptions: {
          purpose: "chat",
          model: "gpt-4o-mini",
          secrets: { githubToken: "github-token", openAIApiKey: "openai-key" },
        },
        providers: ["copilot", "openai"],
        execute: async (client) => (await client.complete({ messages: [{ role: "user", content: "hello" }] })).content,
      })
    ).rejects.toThrow("missing prompt template");
  });
});
