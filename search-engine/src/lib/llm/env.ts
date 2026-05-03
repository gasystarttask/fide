import type {
  LlmClientOptions,
  LlmProviderName,
  LlmPurpose,
  LlmSecrets,
  ResolvedLlmClientOptions,
} from "@search/lib/llm/types";

const PURPOSE_ENV_SUFFIX: Record<LlmPurpose, string> = {
  chat: "CHAT",
  router: "ROUTER",
  "grounded-answer": "GROUNDED_ANSWER",
  extraction: "EXTRACTION",
};

const PURPOSE_MODEL_ENV_KEYS: Record<LlmPurpose, string[]> = {
  chat: ["LLM_CHAT_MODEL", "GROUNDED_ANSWER_MODEL"],
  router: ["LLM_ROUTER_MODEL", "QUERY_ROUTER_MODEL"],
  "grounded-answer": ["LLM_GROUNDED_ANSWER_MODEL", "GROUNDED_ANSWER_MODEL"],
  extraction: ["LLM_EXTRACTION_MODEL", "COPILOT_MODEL"],
};

const PROVIDER_DEFAULT_MODELS: Record<LlmProviderName, string> = {
  copilot: "gpt-4o-mini",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  ollama: "llama3.2",
};

function parseProviderName(value?: string | null): LlmProviderName | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "copilot" || normalized === "openai" || normalized === "gemini" || normalized === "ollama") {
    return normalized;
  }
  return undefined;
}

function readFirstEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function resolveProviderFromEnv(purpose: LlmPurpose): LlmProviderName | undefined {
  const suffix = PURPOSE_ENV_SUFFIX[purpose];
  return (
    parseProviderName(process.env[`LLM_${suffix}_PROVIDER`]) ??
    parseProviderName(process.env.LLM_DEFAULT_PROVIDER)
  );
}

function inferProviderFromSecrets(overrides?: LlmSecrets): LlmProviderName | undefined {
  if (overrides?.githubToken?.trim() || process.env.GITHUB_TOKEN?.trim()) return "copilot";
  if (overrides?.openAIApiKey?.trim() || overrides?.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  if (overrides?.geminiApiKey?.trim() || overrides?.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }
  if (
    overrides?.ollamaBaseUrl?.trim() ||
    overrides?.baseUrl?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    process.env.OLLAMA_MODEL?.trim()
  ) {
    return "ollama";
  }
  return undefined;
}

export function resolveLlmProvider(options: LlmClientOptions): LlmProviderName {
  return (
    options.provider ??
    resolveProviderFromEnv(options.purpose) ??
    inferProviderFromSecrets(options.secrets) ??
    "gemini"
  );
}

export function resolveLlmSecrets(provider: LlmProviderName, overrides?: LlmSecrets): LlmSecrets {
  return {
    githubToken: overrides?.githubToken ?? process.env.GITHUB_TOKEN,
    openAIApiKey: overrides?.openAIApiKey ?? overrides?.apiKey ?? process.env.OPENAI_API_KEY,
    geminiApiKey: overrides?.geminiApiKey ?? overrides?.apiKey ?? process.env.GEMINI_API_KEY,
    ollamaBaseUrl:
      overrides?.ollamaBaseUrl ?? overrides?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: overrides?.apiKey,
    baseUrl: overrides?.baseUrl,
  };
}

export function resolveLlmModel(provider: LlmProviderName, purpose: LlmPurpose, override?: string): string {
  if (override?.trim()) return override.trim();

  const providerSpecific = readFirstEnv([
    `LLM_${PURPOSE_ENV_SUFFIX[purpose]}_${provider.toUpperCase()}_MODEL`,
    `${provider.toUpperCase()}_${PURPOSE_ENV_SUFFIX[purpose]}_MODEL`,
  ]);
  if (providerSpecific) return providerSpecific;

  const purposeSpecific = readFirstEnv(PURPOSE_MODEL_ENV_KEYS[purpose]);
  const configuredProviderForPurpose = resolveProviderFromEnv(purpose);
  if (purposeSpecific && (!configuredProviderForPurpose || configuredProviderForPurpose === provider)) {
    return purposeSpecific;
  }

  const genericProvider = readFirstEnv([`${provider.toUpperCase()}_MODEL`]);
  if (genericProvider) return genericProvider;

  return PROVIDER_DEFAULT_MODELS[provider];
}

export function resolveLlmClientOptions(options: LlmClientOptions): ResolvedLlmClientOptions {
  const provider = resolveLlmProvider(options);
  return {
    provider,
    purpose: options.purpose,
    model: resolveLlmModel(provider, options.purpose, options.model),
    secrets: resolveLlmSecrets(provider, options.secrets),
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
  };
}
