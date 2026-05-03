function trimTrailingPunctuation(value: string): string {
  return value.trim().replace(/[?!.,;:]+$/g, "").trim();
}

export function extractGraphEntityQuery(query: string): string | null {
  const normalized = trimTrailingPunctuation(query);

  if (!normalized) {
    return null;
  }

  const patterns = [
    /^qui est\s+(.+)$/i,
    /^who is\s+(.+)$/i,
    /^parle[- ]moi de\s+(.+)$/i,
    /^tell me about\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = trimTrailingPunctuation(match?.[1] ?? "");

    if (candidate) {
      return candidate;
    }
  }

  return null;
}