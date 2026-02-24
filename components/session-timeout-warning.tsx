"use client"

import { useSession } from "@/lib/session/session-provider"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function SessionTimeoutWarning() {
  const { state, extendSession, logout } = useSession()

  if (!state.showTimeoutWarning) {
    return null
  }

  return (
    <AlertDialog open={state.showTimeoutWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in{" "}
            <span className="font-bold text-foreground">{formatTime(state.timeUntilTimeout)}</span> due to inactivity.
            Would you like to stay logged in?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => logout("user_declined_extend")}>
            Log Out
          </Button>
          <AlertDialogAction onClick={extendSession}>Stay Logged In</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
