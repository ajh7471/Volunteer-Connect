"use client"

import { useEffect } from "react"
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
import { Loader2, Clock, Users, Calendar } from 'lucide-react'
import { getCapacityStatus, type ShiftWithCapacity } from "@/lib/shifts"
import { parseDate } from "@/lib/date"

type ShiftModalProps = {
  shift: ShiftWithCapacity | null
  isOpen: boolean
  onClose: () => void
  userId: string | null
  isAssigned: boolean
  isSigningUp: boolean
  attendees: Array<{ name: string; id: string }> | undefined
  isLoadingAttendees: boolean
  onSignUp: (shiftId: string) => void
  onCancel: (shiftId: string) => void
  onJoinWaitlist: (shiftId: string) => void
  onLoadAttendees: (shiftId: string) => void
}

export function ShiftModal({
  shift,
  isOpen,
  onClose,
  userId,
  isAssigned,
  isSigningUp,
  attendees,
  isLoadingAttendees,
  onSignUp,
  onCancel,
  onJoinWaitlist,
  onLoadAttendees,
}: ShiftModalProps) {
  useEffect(() => {
    if (isOpen && shift) {
      onLoadAttendees(shift.id)
    }
  }, [isOpen, shift, onLoadAttendees])

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

  return (
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
                variant={
                  status === "available"
                    ? "default"
                    : status === "nearly-full"
                      ? "secondary"
                      : "destructive"
                }
              >
                {status === "available" ? "Available" : status === "nearly-full" ? "Nearly Full" : "Full"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {shift.start_time} - {shift.end_time} ({shift.slot})
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
                  <div className="space-y-2">
                    {attendees.map((attendee) => (
                      <div key={attendee.id} className="flex items-center gap-3 text-sm">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                          {attendee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={attendee.id === userId ? "font-semibold" : ""}>
                          {attendee.name} {attendee.id === userId && "(You)"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No volunteers signed up yet. Be the first!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {isAssigned ? (
            <Button 
              variant="destructive" 
              onClick={() => onCancel(shift.id)}
              disabled={isSigningUp}
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
            <Button 
              onClick={() => onSignUp(shift.id)}
              disabled={isSigningUp}
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing up...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
