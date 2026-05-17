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

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConversationState = 'idle' | 'recording' | 'playing' | 'error'

export interface ConversationContextValue {
  // Current phase: manual push-to-talk
  state: ConversationState
  error: string | null
  lastAudioBlob: Blob | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  notifyPlaybackEnd: () => void

  // ── Future: high-level pipeline API ────────────────────────────────────────
  // Stubs — will be wired up in phase 4 (Whisper → GPT-4o → ElevenLabs).
  // UI code above this provider must call ONLY these methods so that
  // swapping to realtime (WebSocket) requires no changes in UI components.
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

function describeError(err: unknown): string {
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

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConversationState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef<string | undefined>(undefined)

  // Release mic tracks when provider unmounts
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Acquire mic stream (cached after first request)
  const getStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current) return streamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    return stream
  }, [])

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
        setLastAudioBlob(blob)
        setState('playing')
      }

      recorder.start()
      recorderRef.current = recorder
      setState('recording')
    } catch (err) {
      setError(describeError(err))
      setState('error')
    }
  }, [state, getStream])

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const notifyPlaybackEnd = useCallback(() => {
    setState('idle')
  }, [])

  // ── Future stubs ────────────────────────────────────────────────────────────
  // Replace these when implementing the full Whisper → GPT-4o → ElevenLabs pipeline.
  // The stub signature must stay stable so UI components need zero changes.
  const startConversation = useCallback(
    async (_sessionId: string, _systemPrompt: string): Promise<void> => {
      /* stub — will orchestrate full turn-based or realtime pipeline */
    },
    [],
  )

  return (
    <ConversationContext.Provider
      value={{
        state,
        error,
        lastAudioBlob,
        startRecording,
        stopRecording,
        notifyPlaybackEnd,
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
