import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { logUsage } from '@/lib/usage/logUsage'
import { calculateTranscriptionCost } from '@/lib/pricing'
import { buildTranscriptionPrompt } from '@/lib/prompts/transcription'
import { toTargetLanguage } from '@/lib/languages'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const STT_MODEL = 'gpt-4o-transcribe'

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
  const mimeType = (formData.get('mimeType') as string | null) ?? (extension === 'm4a' ? 'audio/mp4' : 'audio/webm')

  console.log('[transcribe] file:', {
    size: file?.size,
    type: file?.type,
    name: file?.name,
    declaredMimeType: mimeType,
    declaredExtension: extension,
  })

  if (!file || !sessionId) {
    return NextResponse.json({ error: 'Missing file or sessionId' }, { status: 400 })
  }

  // Session language drives the STT language hint (RLS ensures ownership)
  const { data: session } = await supabase
    .from('sessions')
    .select('language')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  const language = toTargetLanguage(session.language)

  // 3. Generate IDs and path
  const messageId = crypto.randomUUID()
  const audioPath = `${user.id}/${sessionId}/${messageId}.${extension}`

  // 4. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(audioPath, file, { contentType: mimeType })

  if (uploadError) {
    return NextResponse.json(
      { error: `Ошибка загрузки аудио: ${uploadError.message}` },
      { status: 500 },
    )
  }

  // 5. Transcribe (verbatim — learner mistakes must survive for the analyzer)
  let transcript: string
  try {
    const result = await openai.audio.transcriptions.create({
      file,
      model: STT_MODEL,
      language,
      prompt: buildTranscriptionPrompt(language),
    })
    transcript = result.text.trim()
  } catch (err) {
    // Clean up storage on STT failure
    await supabase.storage.from('audio').remove([audioPath])
    const msg = err instanceof Error ? err.message : 'Ошибка распознавания речи'
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
    model: STT_MODEL,
    inputUnits: durationSeconds,
    costUsd: calculateTranscriptionCost(STT_MODEL, durationSeconds),
  })

  return NextResponse.json({ messageId, transcript, audioPath })
}
