"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Clock, Users, Calendar, Repeat, UserPlus, Share2 } from "lucide-react"
import { getCapacityStatus, type ShiftWithCapacity, type RecurrencePattern } from "@/lib/shifts"
import { parseDate, formatTime12Hour } from "@/lib/date"
import { RecurringSignupModal } from "./RecurringSignupModal"

type ShiftModalProps = {
  shift: ShiftWithCapacity | null
  isOpen: boolean
  onClose: () => void
  currentUserId: string | null
  isAssigned: boolean
  isSigningUp: boolean
  attendees: Array<{ name: string | null; id: string }> | undefined
  isLoadingAttendees: boolean
  onSignUp: (shiftId: string) => void
  onRemove: (shiftId: string) => void
  onJoinWaitlist: (shiftId: string) => void
  onRecurringSignUp?: (shiftId: string, recurrence: RecurrencePattern, endDate: Date) => Promise<void>
}

export function ShiftModal({
  shift,
  isOpen,
  onClose,
  currentUserId,
  isAssigned,
  isSigningUp,
  attendees,
  isLoadingAttendees,
  onSignUp,
  onRemove,
  onJoinWaitlist,
  onRecurringSignUp,
}: ShiftModalProps) {
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [isRecurringSubmitting, setIsRecurringSubmitting] = useState(false)

  if (!shift) return null

  const status = getCapacityStatus(shift.capacity, shift.assignments_count)
  const isFull = status === "full"

  const shiftDate = parseDate(shift.shift_date)
  const formattedDate = shiftDate.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const handleRecurringConfirm = async (recurrence: RecurrencePattern, endDate: Date) => {
    if (!onRecurringSignUp) return
    setIsRecurringSubmitting(true)
    try {
      await onRecurringSignUp(shift.id, recurrence, endDate)
      setShowRecurringModal(false)
    } finally {
      setIsRecurringSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>Review shift information and manage your registration.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Shift Info Header */}
            <div className="flex flex-col gap-4 rounded-lg border p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formattedDate}</span>
                </div>
                <Badge
                  variant={status === "available" ? "default" : status === "nearly-full" ? "secondary" : "destructive"}
                >
                  {status === "available" ? "Available" : status === "nearly-full" ? "Nearly Full" : "Full"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime12Hour(shift.start_time)} - {formatTime12Hour(shift.end_time)} ({shift.slot})
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {shift.assignments_count} / {shift.capacity} spots filled
                </div>
              </div>
            </div>

            {/* Volunteers Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                <span>Volunteers</span>
              </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="p-4 max-h-[200px] overflow-y-auto space-y-2">
                  {isLoadingAttendees ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : attendees && attendees.length > 0 ? (
                    <>
                      {/* Sort: current user first, then alphabetically */}
                      {[...attendees]
                        .sort((a, b) => {
                          if (a.id === currentUserId) return -1
                          if (b.id === currentUserId) return 1
                          return (a.name || "").localeCompare(b.name || "")
                        })
                        .map((attendee) => {
                          const isYou = attendee.id === currentUserId
                          return (
                            <div key={attendee.id} className="flex items-center gap-3 text-sm">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center font-medium text-xs shrink-0 ${
                                  isYou
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {(attendee.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={isYou ? "font-semibold" : "font-medium"}>
                                  {isYou ? "You" : ((attendee.name || "Unknown").split(" ")[0])}
                                </span>
                                {isYou && attendee.name && (
                                  <span className="text-xs text-muted-foreground truncate">{attendee.name}</span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                      {/* "Tell a friend" prompt when user is the only volunteer */}
                      {isAssigned && attendees.length === 1 && attendees[0].id === currentUserId && (
                        <div className="mt-3 rounded-md bg-muted/50 p-3 text-center">
                          <UserPlus className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                          <p className="text-xs font-medium">{"You're the only volunteer so far!"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Tell a friend to join you on this shift
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No volunteers signed up yet. Be the first!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px] bg-transparent">
              Close
            </Button>

            {isAssigned ? (
              <Button
                variant="destructive"
                onClick={() => onRemove(shift.id)}
                disabled={isSigningUp}
                className="w-full sm:w-auto min-h-[44px]"
              >
                {isSigningUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove from Shift"
                )}
              </Button>
            ) : isFull ? (
              <Button
                variant="secondary"
                onClick={() => onJoinWaitlist(shift.id)}
                disabled={isSigningUp}
                className="w-full sm:w-auto min-h-[44px]"
              >
                {isSigningUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={() => onSignUp(shift.id)} disabled={isSigningUp} className="w-full sm:w-auto min-h-[44px]">
                  {isSigningUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing up...
                    </>
                  ) : (
                    "Sign Up"
                  )}
                </Button>
                {onRecurringSignUp && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowRecurringModal(true)}
                    disabled={isSigningUp}
                    className="w-full sm:w-auto min-h-[44px]"
                  >
                    <Repeat className="mr-2 h-4 w-4" />
                    Recurring
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecurringSignupModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        shiftDate={shift.shift_date}
        shiftSlot={shift.slot}
        onConfirm={handleRecurringConfirm}
        isSubmitting={isRecurringSubmitting}
      />
    </>
  )
}
