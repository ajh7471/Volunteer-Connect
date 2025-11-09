export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export function daysInGrid(d: Date) {
  const start = startOfMonth(d),
    end = endOfMonth(d)
  const startWeekday = (start.getDay() + 6) % 7
  const cells: Date[] = []

  for (let i = 0; i < startWeekday; i++) {
    const prev = new Date(start)
    prev.setDate(prev.getDate() - (startWeekday - i))
    cells.push(prev)
  }

  for (let i = 1; i <= end.getDate(); i++) cells.push(new Date(start.getFullYear(), start.getMonth(), i))

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    cells.push(next)
  }

  return cells
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function parseDate(dateString: string): Date {
  // Parse date string as local date (YYYY-MM-DD) without timezone conversion
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateForDisplay(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDate(dateString)
  return date.toLocaleDateString("default", options)
}
