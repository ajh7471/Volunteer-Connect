import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PlusCircle, Calendar, Clock, Users } from 'lucide-react'
import { ShiftTemplate } from "@/types/database"

export default async function ShiftTemplatesPage() {
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

  // Fetch templates
  const { data: templates } = await supabase
    .from("shift_templates")
    .select("*")
    .order("created_at", { ascending: false })

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage recurring shift patterns</p>
        </div>
        <Link href="/admin/shift-templates/create">
          <Button size="sm">
            <PlusCircle className="mr-2 h-3.5 w-3.5" />
            Create Template
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template: ShiftTemplate) => (
          <Card key={template.id}>
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{template.name}</h3>
                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{template.description}</p>
                  )}
                </div>
                <Badge variant={template.active ? "default" : "secondary"} className="text-xs ml-2 shrink-0">
                  {template.active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{template.slot} · {template.start_time}–{template.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>Capacity: {template.capacity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="capitalize">{template.recurrence_pattern}</span>
                </div>
                {template.days_of_week && template.days_of_week.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {template.days_of_week.map((day: number) => (
                      <Badge key={day} variant="outline" className="text-xs px-1.5 py-0">
                        {dayNames[day]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Link href={`/admin/shift-templates/${template.id}/apply`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                    Apply
                  </Button>
                </Link>
                <Link href={`/admin/shift-templates/${template.id}/edit`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {templates?.length === 0 && (
        <Card className="p-10 text-center">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold mb-1">No templates yet</h3>
          <p className="text-xs text-muted-foreground mb-4">Create your first shift template to automate scheduling</p>
          <Link href="/admin/shift-templates/create">
            <Button size="sm">
              <PlusCircle className="mr-2 h-3.5 w-3.5" />
              Create Template
            </Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
