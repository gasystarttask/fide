export type LlmProviderName = "copilot" | "openai" | "gemini" | "ollama";

export type LlmPurpose = "chat" | "router" | "grounded-answer" | "extraction";

export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmCapabilities {
  supportsStreaming: boolean;
  supportsJsonMode: boolean;
  defaultTimeoutMs?: number;
  maxContextTokens?: number;
  rateLimitSensitivity?: "low" | "medium" | "high";
}

export interface LlmSecrets {
  githubToken?: string;
  openAIApiKey?: string;
  geminiApiKey?: string;
  ollamaBaseUrl?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface LlmClientOptions {
  provider?: LlmProviderName;
  purpose: LlmPurpose;
  model?: string;
  secrets?: LlmSecrets;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ResolvedLlmClientOptions {
  provider: LlmProviderName;
  purpose: LlmPurpose;
  model: string;
  secrets: LlmSecrets;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface LlmCompletionRequest {
  model?: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResponse {
  content: string;
  model: string;
  provider: LlmProviderName;
  raw?: unknown;
}

export interface LlmJsonRequest extends LlmCompletionRequest {
  schemaName?: string;
}

export interface LlmClient {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
  stream?(request: LlmCompletionRequest): AsyncIterable<string>;
  completeJson?<T>(request: LlmJsonRequest): Promise<T>;
}

export interface RegisteredLlmProvider {
  name: LlmProviderName;
  displayName: string;
  capabilities: LlmCapabilities;
  validateSecrets?: (secrets: LlmSecrets) => void;
  createClient: (options: ResolvedLlmClientOptions) => LlmClient | Promise<LlmClient>;
}
