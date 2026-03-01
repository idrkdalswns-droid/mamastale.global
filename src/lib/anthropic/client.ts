import Anthropic from "@anthropic-ai/sdk";

// JP-16: Track key used to create client for stale detection across isolate reuse
let client: Anthropic | null = null;
let clientKeySuffix: string | null = null;

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  // Recreate client if API key has been rotated
  const keySuffix = apiKey.slice(-8);
  if (!client || clientKeySuffix !== keySuffix) {
    client = new Anthropic({ apiKey });
    clientKeySuffix = keySuffix;
  }
  return client;
}
