'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConversationState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationContextValue {
  state: ConversationState
  error: string | null
  messages: Message[]
  startRecording: () => Promise<void>
  stopRecording: () => void
  speakText: (text: string) => Promise<void>

  // ── Future: high-level pipeline API ────────────────────────────────────────
  startConversation: (sessionId: string, systemPrompt: string) => Promise<void>
  onTranscript: ((role: 'user' | 'assistant', text: string) => void) | null
  onAudioChunk: ((buffer: ArrayBuffer) => void) | null
  onConversationEnd: (() => void) | null
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ConversationContext = createContext<ConversationContextValue | null>(null)

// ─── Helpers ─────────────────────────────────────────────────────────────────

// iOS Safari supports audio/mp4 only; Chrome/Firefox prefer webm/opus.
function getSupportedMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/mp4', extension: 'm4a' },
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' },
    { mimeType: 'audio/webm', extension: 'webm' },
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c
    }
  }
  return { mimeType: '', extension: 'webm' }
}

// recorder.mimeType (actual) may differ from what we requested on iOS — map it to a file extension.
function mimeTypeToExtension(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

// Silent 1-frame WAV used to unlock iOS audio context on user gesture.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

function describeMicError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    return 'Доступ к микрофону необходим для тренировки. Разреши в настройках браузера.'
  }
  if (err instanceof DOMException && err.name === 'NotFoundError') {
    return 'Микрофон не найден. Подключи микрофон и попробуй снова.'
  }
  if (err instanceof Error) return err.message
  return 'Не удалось начать запись.'
}

// ─── Provider ────────────────────────────────────────────────────────────────

type Props = { sessionId: string; children: ReactNode }

export function ConversationProvider({ sessionId, children }: Props) {
  const [state, setState] = useState<ConversationState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  // Recording state — all released after every recording via cleanupRecording.
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // Actual MIME type reported by the MediaRecorder instance (may differ from requested on iOS).
  const actualMimeTypeRef = useRef<string>('')
  const recordingStartRef = useRef<number>(0)

  // Single reused Audio element — pre-warmed on first user gesture to satisfy iOS autoplay policy.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUnlockedRef = useRef(false)

  // Load existing messages on mount so a page refresh doesn't lose history.
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('messages')
      .select('id, role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[])
      })
  }, [sessionId])

  // Release audio element when provider unmounts.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  // Stop all mic tracks and clear recording state. Safe to call at any point.
  const cleanupRecording = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  // POST text to /api/tts, play via the persistent audio element, resolve when done.
  const speakText = useCallback(async (text: string): Promise<void> => {
    setState('speaking')
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Ошибка синтеза речи')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      if (!audioRef.current) audioRef.current = new Audio()
      const audio = audioRef.current
      audio.src = url

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.play().catch(() => resolve())
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка воспроизведения.')
    } finally {
      setState('idle')
    }
  }, [])

  // Full pipeline: Whisper → add user msg → GPT-4o → add assistant msg → TTS → play.
  const sendToTranscribe = useCallback(
    async (blob: Blob, durationSeconds: number, extension: string, mimeType: string) => {
      // Guard against empty/corrupt recordings (common on iOS when the stream was reused).
      if (blob.size < 1000) {
        setError('Запись слишком короткая или пустая. Попробуй ещё раз.')
        setState('error')
        return
      }

      setState('transcribing')
      setError(null)

      // Phase 1: transcription
      const fd = new FormData()
      fd.set('file', blob, `recording.${extension}`)
      fd.set('sessionId', sessionId)
      fd.set('durationSeconds', String(durationSeconds))
      fd.set('extension', extension)
      fd.set('mimeType', mimeType)

      let transcript: string
      let userMessageId: string
      try {
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const data: { messageId?: string; transcript?: string; error?: string } =
          await res.json()

        if (!res.ok) throw new Error(data.error ?? 'Ошибка транскрипции')

        userMessageId = data.messageId!
        transcript = data.transcript!
        setMessages((prev) => [
          ...prev,
          { id: userMessageId, role: 'user', content: transcript },
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при отправке записи.')
        setState('idle')
        return
      }

      // Phase 2: GPT-4o response
      setState('thinking')
      let botContent: string
      let botMessageId: string
      try {
        const res = await fetch('/api/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data: { messageId?: string; content?: string; error?: string } =
          await res.json()

        if (!res.ok) throw new Error(data.error ?? 'Ошибка получения ответа')

        botMessageId = data.messageId!
        botContent = data.content!
        setMessages((prev) => [
          ...prev,
          { id: botMessageId, role: 'assistant', content: botContent },
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при получении ответа бота.')
        setState('idle')
        return
      }

      // Phase 3: TTS + playback (speakText sets 'speaking' then 'idle')
      await speakText(botContent)
    },
    [sessionId, speakText],
  )

  // Use a ref so the onstop closure always calls the latest sendToTranscribe.
  const sendToTranscribeRef = useRef(sendToTranscribe)
  useEffect(() => {
    sendToTranscribeRef.current = sendToTranscribe
  }, [sendToTranscribe])

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return
    setError(null)

    // Ensure any previous recording resources are fully released (critical on iOS).
    cleanupRecording()

    // Unlock audio playback on iOS — must happen inside a user gesture handler.
    if (!audioUnlockedRef.current) {
      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.src = SILENT_WAV
      audioRef.current.play().catch(() => {}).finally(() => {
        audioUnlockedRef.current = true
      })
    }

    try {
      // Fresh getUserMedia every recording — reusing a stream across TTS playback
      // causes corrupt audio on iOS Safari.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const { mimeType } = getSupportedMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder

      // recorder.mimeType reflects what the browser actually chose — may differ from
      // the requested mimeType on iOS.
      actualMimeTypeRef.current = recorder.mimeType || mimeType || 'audio/webm'

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const durationSeconds = (Date.now() - recordingStartRef.current) / 1000
        const actualMime = actualMimeTypeRef.current
        const blob = new Blob(chunksRef.current, { type: actualMime || undefined })
        const extension = mimeTypeToExtension(actualMime)

        // Release mic tracks now — blob is already built, stream no longer needed.
        cleanupRecording()

        sendToTranscribeRef.current(blob, durationSeconds, extension, actualMime)
      }

      recorder.start()
      recordingStartRef.current = Date.now()
      setState('recording')
    } catch (err) {
      cleanupRecording()
      setError(describeMicError(err))
      setState('error')
    }
  }, [state, cleanupRecording])

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
      // onstop fires next, builds blob, calls cleanupRecording, then sendToTranscribeRef
    }
  }, [])

  // ── Future stubs ────────────────────────────────────────────────────────────
  const startConversation = useCallback(
    async (_sessionId: string, _systemPrompt: string): Promise<void> => {
      /* stub — will orchestrate Whisper → GPT-4o → ElevenLabs, or realtime */
    },
    [],
  )

  return (
    <ConversationContext.Provider
      value={{
        state,
        error,
        messages,
        startRecording,
        stopRecording,
        speakText,
        startConversation,
        onTranscript: null,
        onAudioChunk: null,
        onConversationEnd: null,
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useConversation(): ConversationContextValue {
  const ctx = useContext(ConversationContext)
  if (!ctx) {
    throw new Error('useConversation must be used inside <ConversationProvider>')
  }
  return ctx
}
