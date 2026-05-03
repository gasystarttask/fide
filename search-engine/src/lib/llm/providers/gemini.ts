import type {
  LlmClient,
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmJsonRequest,
  RegisteredLlmProvider,
  ResolvedLlmClientOptions,
} from "@search/lib/llm/types";

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

type GeminiError = Error & {
  statusCode?: number;
  responseHeaders?: Headers;
};

const DEFAULT_GEMINI_TIMEOUT_MS = 30_000;

function normalizeGeminiModel(model: string): string {
  const trimmedModel = model.trim();
  return trimmedModel.replace(/^\/+/, "").replace(/^models\/+/, "");
}

function buildGeminiUrl(model: string, apiKey: string): string {
  const encodedModel = encodeURIComponent(normalizeGeminiModel(model));
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${apiKey}`;
}

function toGeminiBody(request: LlmCompletionRequest, model: string): RequestInit {
  return toGeminiRequest(request, model);
}

function toGeminiRequest(
  request: LlmCompletionRequest,
  model: string,
  responseMimeType?: string
): RequestInit {
  const normalizedModel = normalizeGeminiModel(model);
  const systemMessage = request.messages.find((message) => message.role === "system");

  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: request.temperature ?? 0,
        maxOutputTokens: request.maxTokens,
        responseMimeType,
      },
      systemInstruction: systemMessage
        ? {
            parts: [{ text: systemMessage.content }],
          }
        : undefined,
      contents: request.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
      model: normalizedModel,
    }),
  };
}

function extractGeminiText(response: GeminiResponse): string {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function createGeminiHttpError(response: Response): GeminiError {
  const error = new Error(`Gemini request failed with status ${response.status}.`) as GeminiError;
  error.statusCode = response.status;
  error.responseHeaders = response.headers;
  return error;
}

async function fetchGemini(
  url: string,
  init: RequestInit,
  timeoutMs?: number
): Promise<Response> {
  const effectiveTimeoutMs = timeoutMs && timeoutMs > 0 ? timeoutMs : DEFAULT_GEMINI_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    const isAbort =
      (error instanceof DOMException && error.name === "AbortError") ||
      (typeof error === "object" && error !== null && "name" in error && (error as { name?: string }).name === "AbortError");

    if (isAbort) {
      throw new Error(`Gemini request timeout after ${effectiveTimeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function createGeminiClient(options: ResolvedLlmClientOptions): LlmClient {
  return {
    async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
      const model = request.model ?? options.model;
      const normalizedModel = normalizeGeminiModel(model);
      const apiKey = options.secrets.geminiApiKey ?? options.secrets.apiKey ?? "";
      const response = await fetchGemini(
        buildGeminiUrl(model, apiKey),
        toGeminiBody(request, model),
        options.timeoutMs
      );

      if (!response.ok) {
        throw createGeminiHttpError(response);
      }

      const payload = (await response.json()) as GeminiResponse;
      return {
        content: extractGeminiText(payload),
        model: normalizedModel,
        provider: "gemini",
        raw: payload,
      };
    },

    async completeJson<T>(request: LlmJsonRequest): Promise<T> {
      const model = request.model ?? options.model;
      const apiKey = options.secrets.geminiApiKey ?? options.secrets.apiKey ?? "";
      const rawResponse = await fetchGemini(
        buildGeminiUrl(model, apiKey),
        toGeminiRequest(request, model, "application/json"),
        options.timeoutMs
      );

      if (!rawResponse.ok) {
        throw createGeminiHttpError(rawResponse);
      }

      const payload = (await rawResponse.json()) as GeminiResponse;
      const response = extractGeminiText(payload);
      if (!response) {
        throw new Error("Provider gemini returned an empty JSON response.");
      }
      return JSON.parse(response) as T;
    },
  };
}

export function createGeminiProvider(): RegisteredLlmProvider {
  return {
    name: "gemini",
    displayName: "Google Gemini",
    capabilities: {
      supportsStreaming: false,
      supportsJsonMode: true,
    },
    createClient: (options) => createGeminiClient(options),
  };
}
