"use client"

import { isSameDay, isSameMonth } from "@/lib/date"
import { ShiftIndicator } from "./ShiftIndicator"
import type { ShiftWithCapacity } from "@/lib/shifts"

type DayCellProps = {
  date: Date
  currentMonth: Date
  shifts: ShiftWithCapacity[]
  onDayClick: (date: Date) => void
}

export function DayCell({ date, currentMonth, shifts, onDayClick }: DayCellProps) {
  const today = new Date()
  const isToday = isSameDay(date, today)
  const isCurrentMonth = isSameMonth(date, currentMonth)

  // Get shifts for this date
  const dateStr = date.toISOString().split("T")[0]
  const dayShifts = shifts.filter((s) => s.shift_date === dateStr)

  const amShift = dayShifts.find((s) => s.slot === "AM")
  const midShift = dayShifts.find((s) => s.slot === "MID")
  const pmShift = dayShifts.find((s) => s.slot === "PM")

  return (
    <div
      className={`min-h-20 border-b border-r p-1 sm:min-h-24 sm:p-2 ${
        !isCurrentMonth ? "bg-muted/30" : "bg-background"
      } ${isToday ? "bg-blue-50 dark:bg-blue-950" : ""} hover:bg-accent transition-colors cursor-pointer`}
      onClick={() => onDayClick(date)}
    >
      <div
        className={`text-sm font-medium ${!isCurrentMonth ? "text-muted-foreground" : ""} ${isToday ? "text-blue-600 dark:text-blue-400 font-bold" : ""}`}
      >
        {date.getDate()}
      </div>
      <div className="mt-1 space-y-1">
        {amShift && (
          <ShiftIndicator slot="AM" capacity={amShift.capacity} assignmentsCount={amShift.assignments_count} />
        )}
        {midShift && (
          <ShiftIndicator slot="MID" capacity={midShift.capacity} assignmentsCount={midShift.assignments_count} />
        )}
        {pmShift && (
          <ShiftIndicator slot="PM" capacity={pmShift.capacity} assignmentsCount={pmShift.assignments_count} />
        )}
      </div>
    </div>
  )
}
