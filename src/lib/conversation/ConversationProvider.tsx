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

export type ConversationState = 'idle' | 'recording' | 'transcribing' | 'error'

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

  // ── Future: high-level pipeline API ────────────────────────────────────────
  // Stubs — will replace startRecording/stopRecording in phase 5
  // (Whisper → GPT-4o → ElevenLabs full pipeline, or realtime swap).
  // UI must call ONLY these so that swapping the underlying transport
  // requires zero changes above the provider boundary.
  startConversation: (sessionId: string, systemPrompt: string) => Promise<void>
  onTranscript: ((role: 'user' | 'assistant', text: string) => void) | null
  onAudioChunk: ((buffer: ArrayBuffer) => void) | null
  onConversationEnd: (() => void) | null
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ConversationContext = createContext<ConversationContextValue | null>(null)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSupportedMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

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

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef<string | undefined>(undefined)

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

  // Release mic tracks when provider unmounts.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Acquire mic stream (cached — permission dialog shows only once per mount).
  const getStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current) return streamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    return stream
  }, [])

  // POST blob to /api/transcribe, append result to messages state.
  const sendToTranscribe = useCallback(
    async (blob: Blob) => {
      setState('transcribing')
      setError(null)

      const fd = new FormData()
      fd.set('file', blob, 'recording.webm')
      fd.set('sessionId', sessionId)

      try {
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const data: { messageId?: string; transcript?: string; error?: string } =
          await res.json()

        if (!res.ok) {
          throw new Error(data.error ?? 'Ошибка транскрипции')
        }

        setMessages((prev) => [
          ...prev,
          { id: data.messageId!, role: 'user', content: data.transcript! },
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при отправке записи.')
      } finally {
        setState('idle')
      }
    },
    [sessionId],
  )

  // Use a ref so that MediaRecorder.onstop always calls the latest version
  // of sendToTranscribe even if sessionId or the callback itself changed.
  const sendToTranscribeRef = useRef(sendToTranscribe)
  useEffect(() => {
    sendToTranscribeRef.current = sendToTranscribe
  }, [sendToTranscribe])

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return
    setError(null)

    try {
      const stream = await getStream()

      const mimeType = getSupportedMimeType()
      if (!mimeType) {
        throw new Error(
          'Ваш браузер не поддерживает запись в формате WebM. Попробуй Chrome или Firefox.',
        )
      }

      mimeTypeRef.current = mimeType
      chunksRef.current = []

      const recorder = new MediaRecorder(stream, { mimeType })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
        // onstop is synchronous; kick off the async pipeline via ref
        sendToTranscribeRef.current(blob)
      }

      recorder.start()
      recorderRef.current = recorder
      setState('recording')
    } catch (err) {
      setError(describeMicError(err))
      setState('error')
    }
  }, [state, getStream])

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
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
