"use client"

import type React from "react"

import { createContext, use, useCallback, useRef, useState } from "react"

type Toast = { id: number; type: "success" | "error"; msg: string }
type Ctx = { push: (t: Omit<Toast, "id">) => void }

const ToastCtx = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const idRef = useRef(1)
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = idRef.current++
    setList((prev) => [...prev, { id, ...t }])
    // auto-remove
    setTimeout(() => setList((prev) => prev.filter((x) => x.id !== id)), 3000)
  }, [])

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {list.map((t) => (
          <div
            key={t.id}
            className={[
              "min-w-56 rounded-lg px-4 py-2 text-sm shadow",
              t.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white",
            ].join(" ")}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = use(ToastCtx)
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>")
  return ctx
}
