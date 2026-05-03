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

function buildGeminiUrl(model: string, apiKey: string): string {
  const encodedModel = encodeURIComponent(model);
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
      model,
    }),
  };
}

function extractGeminiText(response: GeminiResponse): string {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function createGeminiClient(options: ResolvedLlmClientOptions): LlmClient {
  return {
    async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
      const model = request.model ?? options.model;
      const apiKey = options.secrets.geminiApiKey ?? options.secrets.apiKey ?? "";
      const response = await fetch(buildGeminiUrl(model, apiKey), toGeminiBody(request, model));

      if (!response.ok) {
        throw new Error(`Gemini request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as GeminiResponse;
      return {
        content: extractGeminiText(payload),
        model,
        provider: "gemini",
        raw: payload,
      };
    },

    async completeJson<T>(request: LlmJsonRequest): Promise<T> {
      const model = request.model ?? options.model;
      const apiKey = options.secrets.geminiApiKey ?? options.secrets.apiKey ?? "";
      const rawResponse = await fetch(
        buildGeminiUrl(model, apiKey),
        toGeminiRequest(request, model, "application/json")
      );

      if (!rawResponse.ok) {
        throw new Error(`Gemini request failed with status ${rawResponse.status}.`);
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
