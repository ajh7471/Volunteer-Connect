// Activity Tracking for Idle Detection

type ActivityCallback = () => void

interface ActivityTrackerOptions {
  idleTimeoutMs: number
  onIdle: ActivityCallback
  onActive: ActivityCallback
  throttleMs?: number
}

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "touchmove", "click", "focus"]

export function createActivityTracker(options: ActivityTrackerOptions) {
  const { idleTimeoutMs, onIdle, onActive, throttleMs = 1000 } = options

  let isIdle = false
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let lastActivityTime = Date.now()
  let throttleTimer: ReturnType<typeof setTimeout> | null = null

  const resetIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer)
    }

    idleTimer = setTimeout(() => {
      if (!isIdle) {
        isIdle = true
        onIdle()
      }
    }, idleTimeoutMs)
  }

  const handleActivity = () => {
    lastActivityTime = Date.now()

    // Throttle activity events
    if (throttleTimer) return

    throttleTimer = setTimeout(() => {
      throttleTimer = null
    }, throttleMs)

    if (isIdle) {
      isIdle = false
      onActive()
    }

    resetIdleTimer()
  }

  const start = () => {
    if (typeof window === "undefined") return

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    resetIdleTimer()
  }

  const stop = () => {
    if (typeof window === "undefined") return

    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, handleActivity)
    })

    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }

    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
  }

  const getLastActivityTime = () => lastActivityTime
  const getIsIdle = () => isIdle

  return {
    start,
    stop,
    getLastActivityTime,
    getIsIdle,
    resetIdleTimer,
  }
}
