'use client'

import { useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

export function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    const audio = ref.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play()
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={toggle}
        className="p-2 -m-2 touch-manipulation text-muted-foreground hover:text-foreground transition-colors"
        aria-label={playing ? 'Пауза' : 'Прослушать'}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      {/* preload="none" is critical — prevents the browser from fetching all audio files on page load */}
      <audio
        ref={ref}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        preload="none"
      />
      <span className="text-xs text-muted-foreground">Прослушать</span>
    </div>
  )
}
