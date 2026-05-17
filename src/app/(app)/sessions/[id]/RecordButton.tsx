'use client'

import { Loader2, Mic, Square } from 'lucide-react'
import { useConversation } from '@/lib/conversation/ConversationProvider'

export function RecordButton() {
  const { state, startRecording, stopRecording } = useConversation()

  const isRecording = state === 'recording'
  const isTranscribing = state === 'transcribing'
  const isDisabled = isTranscribing || state === 'error'

  function handleStart() {
    if (!isDisabled) startRecording()
  }

  function handleStop() {
    if (isRecording) stopRecording()
  }

  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    handleStart()
  }

  function handleTouchEnd(e: React.TouchEvent) {
    e.preventDefault()
    handleStop()
  }

  const label = isRecording
    ? 'Запись… (отпусти чтобы остановить)'
    : isTranscribing
      ? 'Распознаю…'
      : 'Удерживай для записи'

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        disabled={isDisabled}
        aria-label={label}
        onMouseDown={handleStart}
        onMouseUp={handleStop}
        onMouseLeave={handleStop}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={[
          'size-24 rounded-full flex items-center justify-center',
          'select-none outline-none border-none cursor-pointer',
          'transition-colors duration-150',
          'focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isRecording
            ? 'bg-red-500 text-white animate-pulse'
            : isTranscribing
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
        ].join(' ')}
      >
        {isRecording ? (
          <Square className="size-8 fill-current" />
        ) : isTranscribing ? (
          <Loader2 className="size-8 animate-spin" />
        ) : (
          <Mic className="size-8" />
        )}
      </button>

      <p className="text-xs text-muted-foreground select-none">{label}</p>
    </div>
  )
}
