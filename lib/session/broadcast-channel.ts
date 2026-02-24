// Cross-Tab Communication for Session Synchronization

type MessageType = "SESSION_LOGOUT" | "SESSION_REFRESH" | "SESSION_ACTIVITY" | "SESSION_TIMEOUT_WARNING"

interface BroadcastMessage {
  type: MessageType
  payload?: unknown
  timestamp: number
  tabId: string
}

const CHANNEL_NAME = "volunteer-hub-session"
let channel: BroadcastChannel | null = null
let tabId = ""

export function initBroadcastChannel(onMessage: (message: BroadcastMessage) => void): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  // Generate unique tab ID
  tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Store tab ID for this session
  sessionStorage.setItem("session_tab_id", tabId)

  try {
    channel = new BroadcastChannel(CHANNEL_NAME)

    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      // Ignore messages from this tab
      if (event.data.tabId === tabId) return
      onMessage(event.data)
    }

    channel.onmessageerror = (error) => {
      console.error("[Session] BroadcastChannel message error:", error)
    }
  } catch (error) {
    // Fallback for browsers that don't support BroadcastChannel
    console.warn("[Session] BroadcastChannel not supported, using localStorage fallback")

    const storageHandler = (event: StorageEvent) => {
      if (event.key === CHANNEL_NAME && event.newValue) {
        try {
          const message = JSON.parse(event.newValue) as BroadcastMessage
          if (message.tabId !== tabId) {
            onMessage(message)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener("storage", storageHandler)

    return () => {
      window.removeEventListener("storage", storageHandler)
    }
  }

  return () => {
    if (channel) {
      channel.close()
      channel = null
    }
  }
}

export function broadcastMessage(type: MessageType, payload?: unknown): void {
  const message: BroadcastMessage = {
    type,
    payload,
    timestamp: Date.now(),
    tabId,
  }

  if (channel) {
    try {
      channel.postMessage(message)
    } catch (error) {
      console.error("[Session] Failed to broadcast message:", error)
    }
  } else if (typeof window !== "undefined") {
    // Fallback to localStorage for cross-tab communication
    try {
      localStorage.setItem(CHANNEL_NAME, JSON.stringify(message))
      // Clear immediately to allow future messages with same content
      setTimeout(() => localStorage.removeItem(CHANNEL_NAME), 100)
    } catch {
      // Ignore storage errors
    }
  }
}

export function getTabId(): string {
  return tabId
}
