export function parseRetryAfterSeconds(value: string | null | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

export function extractRetryAfterFromMessage(message: string): number | null {
  const match = message.match(/retry in\s+(\d+)s/i);
  if (!match) {
    return null;
  }

  return parseRetryAfterSeconds(match[1]);
}
