'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = { sessionId: string; label: string }

export function AnalyzeButton({ sessionId, label }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await fetch('/api/analyze-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline" size="sm">
      {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
      {loading ? 'Анализирую…' : label}
    </Button>
  )
}
