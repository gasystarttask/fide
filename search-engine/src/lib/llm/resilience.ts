import { createLlmClient } from "@search/lib/llm/factory";
import type { LlmClient, LlmClientOptions, LlmProviderName, LlmPurpose } from "@search/lib/llm/types";

const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

const DEFAULT_PROVIDER_ORDER: Record<LlmPurpose, LlmProviderName[]> = {
  chat: ["gemini", "openai", "copilot", "ollama"],
  router: ["gemini", "openai", "copilot", "ollama"],
  "grounded-answer": ["gemini", "openai", "copilot", "ollama"],
  extraction: ["gemini", "openai", "copilot", "ollama"],
};

type CircuitState = {
  consecutiveFailures: number;
  openUntil: number;
};

type ProviderErrorType = "rate-limit" | "server-error" | "timeout" | "unknown";

const circuitByProvider = new Map<LlmProviderName, CircuitState>();

export interface LlmFallbackEvent {
  from: LlmProviderName;
  to: LlmProviderName;
  errorType: ProviderErrorType;
}

export interface ExecuteWithFallbackOptions<T> {
  clientOptions: Omit<LlmClientOptions, "provider"> & { purpose: LlmPurpose };
  providers?: LlmProviderName[];
  execute: (client: LlmClient, provider: LlmProviderName) => Promise<T>;
  onFallback?: (event: LlmFallbackEvent) => void;
  failureThreshold?: number;
  cooldownMs?: number;
}

export interface ExecuteWithFallbackResult<T> {
  provider: LlmProviderName;
  result: T;
  failovers: LlmFallbackEvent[];
}

function now(): number {
  return Date.now();
}

function parseProviderList(value?: string): LlmProviderName[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is LlmProviderName => {
      return item === "copilot" || item === "openai" || item === "gemini" || item === "ollama";
    });
}

export function resolveProviderOrder(purpose: LlmPurpose, explicit?: LlmProviderName[]): LlmProviderName[] {
  if (explicit?.length) return explicit;

  const envOrder = parseProviderList(process.env[`LLM_FALLBACK_ORDER_${purpose.replace(/-/g, "_").toUpperCase()}`]);
  if (envOrder.length) return envOrder;

  return DEFAULT_PROVIDER_ORDER[purpose];
}

export function classifyLlmError(error: unknown): ProviderErrorType {
  const message = `${(error as { message?: string })?.message ?? ""}`.toLowerCase();
  const statusCode = (error as { statusCode?: number })?.statusCode;

  if (statusCode === 429 || message.includes("too many requests") || message.includes("rate limit")) {
    return "rate-limit";
  }

  if (statusCode != null && statusCode >= 500) {
    return "server-error";
  }

  if (message.includes("timeout") || message.includes("aborted")) {
    return "timeout";
  }

  return "unknown";
}

function getCircuitState(provider: LlmProviderName): CircuitState {
  return circuitByProvider.get(provider) ?? { consecutiveFailures: 0, openUntil: 0 };
}

export function isProviderCircuitOpen(provider: LlmProviderName, currentTime = now()): boolean {
  return getCircuitState(provider).openUntil > currentTime;
}

export function recordProviderSuccess(provider: LlmProviderName): void {
  circuitByProvider.set(provider, { consecutiveFailures: 0, openUntil: 0 });
}

export function recordProviderFailure(
  provider: LlmProviderName,
  failureThreshold = DEFAULT_FAILURE_THRESHOLD,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  currentTime = now()
): void {
  const current = getCircuitState(provider);
  const consecutiveFailures = current.consecutiveFailures + 1;

  if (consecutiveFailures >= failureThreshold) {
    circuitByProvider.set(provider, { consecutiveFailures: 0, openUntil: currentTime + cooldownMs });
    return;
  }

  circuitByProvider.set(provider, { consecutiveFailures, openUntil: current.openUntil });
}

export function resetProviderCircuitState(): void {
  circuitByProvider.clear();
}

export async function executeWithFallback<T>(
  options: ExecuteWithFallbackOptions<T>
): Promise<ExecuteWithFallbackResult<T>> {
  const providers = resolveProviderOrder(options.clientOptions.purpose, options.providers);
  const failovers: LlmFallbackEvent[] = [];
  let lastError: unknown;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    if (isProviderCircuitOpen(provider)) {
      continue;
    }

    try {
      const client = await createLlmClient({ ...options.clientOptions, provider });
      const result = await options.execute(client, provider);
      recordProviderSuccess(provider);
      return { provider, result, failovers };
    } catch (error) {
      lastError = error;
      const errorType = classifyLlmError(error);

      if (errorType === "unknown") {
        throw error;
      }

      recordProviderFailure(
        provider,
        options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD,
        options.cooldownMs ?? DEFAULT_COOLDOWN_MS
      );

      const nextProvider = providers[index + 1];
      if (nextProvider) {
        const event = { from: provider, to: nextProvider, errorType };
        failovers.push(event);
        options.onFallback?.(event);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No available LLM provider succeeded.");
}
