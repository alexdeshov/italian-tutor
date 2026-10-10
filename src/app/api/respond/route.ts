import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import {
  buildConversationPrompt,
  buildInstantFeedbackInstructions,
} from '@/lib/prompts/conversation'
import { toTargetLanguage } from '@/lib/languages'
import { logUsage } from '@/lib/usage/logUsage'
import { calculateChatCost } from '@/lib/pricing'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Instant feedback mode: the same GPT-4o call returns the correction and the reply.
const FEEDBACK_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'turn',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['correction', 'reply'],
      properties: {
        correction: {
          anyOf: [
            { type: 'null' },
            {
              type: 'object',
              additionalProperties: false,
              required: ['corrected', 'note_ru'],
              properties: {
                corrected: { type: 'string' },
                note_ru: { type: 'string' },
              },
            },
          ],
        },
        reply: { type: 'string' },
      },
    },
  },
} as const

type FeedbackTurn = {
  correction: { corrected: string; note_ru: string } | null
  reply: string
}

function parseFeedbackTurn(raw: string): FeedbackTurn {
  try {
    const parsed = JSON.parse(raw) as FeedbackTurn
    if (typeof parsed.reply === 'string') return parsed
  } catch {
    // fall through — treat the whole output as a plain reply
  }
  return { correction: null, reply: raw }
}

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  // 3. Fetch session + profile level (RLS ensures ownership)
  const { data: session } = await supabase
    .from('sessions')
    .select('id, topic, language, instant_feedback, profiles(italian_level)')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // 4. Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'No messages in session' }, { status: 400 })
  }

  if (messages[messages.length - 1].role === 'assistant') {
    return NextResponse.json({ error: 'Last message is already from assistant' }, { status: 400 })
  }

  // 5. Build system prompt
  const profileData = Array.isArray(session.profiles)
    ? session.profiles[0]
    : session.profiles
  const level = (profileData as { italian_level?: string } | null)?.italian_level ?? 'B1'
  const instantFeedback = session.instant_feedback === true
  const systemPrompt =
    buildConversationPrompt(toTargetLanguage(session.language), level, session.topic) +
    (instantFeedback ? buildInstantFeedbackInstructions(level) : '')

  // 6. Call GPT-4o
  let content: string
  let correction: FeedbackTurn['correction'] = null
  let promptTokens = 0
  let completionTokens = 0
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.8,
      max_tokens: instantFeedback ? 350 : 200,
      ...(instantFeedback ? { response_format: FEEDBACK_FORMAT } : {}),
    })
    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    if (instantFeedback) {
      const turn = parseFeedbackTurn(raw)
      content = turn.reply.trim()
      correction = turn.correction
    } else {
      content = raw
    }
    promptTokens = completion.usage?.prompt_tokens ?? 0
    completionTokens = completion.usage?.completion_tokens ?? 0
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GPT-4o error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (!content) {
    return NextResponse.json({ error: 'Empty response from GPT-4o' }, { status: 500 })
  }

  // 7. Insert assistant message (no audio_path — generated on demand)
  const messageId = crypto.randomUUID()
  const { error: insertError } = await supabase.from('messages').insert({
    id: messageId,
    session_id: sessionId,
    role: 'assistant',
    content,
    audio_path: null,
    correction: correction?.corrected ?? null,
    correction_note: correction?.note_ru ?? null,
  })

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to save message: ${insertError.message}` },
      { status: 500 },
    )
  }

  // 8. Log usage
  await logUsage(supabase, {
    profileId: user.id,
    sessionId,
    provider: 'openai_chat',
    operation: 'respond',
    model: 'gpt-4o',
    inputUnits: promptTokens,
    outputUnits: completionTokens,
    costUsd: calculateChatCost('gpt-4o', promptTokens, completionTokens),
  })

  return NextResponse.json({
    messageId,
    content,
    correction: correction?.corrected ?? null,
    correctionNote: correction?.note_ru ?? null,
  })
}
