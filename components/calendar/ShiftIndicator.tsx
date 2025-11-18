"use client"
import { getCapacityStatus } from "@/lib/shifts"
import { formatTime12Hour } from "@/lib/utils"

type ShiftIndicatorProps = {
  slot: "AM" | "MID" | "PM"
  startTime: string
  endTime: string
  capacity: number
  assignmentsCount: number
  isAssigned?: boolean
  onClick?: () => void
}

export function ShiftIndicator({
  slot,
  startTime,
  endTime,
  capacity,
  assignmentsCount,
  isAssigned = false,
  onClick,
}: ShiftIndicatorProps) {
  const capacityStatus = getCapacityStatus(capacity, assignmentsCount)
  const status = isAssigned ? "registered" : capacityStatus

  const timeLabel = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`

  const statusColors = {
    registered: "bg-blue-600 hover:bg-blue-700",
    available: "bg-green-500 hover:bg-green-600",
    "nearly-full": "bg-orange-500 hover:bg-orange-600",
    full: "bg-red-500 hover:bg-red-600",
    none: "bg-gray-300 hover:bg-gray-400",
  }

  const statusLabels = {
    registered: "Registered",
    available: "Available",
    "nearly-full": "Nearly Full",
    full: "Full",
    none: "Not Available",
  }

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation()
      onClick()
    }
  }

  return (
    <button
      onClick={handleClick}
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
