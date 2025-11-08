"use client"
import { getCapacityStatus } from "@/lib/shifts"

type ShiftIndicatorProps = {
  slot: "AM" | "MID" | "PM"
  capacity: number
  assignmentsCount: number
  onClick?: () => void
}

export function ShiftIndicator({ slot, capacity, assignmentsCount, onClick }: ShiftIndicatorProps) {
  const status = getCapacityStatus(capacity, assignmentsCount)

  const statusColors = {
    available: "bg-green-500 hover:bg-green-600",
    "nearly-full": "bg-orange-500 hover:bg-orange-600",
    full: "bg-red-500 hover:bg-red-600",
    none: "bg-gray-300 hover:bg-gray-400",
  }

  const statusLabels = {
    available: "Available",
    "nearly-full": "Nearly Full",
    full: "Full",
    none: "No Shift",
  }

  return (
    <button
      onClick={onClick}
      className={`${statusColors[status]} group relative flex h-6 w-full items-center justify-center rounded text-xs font-medium text-white transition-colors`}
      title={`${slot}: ${assignmentsCount}/${capacity} - ${statusLabels[status]}`}
    >
      <span className="hidden sm:inline">{slot}</span>
      <span className="sm:hidden">•</span>
      <span className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
        {slot}: {assignmentsCount}/{capacity}
      </span>
    </button>
  )
}
