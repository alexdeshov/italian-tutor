import type { TargetLanguage } from '@/lib/languages'
import { getLanguageName } from '@/lib/prompts/analyzer'

// Context prompt for the STT model. Without it transcribers tend to "fix" the
// learner's grammar, and the analyzer then never sees those mistakes.
// A/B on 2026-10-10: gpt-4o-transcribe + this prompt kept 12/12 planted English
// mistakes (whisper-1: 10/12) and kept real Italian ones whisper-1 had corrected.
export function buildTranscriptionPrompt(language: TargetLanguage): string {
  return (
    `Non-native ${getLanguageName(language)} speaker practicing conversation. ` +
    'Transcribe exactly what is said, verbatim, keeping grammatical mistakes and wrong word forms. ' +
    'Do not correct grammar.'
  )
}
