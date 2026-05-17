'use client'

import { Loader2, Mic, Square, Volume2 } from 'lucide-react'
import { useConversation } from '@/lib/conversation/ConversationProvider'

export function RecordButton() {
  const { state, startRecording, stopRecording } = useConversation()

  const isRecording = state === 'recording'
  const isDisabled = state !== 'idle' && state !== 'recording'

  function handleStart() {
    if (state === 'idle') startRecording()
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

  const label =
    state === 'recording'
      ? 'Запись… (отпусти чтобы остановить)'
      : state === 'transcribing'
        ? 'Распознаю…'
        : state === 'thinking'
          ? 'Думаю…'
          : state === 'speaking'
            ? 'Говорю…'
            : 'Удерживай для записи'

  const icon =
    state === 'recording' ? (
      <Square className="size-8 fill-current" />
    ) : state === 'transcribing' || state === 'thinking' ? (
      <Loader2 className="size-8 animate-spin" />
    ) : state === 'speaking' ? (
      <Volume2 className="size-8" />
    ) : (
      <Mic className="size-8" />
    )

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
          state === 'recording'
            ? 'bg-red-500 text-white animate-pulse'
            : isDisabled
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
        ].join(' ')}
      >
        {icon}
      </button>

      <p className="text-xs text-muted-foreground select-none">{label}</p>
    </div>
  )
}
