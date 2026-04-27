export function useSpeech() {
  const isSpeaking = ref(false)
  const currentWordIndex = ref(-1)
  let currentUtterance: SpeechSynthesisUtterance | null = null
  let fallbackTimer: ReturnType<typeof setInterval> | null = null

  function getBestVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined') return null

    const voices = window.speechSynthesis.getVoices()
    const preferred = ['Google UK English Male', 'Google US English', 'Alex', 'Daniel', 'Aaron']

    for (const name of preferred) {
      const match = voices.find((v) => v.name === name)

      if (match) return match
    }

    return voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null
  }

  function clearFallbackTimer() {
    if (fallbackTimer) {
      clearInterval(fallbackTimer)
      fallbackTimer = null
    }
  }

  // Estimate word index by elapsed time when the engine doesn't fire `boundary`
  // events (Safari + some Chromium voices stay silent on word boundaries).
  function startFallbackTimer(words: string[], rate: number) {
    clearFallbackTimer()
    if (words.length === 0) return
    const totalChars = words.reduce((n, w) => n + w.length, 0) || 1
    // Rough heuristic: typical TTS speaks ~14 chars/sec at rate 1.0
    const totalMs = (totalChars / 14) * 1000 / rate
    const startTs = performance.now()
    
    fallbackTimer = setInterval(() => {
      const elapsed = performance.now() - startTs
      const ratio = Math.min(1, elapsed / totalMs)
      const idx = Math.min(words.length - 1, Math.floor(ratio * words.length))
      // Only advance forward — never let the timer overwrite an earlier
      // value the real `boundary` event already wrote.
      if (idx > currentWordIndex.value) currentWordIndex.value = idx
      if (ratio >= 1) clearFallbackTimer()
    }, 80)
  }

  function speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') { resolve(); return }

      window.speechSynthesis.cancel()
      clearFallbackTimer()

      const words = text.split(/\s+/).filter(Boolean)
      currentWordIndex.value = -1

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.88
      utterance.pitch = 1.0
      utterance.volume = 0.95

      const voice = getBestVoice()

      if (voice) utterance.voice = voice

      let realBoundaryFired = false
      let boundaryWordCount = -1

      utterance.onstart = () => {
        isSpeaking.value = true
        // Kick off the fallback timer; if real boundaries arrive, they take over.
        startFallbackTimer(words, utterance.rate)
      }

      utterance.onboundary = (event) => {
        if (event.name !== 'word') return
        realBoundaryFired = true
        clearFallbackTimer()
        boundaryWordCount++
        currentWordIndex.value = boundaryWordCount
      }

      utterance.onend = () => {
        clearFallbackTimer()
        isSpeaking.value = false
        currentWordIndex.value = words.length - 1
        resolve()
      }
      utterance.onerror = () => {
        clearFallbackTimer()
        isSpeaking.value = false
        resolve()
      }

      currentUtterance = utterance
      window.speechSynthesis.speak(utterance)
    })
  }

  function stop() {
    if (typeof window === 'undefined') return

    clearFallbackTimer()
    window.speechSynthesis.cancel()

    isSpeaking.value = false
    currentWordIndex.value = -1
  }

  return { speak, stop, isSpeaking, currentWordIndex }
}
