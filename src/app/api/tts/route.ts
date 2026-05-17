import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const { text } = await request.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  if (text.length > 1000) {
    return NextResponse.json({ error: 'Text too long (max 1000 chars)' }, { status: 400 })
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID
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

  return new Response(res.body, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}
