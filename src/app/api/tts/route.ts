import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logUsage } from '@/lib/usage/logUsage'
import { calculateTtsCost } from '@/lib/pricing'
import { toTargetLanguage } from '@/lib/languages'

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
  const { text, sessionId } = await request.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  if (text.length > 1000) {
    return NextResponse.json({ error: 'Text too long (max 1000 chars)' }, { status: 400 })
  }

  // Voice per session language. Without a dedicated English voice the Italian one
  // still reads English (multilingual model), just with its accent.
  let language = toTargetLanguage(null)
  if (typeof sessionId === 'string') {
    const { data: session } = await supabase
      .from('sessions')
      .select('language')
      .eq('id', sessionId)
      .single()
    language = toTargetLanguage(session?.language)
  }

  const voiceId =
    (language === 'en' && process.env.ELEVENLABS_VOICE_ID_EN) || process.env.ELEVENLABS_VOICE_ID
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!voiceId || !apiKey) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 500 })
  }

  // 3. Proxy to ElevenLabs streaming endpoint
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json({ error: `ElevenLabs error: ${errText}` }, { status: 502 })
  }

  // 4. Log usage
  await logUsage(supabase, {
    profileId: user.id,
    // Attributed to the session so per-session cost includes TTS (the biggest cost item)
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    provider: 'elevenlabs_tts',
    operation: 'tts',
    model: 'eleven_multilingual_v2',
    inputUnits: text.length,
    costUsd: calculateTtsCost(text.length),
  })

  return new Response(res.body, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}
