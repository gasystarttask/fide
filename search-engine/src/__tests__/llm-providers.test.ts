import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { clearLlmProviderRegistry, createLlmClient, listRegisteredLlmProviders } from "@search/lib/llm/factory";
import {
  registerDefaultLlmProviders,
  resetDefaultLlmProvidersRegistration,
} from "@search/lib/llm/providers";

const createMock = vi.fn();

vi.mock("openai", () => {
  const OpenAIMock = vi.fn(class MockOpenAI {
    chat = {
      completions: {
        create: createMock,
      },
    };
  });

  return {
    default: OpenAIMock,
  };
});

describe("llm providers", () => {
  const fetchMock = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearLlmProviderRegistry();
    resetDefaultLlmProvidersRegistration();
    createMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    delete process.env.GITHUB_TOKEN;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  });

  afterEach(() => {
    clearLlmProviderRegistry();
    resetDefaultLlmProvidersRegistration();
    global.fetch = originalFetch;
  });

  it("registers all default providers once", () => {
    registerDefaultLlmProviders();
    registerDefaultLlmProviders();

    expect(listRegisteredLlmProviders().map((provider) => provider.name)).toEqual([
      "copilot",
      "openai",
      "gemini",
      "ollama",
    ]);
  });

  it("creates a Copilot-backed client and issues a completion", async () => {
    process.env.GITHUB_TOKEN = "github-token";
    createMock.mockResolvedValue({
      choices: [{ message: { content: "copilot response" } }],
    });
    registerDefaultLlmProviders();

    const client = await createLlmClient({
      purpose: "chat",
      provider: "copilot",
      model: "gpt-4o-mini",
    });

    const response = await client.complete({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.provider).toBe("copilot");
    expect(response.content).toBe("copilot response");
    expect(OpenAI).toHaveBeenCalled();
  });

  it("creates an OpenAI-backed client and parses JSON output", async () => {
    process.env.OPENAI_API_KEY = "openai-key";
    createMock.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' } }],
    });
    registerDefaultLlmProviders();

    const client = await createLlmClient({
      purpose: "router",
      provider: "openai",
    });

    await expect(
      client.completeJson?.<{ ok: boolean }>({
        messages: [{ role: "user", content: "json please" }],
      })
    ).resolves.toEqual({ ok: true });
  });

  it("creates an Ollama-backed client with the default local endpoint", async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: "ollama response" } }],
    });
    registerDefaultLlmProviders();

    const client = await createLlmClient({
      purpose: "chat",
      provider: "ollama",
      secrets: { ollamaBaseUrl: "http://localhost:11434/v1" },
    });

    const response = await client.complete({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.provider).toBe("ollama");
  });

  it("creates a Gemini-backed client and issues a completion", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "gemini response" }] } }],
      }),
    });
    registerDefaultLlmProviders();

    const client = await createLlmClient({
      purpose: "chat",
      provider: "gemini",
    });

    const response = await client.complete({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.provider).toBe("gemini");
    expect(response.content).toBe("gemini response");
  });

  it("normalizes prefixed Gemini model names before calling generateContent", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "gemini response" }] } }],
      }),
    });
    registerDefaultLlmProviders();

    const client = await createLlmClient({
      purpose: "chat",
      provider: "gemini",
      model: "models/gemini-2.5-flash",
    });

    await client.complete({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key",
      expect.any(Object)
    );
  });

  it("normalizes leading-slash Gemini model names in URL and body", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "gemini response" }] } }],
      }),
    });
    registerDefaultLlmProviders();

    const client = await createLlmClient({
      purpose: "chat",
      provider: "gemini",
      model: "/gemini-2.5-flash",
    });

    await client.complete({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key",
      expect.objectContaining({
        body: expect.stringContaining('"model":"gemini-2.5-flash"'),
      })
    );
  });
});
