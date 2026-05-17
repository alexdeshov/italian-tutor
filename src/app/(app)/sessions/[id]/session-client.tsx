'use client'

import { useEffect, useRef } from 'react'
import { Volume2 } from 'lucide-react'
import { useConversation } from '@/lib/conversation/ConversationProvider'
import { RecordButton } from './RecordButton'

export function SessionClient() {
  const { messages, error, state, speakText } = useConversation()
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
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
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
                  className="shrink-0 p-1 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Прослушать снова"
                >
                  <Volume2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="flex justify-center py-8">
        <RecordButton />
      </div>
    </div>
  )
}
