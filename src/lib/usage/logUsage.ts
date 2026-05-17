import { SupabaseClient } from '@supabase/supabase-js'

export async function logUsage(
  supabase: SupabaseClient,
  params: {
    profileId: string
    sessionId: string | null
    provider: 'openai_whisper' | 'openai_chat' | 'anthropic_claude' | 'elevenlabs_tts'
    operation: string
    model?: string
    inputUnits: number
    outputUnits?: number
    costUsd: number
  },
) {
  const { error } = await supabase.from('api_usage').insert({
    profile_id: params.profileId,
    session_id: params.sessionId,
    provider: params.provider,
    operation: params.operation,
    model: params.model ?? null,
    input_units: params.inputUnits,
    output_units: params.outputUnits ?? 0,
    cost_usd: params.costUsd,
  })
  if (error) {
    // Log but never throw — usage tracking must not break the main flow
    console.error('Failed to log API usage:', error)
  }
}
