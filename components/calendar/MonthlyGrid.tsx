import { daysInGrid } from "@/lib/date"
import { DayCell } from "./DayCell"
import type { ShiftWithCapacity } from "@/lib/shifts"

type MonthlyGridProps = {
  currentMonth: Date
  shifts: ShiftWithCapacity[]
  onDayClick: (date: Date) => void
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthlyGrid({ currentMonth, shifts, onDayClick }: MonthlyGridProps) {
  const days = daysInGrid(currentMonth)

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted">
        {WEEKDAYS.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-semibold">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((date, index) => (
          <DayCell key={index} date={date} currentMonth={currentMonth} shifts={shifts} onDayClick={onDayClick} />
        ))}
      </div>
    </div>
  )
}
