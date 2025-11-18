"use client"
import { getCapacityStatus } from "@/lib/shifts"

type ShiftIndicatorProps = {
  slot: "AM" | "MID" | "PM"
  startTime: string
  endTime: string
  capacity: number
  assignmentsCount: number
  onClick?: () => void
}

export function ShiftIndicator({ slot, startTime, endTime, capacity, assignmentsCount, onClick }: ShiftIndicatorProps) {
  const status = getCapacityStatus(capacity, assignmentsCount)

  // Format time to be more readable (e.g., "09:00:00" -> "9am")
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number)
    const period = hours >= 12 ? "pm" : "am"
    const displayHours = hours % 12 || 12
    return `${displayHours}${period}`
  }

  const timeLabel = `${formatTime(startTime)}-${formatTime(endTime)}`

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
      title={`${timeLabel}: ${assignmentsCount}/${capacity} - ${statusLabels[status]}`}
    >
      <span className="hidden sm:inline">{timeLabel}</span>
      <span className="sm:hidden">•</span>
      <span className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
        {timeLabel}: {assignmentsCount}/{capacity}
      </span>
    </button>
  )
}
