"use client"

import { isSameDay, isSameMonth } from "@/lib/date"
import { ShiftIndicator } from "./ShiftIndicator"
import type { ShiftWithCapacity } from "@/lib/shifts"

type DayCellProps = {
  date: Date
  currentMonth: Date
  shifts: ShiftWithCapacity[]
  userAssignments: Set<string>
  onDayClick: (date: Date) => void
  onShiftClick?: (shift: ShiftWithCapacity) => void
}

export function DayCell({
  date,
  currentMonth,
  shifts,
  userAssignments,
  onDayClick,
  onShiftClick,
}: DayCellProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to midnight for accurate date comparison

  const cellDate = new Date(date)
  cellDate.setHours(0, 0, 0, 0)

  const isToday = isSameDay(date, new Date())
  const isCurrentMonth = isSameMonth(date, currentMonth)
  const isPastDay = cellDate < today // Check if this day is in the past

  // Get shifts for this date
  const dateStr = date.toISOString().split("T")[0]
  const dayShifts = shifts.filter((s) => s.shift_date === dateStr)

  const now = new Date()
  const availableShifts = dayShifts.filter((shift) => {
    if (isPastDay) return false // Past days have no available shifts

    if (isToday) {
      // For today, check if shift end time has passed
      const [hours, minutes] = shift.end_time.split(":").map(Number)
      const shiftEndTime = new Date()
      shiftEndTime.setHours(hours, minutes, 0, 0)
      return shiftEndTime > now
    }

    return true // Future days show all shifts
  })

  const amShift = availableShifts.find((s) => s.slot === "AM")
  const midShift = availableShifts.find((s) => s.slot === "MID")
  const pmShift = availableShifts.find((s) => s.slot === "PM")

  const handleClick = () => {
    if (!isPastDay) {
      onDayClick(date)
    }
  }

  const handleShiftClick = (shift: ShiftWithCapacity) => {
    if (onShiftClick) {
      onShiftClick(shift)
    }
  }

  return (
    <div
      className={`min-h-20 border-b border-r p-1 sm:min-h-24 sm:p-2 ${
        !isCurrentMonth ? "bg-muted/30" : "bg-background"
      } ${isToday ? "bg-blue-50 dark:bg-blue-950" : ""} ${
        isPastDay ? "bg-muted/50 cursor-not-allowed opacity-60" : "hover:bg-accent cursor-pointer"
      } transition-colors`}
      onClick={handleClick}
    >
      <div
        className={`text-sm font-medium ${!isCurrentMonth || isPastDay ? "text-muted-foreground" : ""} ${isToday ? "text-blue-600 dark:text-blue-400 font-bold" : ""}`}
      >
        {date.getDate()}
      </div>
      <div className="mt-1 space-y-1">
        {amShift && (
          <ShiftIndicator
            slot="AM"
            startTime={amShift.start_time}
            endTime={amShift.end_time}
            capacity={amShift.capacity}
            assignmentsCount={amShift.assignments_count}
            isAssigned={userAssignments.has(amShift.id)}
            onClick={() => handleShiftClick(amShift)}
          />
        )}
        {midShift && (
          <ShiftIndicator
            slot="MID"
            startTime={midShift.start_time}
            endTime={midShift.end_time}
            capacity={midShift.capacity}
            assignmentsCount={midShift.assignments_count}
            isAssigned={userAssignments.has(midShift.id)}
            onClick={() => handleShiftClick(midShift)}
          />
        )}
        {pmShift && (
          <ShiftIndicator
            slot="PM"
            startTime={pmShift.start_time}
            endTime={pmShift.end_time}
            capacity={pmShift.capacity}
            assignmentsCount={pmShift.assignments_count}
            isAssigned={userAssignments.has(pmShift.id)}
            onClick={() => handleShiftClick(pmShift)}
          />
        )}
      </div>
    </div>
  )
}
