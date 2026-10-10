'use client'

import { useEffect, useRef } from 'react'
import { PencilLine, Volume2 } from 'lucide-react'
import { useConversation } from '@/lib/conversation/ConversationProvider'
import { useWakeLock } from '@/hooks/useWakeLock'
import { RecordButton } from './RecordButton'

export function SessionClient() {
  const { messages, error, state, speakText } = useConversation()
  useWakeLock(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 pb-32 md:pb-0">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {msg.role === 'assistant' && msg.correction && (
                <div className="ml-auto max-w-[80%] rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <p className="flex items-start gap-1.5 font-medium">
                    <PencilLine className="size-3.5 mt-0.5 shrink-0" />
                    {msg.correction}
                  </p>
                  {msg.correction_note && (
                    <p className="mt-0.5 pl-5 text-xs opacity-80">{msg.correction_note}</p>
                  )}
                </div>
              )}
              <div
                className={[
                  'flex items-end gap-1',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                ].join(' ')}
              >
                <div
                  className={[
                    'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm',
                  ].join(' ')}
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    disabled={state !== 'idle'}
                    onClick={() => speakText(msg.content)}
                    className="shrink-0 p-2.5 -m-2.5 touch-manipulation text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Прослушать снова"
                  >
                    <Volume2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Fixed bottom panel on mobile, static on desktop */}
      <div
        className={[
          'fixed bottom-0 left-0 right-0 z-30',
          'md:static md:bottom-auto md:left-auto md:right-auto',
          'p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-0',
          'bg-background md:bg-transparent',
          'border-t md:border-t-0',
          'flex items-center justify-center',
        ].join(' ')}
      >
        <RecordButton />
      </div>
    </div>
  )
}
