type ToastType = "success" | "error" | "info" | "warning"

export class ToastManager {
  private static listeners: ((message: string, type: ToastType) => void)[] = []

  static subscribe(callback: (message: string, type: ToastType) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  static show(message: string, type: ToastType = "info") {
    this.listeners.forEach((listener) => listener(message, type))
  }

  static success(message: string) {
    this.show(message, "success")
  }

  static error(message: string) {
    this.show(message, "error")
  }

  static info(message: string) {
    this.show(message, "info")
  }

  static warning(message: string) {
    this.show(message, "warning")
  }
}

export const toast = ToastManager
