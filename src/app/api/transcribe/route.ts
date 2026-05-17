import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { logUsage } from '@/lib/usage/logUsage'
import { calculateWhisperCost } from '@/lib/pricing'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const sessionId = formData.get('sessionId') as string | null
  const durationSeconds = parseFloat((formData.get('durationSeconds') as string | null) ?? '0')
  const extension = (formData.get('extension') as string | null) ?? 'webm'
  const contentType = extension === 'm4a' ? 'audio/mp4' : 'audio/webm'

  if (!file || !sessionId) {
    return NextResponse.json({ error: 'Missing file or sessionId' }, { status: 400 })
  }

  // 3. Generate IDs and path
  const messageId = crypto.randomUUID()
  const audioPath = `${user.id}/${sessionId}/${messageId}.${extension}`

  // 4. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(audioPath, file, { contentType })

  if (uploadError) {
    return NextResponse.json(
      { error: `Ошибка загрузки аудио: ${uploadError.message}` },
      { status: 500 },
    )
  }

  // 5. Transcribe with Whisper
  let transcript: string
  try {
    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'it',
    })
    transcript = result.text.trim()
  } catch (err) {
    // Clean up storage on Whisper failure
    await supabase.storage.from('audio').remove([audioPath])
    const msg = err instanceof Error ? err.message : 'Ошибка Whisper API'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 6. Reject empty transcript
  if (!transcript) {
    await supabase.storage.from('audio').remove([audioPath])
    return NextResponse.json(
      { error: 'Не удалось распознать речь, попробуй говорить громче.' },
      { status: 400 },
    )
  }

  // 7. Insert message
  const { error: insertError } = await supabase.from('messages').insert({
    id: messageId,
    session_id: sessionId,
    role: 'user',
    content: transcript,
    audio_path: audioPath,
  })

  if (insertError) {
    return NextResponse.json(
      { error: `Ошибка сохранения сообщения: ${insertError.message}` },
      { status: 500 },
    )
  }

  // 8. Log usage
  await logUsage(supabase, {
    profileId: user.id,
    sessionId,
    provider: 'openai_whisper',
    operation: 'transcribe',
    model: 'whisper-1',
    inputUnits: durationSeconds,
    costUsd: calculateWhisperCost(durationSeconds),
  })

  return NextResponse.json({ messageId, transcript, audioPath })
}
