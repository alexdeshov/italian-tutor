import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildAnalyzerSystemPrompt } from '@/lib/prompts/analyzer'
import { logUsage } from '@/lib/usage/logUsage'
import { calculateClaudeCost } from '@/lib/pricing'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ErrorItem = {
  original_quote: string
  correction: string
  explanation_ru: string
  error_type: 'grammar' | 'lexicon' | 'syntax' | 'style' | 'pronunciation'
}

type VocabItem = {
  italian: string
  russian: string
  note?: string
}

type AnalysisInput = {
  errors: ErrorItem[]
  useful_vocabulary: VocabItem[]
  overall_comment: string
  level_observation: string
}

export type AnalyzeResult =
  | { ok: true; errorCount: number }
  | { ok: false; error: string }

export async function analyzeSession(sessionId: string): Promise<AnalyzeResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch session + profile level (RLS ensures ownership)
  const { data: session } = await supabase
    .from('sessions')
    .select('id, topic, status, profiles(italian_level)')
    .eq('id', sessionId)
    .single()

  if (!session) return { ok: false, error: 'Session not found' }
  if (session.status !== 'completed') return { ok: false, error: 'Session not completed' }

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (!messages || messages.length < 2) {
    return { ok: false, error: 'Сессия слишком короткая для анализа' }
  }

  // Clear any previous analysis (idempotent — supports re-analysis)
  await supabase.from('errors').delete().eq('session_id', sessionId)
  await supabase.from('summaries').delete().eq('session_id', sessionId)

  // Build transcript
  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Student' : 'Partner'}: ${m.content}`)
    .join('\n')
  const transcriptText = `--- TRANSCRIPT ---\n${transcript}`

  // Resolve profile level
  const profileData = Array.isArray(session.profiles)
    ? session.profiles[0]
    : session.profiles
  const level = (profileData as { italian_level?: string } | null)?.italian_level ?? 'B1'

  // Call Claude Sonnet with forced tool use
  let analysis: AnalysisInput
  let inputTokens = 0
  let outputTokens = 0
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildAnalyzerSystemPrompt(level, session.topic),
      messages: [{ role: 'user', content: transcriptText }],
      tools: [
        {
          name: 'submit_analysis',
          description: "Submit the structured analysis of the student's Italian conversation",
          input_schema: {
            type: 'object' as const,
            required: ['errors', 'useful_vocabulary', 'overall_comment', 'level_observation'],
            properties: {
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['original_quote', 'correction', 'explanation_ru', 'error_type'],
                  properties: {
                    original_quote: { type: 'string' },
                    correction: { type: 'string' },
                    explanation_ru: { type: 'string' },
                    error_type: {
                      type: 'string',
                      enum: ['grammar', 'lexicon', 'syntax', 'style', 'pronunciation'],
                    },
                  },
                },
              },
              useful_vocabulary: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['italian', 'russian'],
                  properties: {
                    italian: { type: 'string' },
                    russian: { type: 'string' },
                    note: { type: 'string' },
                  },
                },
              },
              overall_comment: { type: 'string' },
              level_observation: { type: 'string' },
            },
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
    })

    inputTokens = response.usage.input_tokens
    outputTokens = response.usage.output_tokens

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return { ok: false, error: 'Unexpected response from Claude' }
    }

    analysis = toolBlock.input as AnalysisInput
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Claude API error' }
  }

  // Log usage
  if (user) {
    await logUsage(supabase, {
      profileId: user.id,
      sessionId,
      provider: 'anthropic_claude',
      operation: 'analyze',
      model: 'claude-sonnet-4-6',
      inputUnits: inputTokens,
      outputUnits: outputTokens,
      costUsd: calculateClaudeCost('claude-sonnet-4-6', inputTokens, outputTokens),
    })
  }

  // Insert errors
  if (analysis.errors.length > 0) {
    const { error: insertErr } = await supabase.from('errors').insert(
      analysis.errors.map((e) => ({
        session_id: sessionId,
        original_quote: e.original_quote,
        correction: e.correction,
        explanation_ru: e.explanation_ru,
        error_type: e.error_type,
      })),
    )
    if (insertErr) return { ok: false, error: insertErr.message }
  }

  // Insert summary
  const { error: summaryErr } = await supabase.from('summaries').insert({
    session_id: sessionId,
    overall_comment: analysis.overall_comment,
    useful_vocabulary: analysis.useful_vocabulary,
    level_observation: analysis.level_observation,
  })
  if (summaryErr) return { ok: false, error: summaryErr.message }

  return { ok: true, errorCount: analysis.errors.length }
}
