"use client"

import { useEffect, useState } from "react"
import { ToastManager } from "@/lib/toast"
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react"

type Toast = {
  id: number
  message: string
  type: "success" | "error" | "info" | "warning"
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    let id = 0
    const unsubscribe = ToastManager.subscribe((message, type) => {
      const newToast: Toast = { id: ++id, message, type }
      setToasts((prev) => [...prev, newToast])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, 3000)
    })

    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 border
            ${toast.type === "success" ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""}
            ${toast.type === "error" ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800" : ""}
            ${toast.type === "info" ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800" : ""}
            ${toast.type === "warning" ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800" : ""}
          `}
        >
          {toast.type === "success" && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />}
          {toast.type === "error" && <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />}
          {toast.type === "info" && <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
          {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />}

          <p
            className={`
            text-sm flex-1
            ${toast.type === "success" ? "text-green-900 dark:text-green-100" : ""}
            ${toast.type === "error" ? "text-red-900 dark:text-red-100" : ""}
            ${toast.type === "info" ? "text-blue-900 dark:text-blue-100" : ""}
            ${toast.type === "warning" ? "text-yellow-900 dark:text-yellow-100" : ""}
          `}
          >
            {toast.message}
          </p>

          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
