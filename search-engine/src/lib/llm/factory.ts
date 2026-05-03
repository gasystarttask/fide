import { resolveLlmClientOptions } from "@search/lib/llm/env";
import type {
  LlmClient,
  LlmClientOptions,
  LlmProviderName,
  LlmSecrets,
  RegisteredLlmProvider,
  ResolvedLlmClientOptions,
} from "@search/lib/llm/types";

const providerRegistry = new Map<LlmProviderName, RegisteredLlmProvider>();

function requireSecret(value: string | undefined, name: string, provider: LlmProviderName): void {
  if (!value?.trim()) {
    throw new Error(`Missing required secret ${name} for provider ${provider}.`);
  }
}

export function validateProviderSecrets(provider: LlmProviderName, secrets: LlmSecrets): void {
  switch (provider) {
    case "copilot":
      requireSecret(secrets.githubToken, "githubToken", provider);
      break;
    case "openai":
      requireSecret(secrets.openAIApiKey ?? secrets.apiKey, "openAIApiKey", provider);
      break;
    case "gemini":
      requireSecret(secrets.geminiApiKey ?? secrets.apiKey, "geminiApiKey", provider);
      break;
    case "ollama":
      requireSecret(secrets.ollamaBaseUrl ?? secrets.baseUrl, "ollamaBaseUrl", provider);
      break;
  }
}

export function registerLlmProvider(provider: RegisteredLlmProvider, options?: { overwrite?: boolean }): void {
  const existing = providerRegistry.get(provider.name);
  if (existing && !options?.overwrite) {
    throw new Error(`Provider ${provider.name} is already registered.`);
  }
  providerRegistry.set(provider.name, provider);
}

export function unregisterLlmProvider(name: LlmProviderName): void {
  providerRegistry.delete(name);
}

export function clearLlmProviderRegistry(): void {
  providerRegistry.clear();
}

export function getRegisteredLlmProvider(name: LlmProviderName): RegisteredLlmProvider | undefined {
  return providerRegistry.get(name);
}

export function listRegisteredLlmProviders(): RegisteredLlmProvider[] {
  return Array.from(providerRegistry.values());
}

export function resolveAndValidateLlmClientOptions(options: LlmClientOptions): ResolvedLlmClientOptions {
  const resolved = resolveLlmClientOptions(options);
  validateProviderSecrets(resolved.provider, resolved.secrets);
  return resolved;
}

export async function createLlmClient(options: LlmClientOptions): Promise<LlmClient> {
  const resolved = resolveAndValidateLlmClientOptions(options);
  const provider = providerRegistry.get(resolved.provider);

  if (!provider) {
    throw new Error(`No LLM provider registered for ${resolved.provider}.`);
  }

  (provider.validateSecrets ?? ((secrets) => validateProviderSecrets(resolved.provider, secrets)))(
    resolved.secrets
  );
  return provider.createClient(resolved);
}
