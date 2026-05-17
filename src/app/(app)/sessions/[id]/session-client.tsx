'use client'

import { useConversation } from '@/lib/conversation/ConversationProvider'
import { RecordButton } from './RecordButton'

export function SessionClient() {
  const { messages, error } = useConversation()

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Message bubbles — user messages right-aligned; assistant left (future) */}
      {messages.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={[
                'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                msg.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground rounded-br-sm'
                  : 'mr-auto bg-muted text-foreground rounded-bl-sm',
              ].join(' ')}
            >
              {msg.content}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center py-8">
        <RecordButton />
      </div>
    </div>
  )
}
