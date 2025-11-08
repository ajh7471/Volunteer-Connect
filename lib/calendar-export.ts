// Calendar export utilities for generating .ics files

export type CalendarEvent = {
  id: string
  summary: string
  description: string
  location: string
  startDate: Date
  endDate: Date
}

/**
 * Generates an iCalendar (.ics) file content for a single event or multiple events
 */
export function generateICS(events: CalendarEvent[]): string {
  const icsEvents = events.map((event) => generateICSEvent(event)).join("\n")

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Vanderpump Dogs//Volunteer Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`
}

function generateICSEvent(event: CalendarEvent): string {
  const dtstart = formatICSDate(event.startDate)
  const dtend = formatICSDate(event.endDate)
  const dtstamp = formatICSDate(new Date())

  return `BEGIN:VEVENT
UID:${event.id}@vanderpumpdogs.org
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${escapeICSText(event.summary)}
DESCRIPTION:${escapeICSText(event.description)}
LOCATION:${escapeICSText(event.location)}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT`
}

function formatICSDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")

  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

/**
 * Downloads an .ics file to the user's device
 */
export function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
