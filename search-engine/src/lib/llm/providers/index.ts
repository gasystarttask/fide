import { registerLlmProvider } from "@search/lib/llm/factory";
import { createGeminiProvider } from "@search/lib/llm/providers/gemini";
import {
  createCopilotProvider,
  createOllamaProvider,
  createOpenAIProvider,
} from "@search/lib/llm/providers/openai-compatible";

let defaultsRegistered = false;

export function registerDefaultLlmProviders(): void {
  if (defaultsRegistered) return;

  registerLlmProvider(createCopilotProvider());
  registerLlmProvider(createOpenAIProvider());
  registerLlmProvider(createGeminiProvider());
  registerLlmProvider(createOllamaProvider());
  defaultsRegistered = true;
}

export function resetDefaultLlmProvidersRegistration(): void {
  defaultsRegistered = false;
}
