"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, CalendarIcon, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, addMonths } from "date-fns"
import type { RecurrencePattern } from "@/lib/shifts"
import { parseDate } from "@/lib/date"

type RecurringSignupModalProps = {
  isOpen: boolean
  onClose: () => void
  shiftDate: string
  shiftSlot: string
  onConfirm: (recurrence: RecurrencePattern, endDate: Date) => Promise<void>
  isSubmitting: boolean
}

export function RecurringSignupModal({
  isOpen,
  onClose,
  shiftDate,
  shiftSlot,
  onConfirm,
  isSubmitting,
}: RecurringSignupModalProps) {
  const [recurrence, setRecurrence] = useState<RecurrencePattern>("weekly")
  const [endDate, setEndDate] = useState<Date>(() => {
    // Default to 3 months from start date
    const start = parseDate(shiftDate)
    return addMonths(start, 3)
  })
  const [calendarOpen, setCalendarOpen] = useState(false)

  const startDate = useMemo(() => parseDate(shiftDate), [shiftDate])

  const recurrenceOptions = [
    { value: "daily", label: "Daily", description: "Every day" },
    { value: "weekly", label: "Weekly", description: `Every ${format(startDate, "EEEE")}` },
    { value: "biweekly", label: "Biweekly", description: `Every other ${format(startDate, "EEEE")}` },
    { value: "monthly", label: "Monthly", description: `${format(startDate, "do")} of each month` },
  ]

  const handleConfirm = async () => {
    await onConfirm(recurrence, endDate)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Recurring Signup
          </DialogTitle>
          <DialogDescription>
            Sign up for this {shiftSlot} shift on a recurring basis starting {format(startDate, "MMMM d, yyyy")}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recurrence Pattern */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Repeat</Label>
            <RadioGroup
              value={recurrence}
              onValueChange={(value) => setRecurrence(value as RecurrencePattern)}
              className="grid gap-2"
            >
              {recurrenceOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    recurrence === option.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  )}
                  onClick={() => setRecurrence(option.value as RecurrencePattern)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="cursor-pointer font-medium">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* End Date */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">End Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "MMMM d, yyyy") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    if (date) {
                      setEndDate(date)
                      setCalendarOpen(false)
                    }
                  }}
                  disabled={(date) => date <= startDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Recurring signups will be created until this date (inclusive).
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing up...
              </>
            ) : (
              "Confirm Recurring Signup"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
