'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { endSession } from '../actions'

const SOFT_LIMIT_MIN = 25
const HARD_LIMIT_MIN = 45

export function SessionTimer({
  sessionId,
  startedAt,
}: {
  sessionId: string
  startedAt: string
}) {
  const router = useRouter()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [warningDismissed, setWarningDismissed] = useState(false)

  useEffect(() => {
    const startMs = new Date(startedAt).getTime()

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startMs) / 1000)
      setElapsedSeconds(seconds)

      if (seconds >= HARD_LIMIT_MIN * 60) {
        clearInterval(interval)
        void endSession(sessionId)
        // endSession calls redirect() server-side — client navigates to summary automatically
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId, startedAt, router])

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const showWarning = minutes >= SOFT_LIMIT_MIN && !warningDismissed
  const showCritical = minutes >= HARD_LIMIT_MIN - 2

  return (
    <>
      <span
        className={cn(
          'text-sm tabular-nums font-medium',
          showCritical ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>

      {showWarning && (
        <div className="fixed bottom-24 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40 bg-card border border-border rounded-lg p-4 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm">
              <p className="font-medium mb-1">Сессия идёт уже {minutes} минут</p>
              <p className="text-muted-foreground">
                Может, пора завершать? Через {HARD_LIMIT_MIN - minutes} мин сессия закроется
                автоматически.
              </p>
            </div>
            <button
              onClick={() => setWarningDismissed(true)}
              className="p-2 -m-2 touch-manipulation text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
