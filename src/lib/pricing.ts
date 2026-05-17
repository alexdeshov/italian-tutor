// Pricing as of May 2026. Update periodically.
// Sources: openai.com/api/pricing, anthropic.com/pricing, elevenlabs.io/pricing

export const PRICING = {
  openai_whisper: {
    perMinute: 0.006,
  },
  openai_chat: {
    'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
    'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  },
  anthropic_claude: {
    'claude-sonnet-4-6': { inputPer1M: 3.0, outputPer1M: 15.0 },
    'claude-haiku-4-5': { inputPer1M: 1.0, outputPer1M: 5.0 },
  },
  elevenlabs_tts: {
    // Approx Creator tier ($11/mo = 100k chars)
    perCharacter: 0.00011,
  },
} as const

export function calculateWhisperCost(seconds: number): number {
  return (seconds / 60) * PRICING.openai_whisper.perMinute
}

export function calculateChatCost(
  model: keyof typeof PRICING.openai_chat,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING.openai_chat[model]
  return (inputTokens / 1_000_000) * p.inputPer1M + (outputTokens / 1_000_000) * p.outputPer1M
}

export function calculateClaudeCost(
  model: keyof typeof PRICING.anthropic_claude,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING.anthropic_claude[model]
  return (inputTokens / 1_000_000) * p.inputPer1M + (outputTokens / 1_000_000) * p.outputPer1M
}

export function calculateTtsCost(characters: number): number {
  return characters * PRICING.elevenlabs_tts.perCharacter
}
