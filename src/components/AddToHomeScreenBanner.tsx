'use client'

import { useEffect, useState } from 'react'
import { Share } from 'lucide-react'

export function AddToHomeScreenBanner() {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = (window.navigator as any).standalone === true
    const dismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true'

    if (isIOS && !isStandalone && !dismissed) {
      const timer = setTimeout(() => setShouldShow(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true')
    setShouldShow(false)
  }

  if (!shouldShow) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg">
      <div className="max-w-md mx-auto flex items-start gap-3">
        <div className="flex-1 text-sm">
          <p className="font-medium mb-1">Установи как приложение</p>
          <p className="text-muted-foreground">
            Нажми <Share className="inline-block size-3.5 mx-0.5 align-[-2px]" /> внизу Safari →
            «На экран Домой». Будет запускаться без адресной строки.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground touch-manipulation px-2 py-1 shrink-0"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
