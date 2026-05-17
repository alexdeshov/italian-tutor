'use client'

import { useEffect, useRef } from 'react'
import { useConversation } from '@/lib/conversation/ConversationProvider'
import { RecordButton } from './RecordButton'

export function SessionClient() {
  const { lastAudioBlob, notifyPlaybackEnd, error } = useConversation()

  const audioRef = useRef<HTMLAudioElement>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Create object URL when a new recording arrives; revoke the previous one.
  useEffect(() => {
    if (!lastAudioBlob) return

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
    }

    const url = URL.createObjectURL(lastAudioBlob)
    blobUrlRef.current = url

    if (audioRef.current) {
      audioRef.current.src = url
      // Autoplay: allowed after user gesture (releasing the record button)
      audioRef.current.play().catch(() => {
        // Browser blocked autoplay — user can press play on the audio element
      })
    }
  }, [lastAudioBlob])

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-center py-8">
        <RecordButton />
      </div>

      {lastAudioBlob && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Последняя запись</p>
          <audio
            ref={audioRef}
            controls
            onEnded={notifyPlaybackEnd}
            className="w-full"
          />
        </div>
      )}
    </div>
  )
}
