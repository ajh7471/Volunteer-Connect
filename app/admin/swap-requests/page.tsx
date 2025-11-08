import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { adminApproveSwap, declineShiftSwap } from "@/app/admin/shift-management-actions"
import { Calendar, User, ArrowRightLeft } from "lucide-react"

export default async function SwapRequestsPage() {
  const supabase = await createServerClient()

  // Verify admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return <div>Admin access required</div>
  }

  // Fetch swap requests
  const { data: swapRequests } = await supabase
    .from("shift_swap_requests")
    .select(`
      *,
      shifts (shift_date, slot, start_time, end_time),
      requesting_user:profiles!requesting_user_id (full_name, email),
      target_user:profiles!target_user_id (full_name, email)
    `)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default"
      case "accepted":
        return "secondary"
      default:
        return "outline"
    }
  }

  async function handleApprove(formData: FormData) {
    "use server"
    const swapId = formData.get("swapId") as string
    await adminApproveSwap(swapId)
  }

  async function handleDecline(formData: FormData) {
    "use server"
    const swapId = formData.get("swapId") as string
    await declineShiftSwap(swapId)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Shift Swap Requests</h1>
        <p className="text-muted-foreground">Review and approve volunteer shift swaps</p>
      </div>

      <div className="grid gap-4">
        {swapRequests?.map((swap: any) => (
          <Card key={swap.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                <Badge variant={getStatusColor(swap.status)}>{swap.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{new Date(swap.created_at).toLocaleDateString()}</div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Requesting:</span>
                </div>
                <p className="text-sm">{swap.requesting_user?.full_name}</p>
                <p className="text-xs text-muted-foreground">{swap.requesting_user?.email}</p>
              </div>

              {swap.target_user && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Target:</span>
                  </div>
                  <p className="text-sm">{swap.target_user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{swap.target_user?.email}</p>
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Shift Details:</span>
              </div>
              <p className="text-sm">
                {new Date(swap.shifts.shift_date).toLocaleDateString()} • {swap.shifts.slot} • {swap.shifts.start_time}{" "}
                - {swap.shifts.end_time}
              </p>
            </div>

            {swap.message && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-1">Message:</p>
                <p className="text-sm text-muted-foreground">{swap.message}</p>
              </div>
            )}

            {swap.status === "accepted" && (
              <div className="flex gap-2">
                <form action={handleApprove} className="flex-1">
                  <input type="hidden" name="swapId" value={swap.id} />
                  <Button type="submit" className="w-full">
                    Approve Swap
                  </Button>
                </form>
                <form action={handleDecline}>
                  <input type="hidden" name="swapId" value={swap.id} />
                  <Button type="submit" variant="outline">
                    Decline
                  </Button>
                </form>
              </div>
            )}
          </Card>
        ))}
      </div>

      {swapRequests?.length === 0 && (
        <Card className="p-12 text-center">
          <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No swap requests</h3>
          <p className="text-muted-foreground">Pending swap requests will appear here for your review</p>
        </Card>
      )}
    </div>
  )
}
