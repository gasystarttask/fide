import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearLlmProviderRegistry,
  createLlmClient,
  registerLlmProvider,
  resolveAndValidateLlmClientOptions,
} from "@search/lib/llm/factory";
import type { LlmClient, RegisteredLlmProvider } from "@search/lib/llm/types";

const envSnapshot = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  LLM_DEFAULT_PROVIDER: process.env.LLM_DEFAULT_PROVIDER,
  QUERY_ROUTER_MODEL: process.env.QUERY_ROUTER_MODEL,
  GROUNDED_ANSWER_MODEL: process.env.GROUNDED_ANSWER_MODEL,
  COPILOTE_MODEL: process.env.COPILOTE_MODEL,
  COPILOT_MODEL: process.env.COPILOT_MODEL,
};

function restoreEnv(name: keyof typeof envSnapshot, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

function createMockProvider(name: RegisteredLlmProvider["name"]): RegisteredLlmProvider {
  const client: LlmClient = {
    async complete(request) {
      return {
        content: request.messages.map((message) => message.content).join(" "),
        model: request.model ?? "mock-model",
        provider: name,
      };
    },
  };

  return {
    name,
    displayName: `${name} mock`,
    capabilities: {
      supportsStreaming: true,
      supportsJsonMode: true,
    },
    createClient: () => client,
  };
}

describe("llm factory", () => {
  beforeEach(() => {
    clearLlmProviderRegistry();
    delete process.env.GITHUB_TOKEN;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.LLM_DEFAULT_PROVIDER;
    delete process.env.QUERY_ROUTER_MODEL;
    delete process.env.GROUNDED_ANSWER_MODEL;
    delete process.env.COPILOTE_MODEL;
    delete process.env.COPILOT_MODEL;
  });

  afterEach(() => {
    clearLlmProviderRegistry();
    restoreEnv("GITHUB_TOKEN", envSnapshot.GITHUB_TOKEN);
    restoreEnv("OPENAI_API_KEY", envSnapshot.OPENAI_API_KEY);
    restoreEnv("GEMINI_API_KEY", envSnapshot.GEMINI_API_KEY);
    restoreEnv("OLLAMA_BASE_URL", envSnapshot.OLLAMA_BASE_URL);
    restoreEnv("LLM_DEFAULT_PROVIDER", envSnapshot.LLM_DEFAULT_PROVIDER);
    restoreEnv("QUERY_ROUTER_MODEL", envSnapshot.QUERY_ROUTER_MODEL);
    restoreEnv("GROUNDED_ANSWER_MODEL", envSnapshot.GROUNDED_ANSWER_MODEL);
    restoreEnv("COPILOTE_MODEL", envSnapshot.COPILOTE_MODEL);
    restoreEnv("COPILOT_MODEL", envSnapshot.COPILOT_MODEL);
  });

  it("resolves legacy extraction model aliases", () => {
    process.env.GITHUB_TOKEN = "github-token";
    process.env.COPILOTE_MODEL = "gpt-4o-mini-custom";

    const resolved = resolveAndValidateLlmClientOptions({
      purpose: "extraction",
      provider: "copilot",
    });

    expect(resolved.model).toBe("gpt-4o-mini-custom");
    expect(resolved.secrets.githubToken).toBe("github-token");
  });

  it("uses purpose-specific legacy router model env", () => {
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.QUERY_ROUTER_MODEL = "gpt-4.1-mini";

    const resolved = resolveAndValidateLlmClientOptions({
      purpose: "router",
      provider: "openai",
    });

    expect(resolved.model).toBe("gpt-4.1-mini");
  });

  it("throws when required copilot secret is missing", () => {
    expect(() =>
      resolveAndValidateLlmClientOptions({
        purpose: "chat",
        provider: "copilot",
      })
    ).toThrow("Missing required secret githubToken for provider copilot.");
  });

  it("creates a client from the registered provider", async () => {
    process.env.OPENAI_API_KEY = "openai-key";
    registerLlmProvider(createMockProvider("openai"));

    const client = await createLlmClient({
      purpose: "chat",
      provider: "openai",
      model: "gpt-4o-mini",
    });

    const response = await client.complete({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.provider).toBe("openai");
    expect(response.content).toBe("hello");
  });

  it("selects the default provider from env when provider is omitted", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.LLM_DEFAULT_PROVIDER = "gemini";
    registerLlmProvider(createMockProvider("gemini"));

    const client = await createLlmClient({
      purpose: "chat",
      model: "gemini-2.0-flash",
    });

    const response = await client.complete({
      messages: [{ role: "user", content: "bonjour" }],
    });

    expect(response.provider).toBe("gemini");
  });

  it("defaults to Gemini 2.5 when provider and model are omitted", () => {
    process.env.GEMINI_API_KEY = "gemini-key";

    const resolved = resolveAndValidateLlmClientOptions({
      purpose: "chat",
    });

    expect(resolved.provider).toBe("gemini");
    expect(resolved.model).toBe("gemini-2.5-flash");
  });

  it("infers the provider from explicit secrets when provider is omitted", async () => {
    registerLlmProvider(createMockProvider("openai"));

    const client = await createLlmClient({
      purpose: "chat",
      secrets: { openAIApiKey: "openai-key" },
      model: "gpt-4o-mini",
    });

    const response = await client.complete({
      messages: [{ role: "user", content: "salut" }],
    });

    expect(response.provider).toBe("openai");
  });

  it("throws when no provider adapter is registered", async () => {
    process.env.GITHUB_TOKEN = "github-token";

    await expect(
      createLlmClient({
        purpose: "chat",
        provider: "copilot",
      })
    ).rejects.toThrow("No LLM provider registered for copilot.");
  });
});
