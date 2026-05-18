import { useEffect } from 'react'

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let wakeLock: WakeLockSentinel | null = null
    let isCancelled = false

    const acquire = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lock = await (navigator as any).wakeLock.request('screen')
        if (isCancelled) {
          lock.release()
          return
        }
        wakeLock = lock
      } catch (err) {
        console.warn('Wake lock failed:', err)
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLock) {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLock?.release().catch(() => {})
    }
  }, [active])
}
