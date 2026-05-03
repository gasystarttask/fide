import OpenAI from "openai";
import type {
  LlmClient,
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmJsonRequest,
  LlmMessage,
  LlmProviderName,
  RegisteredLlmProvider,
  ResolvedLlmClientOptions,
} from "@search/lib/llm/types";

type OpenAICompatibleConfig = {
  provider: LlmProviderName;
  displayName: string;
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  resolveApiKey: (options: ResolvedLlmClientOptions) => string;
};

function toOpenAIMessages(messages: LlmMessage[]): Array<{ role: LlmMessage["role"]; content: string }> {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function createOpenAIClient(options: ResolvedLlmClientOptions, config: OpenAICompatibleConfig): OpenAI {
  return new OpenAI({
    apiKey: config.resolveApiKey(options),
    baseURL: config.baseURL,
    defaultHeaders: config.defaultHeaders,
    timeout: options.timeoutMs,
    maxRetries: options.maxRetries,
  });
}

function mapCompletionResponse(
  provider: LlmProviderName,
  model: string,
  response: { choices?: Array<{ message?: { content?: string | null } }> }
): LlmCompletionResponse {
  return {
    content: response.choices?.[0]?.message?.content?.trim() ?? "",
    model,
    provider,
    raw: response,
  };
}

function createOpenAICompatibleClient(
  options: ResolvedLlmClientOptions,
  config: OpenAICompatibleConfig
): LlmClient {
  const client = createOpenAIClient(options, config);

  return {
    async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
      const model = request.model ?? options.model;
      const response = await client.chat.completions.create({
        model,
        temperature: request.temperature ?? 0,
        max_tokens: request.maxTokens,
        messages: toOpenAIMessages(request.messages),
      });

      return mapCompletionResponse(config.provider, model, response);
    },

    async *stream(request: LlmCompletionRequest): AsyncIterable<string> {
      const model = request.model ?? options.model;
      const stream = await client.chat.completions.create({
        model,
        temperature: request.temperature ?? 0,
        max_tokens: request.maxTokens,
        stream: true,
        messages: toOpenAIMessages(request.messages),
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) yield token;
      }
    },

    async completeJson<T>(request: LlmJsonRequest): Promise<T> {
      const model = request.model ?? options.model;
      const response = await client.chat.completions.create({
        model,
        temperature: request.temperature ?? 0,
        max_tokens: request.maxTokens,
        response_format: { type: "json_object" },
        messages: toOpenAIMessages(request.messages),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`Provider ${config.provider} returned an empty JSON response.`);
      }

      return JSON.parse(content) as T;
    },
  };
}

export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig): RegisteredLlmProvider {
  return {
    name: config.provider,
    displayName: config.displayName,
    capabilities: {
      supportsStreaming: true,
      supportsJsonMode: true,
    },
    createClient: (options) => createOpenAICompatibleClient(options, config),
  };
}

export function createCopilotProvider(): RegisteredLlmProvider {
  return createOpenAICompatibleProvider({
    provider: "copilot",
    displayName: "GitHub Copilot",
    baseURL: "https://models.github.ai/inference",
    defaultHeaders: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    resolveApiKey: (options) => options.secrets.githubToken ?? "",
  });
}

export function createOpenAIProvider(): RegisteredLlmProvider {
  return createOpenAICompatibleProvider({
    provider: "openai",
    displayName: "OpenAI",
    resolveApiKey: (options) => options.secrets.openAIApiKey ?? options.secrets.apiKey ?? "",
  });
}

export function createOllamaProvider(): RegisteredLlmProvider {
  return createOpenAICompatibleProvider({
    provider: "ollama",
    displayName: "Ollama",
    baseURL: "http://localhost:11434/v1",
    resolveApiKey: () => "ollama",
  });
}
