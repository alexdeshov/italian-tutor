'use client'

import { Mic, Square } from 'lucide-react'
import { useConversation } from '@/lib/conversation/ConversationProvider'

export function RecordButton() {
  const { state, startRecording, stopRecording } = useConversation()

  const isRecording = state === 'recording'
  const isPlaying = state === 'playing'
  const isDisabled = isPlaying || state === 'error'

  function handleStart() {
    if (!isDisabled) startRecording()
  }

  function handleStop() {
    if (isRecording) stopRecording()
  }

  // Touch events: preventDefault stops the browser from also firing
  // synthetic mouse events, which would call handleStart/Stop twice.
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
    : isPlaying
      ? 'Воспроизведение…'
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
            : isPlaying
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
        ].join(' ')}
      >
        {isRecording ? (
          <Square className="size-8 fill-current" />
        ) : (
          <Mic className="size-8" />
        )}
      </button>

      <p className="text-xs text-muted-foreground select-none">{label}</p>
    </div>
  )
}
