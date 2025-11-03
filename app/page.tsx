"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { Calendar, Users, Clock } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
          Welcome to Volunteer Connect
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance px-4">
          Coordinate volunteer shifts with ease. Sign up for shifts, view your schedule, and help make a difference.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4 px-4">
          {isAuthenticated ? (
            <Button size="lg" onClick={() => router.push("/calendar")} className="w-full sm:w-auto">
              View Calendar
            </Button>
          ) : (
            <>
              <Button size="lg" onClick={() => router.push("/auth/signup")} className="w-full sm:w-auto">
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth/login")}
                className="w-full sm:w-auto"
              >
                Login
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <Calendar className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Easy Scheduling</CardTitle>
            <CardDescription>View available shifts in a monthly calendar and sign up with one click</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Clock className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Track Your Hours</CardTitle>
            <CardDescription>
              See all your upcoming shifts in one place and manage your volunteer schedule
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Users className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Team Coordination</CardTitle>
            <CardDescription>See who else is volunteering and coordinate with your team members</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* CTA Section */}
      {!isAuthenticated && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-center text-xl sm:text-2xl">Ready to get started?</CardTitle>
            <CardDescription className="text-center">
              Create an account to start signing up for volunteer shifts
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button size="lg" onClick={() => router.push("/auth/signup")} className="w-full sm:w-auto">
              Sign Up Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
