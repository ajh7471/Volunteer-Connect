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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Shift Templates</h1>
          <p className="text-muted-foreground">Create and manage recurring shift patterns</p>
        </div>
        <Link href="/admin/shift-templates/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template: ShiftTemplate) => (
          <Card key={template.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
              <Badge variant={template.active ? "default" : "secondary"}>
                {template.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {template.slot} • {template.start_time} - {template.end_time}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Capacity: {template.capacity}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{template.recurrence_pattern}</span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {template.days_of_week?.map((day: number) => (
                  <Badge key={day} variant="outline" className="text-xs">
                    {dayNames[day]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Link href={`/admin/shift-templates/${template.id}/apply`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Apply Template
                </Button>
              </Link>
              <Link href={`/admin/shift-templates/${template.id}/edit`}>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {templates?.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-4">Create your first shift template to automate scheduling</p>
          <Link href="/admin/shift-templates/create">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
