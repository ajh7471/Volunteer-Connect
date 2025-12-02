// Device Fingerprint Generation
// Creates a unique identifier for the device/browser combination

interface DeviceInfo {
  fingerprint: string
  browserName: string
  osName: string
  deviceType: "desktop" | "mobile" | "tablet"
  userAgent: string
}

export function generateDeviceFingerprint(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      fingerprint: "server",
      browserName: "unknown",
      osName: "unknown",
      deviceType: "desktop",
      userAgent: "server",
    }
  }

  const userAgent = navigator.userAgent
  const browserName = detectBrowser(userAgent)
  const osName = detectOS(userAgent)
  const deviceType = detectDeviceType(userAgent)

  // Create fingerprint from stable browser characteristics
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || "unknown",
    navigator.maxTouchPoints || 0,
  ]

  const fingerprint = hashString(components.join("|"))

  return {
    fingerprint,
    browserName,
    osName,
    deviceType,
    userAgent,
  }
}

function detectBrowser(ua: string): string {
  if (ua.includes("Firefox")) return "Firefox"
  if (ua.includes("Edg")) return "Edge"
  if (ua.includes("Chrome")) return "Chrome"
  if (ua.includes("Safari")) return "Safari"
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera"
  return "Unknown"
}

function detectOS(ua: string): string {
  if (ua.includes("Windows")) return "Windows"
  if (ua.includes("Mac OS")) return "macOS"
  if (ua.includes("Linux")) return "Linux"
  if (ua.includes("Android")) return "Android"
  if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) return "iOS"
  return "Unknown"
}

function detectDeviceType(ua: string): "desktop" | "mobile" | "tablet" {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet"
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile"
  return "desktop"
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback for server-side
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}
