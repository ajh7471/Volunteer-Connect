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
    <div className="space-y-12 lg:space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12 lg:py-20">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-balance">
          Welcome to Volunteer Connect
        </h1>
        <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance leading-relaxed">
          Coordinate volunteer shifts with ease. Sign up for shifts, view your schedule, and help make a difference.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          {isAuthenticated ? (
            <Button size="lg" className="text-base sm:text-lg px-8 py-6" onClick={() => router.push("/calendar")}>
              View Calendar
            </Button>
          ) : (
            <>
              <Button size="lg" className="text-base sm:text-lg px-8 py-6" onClick={() => router.push("/auth/signup")}>
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-8 py-6 bg-transparent"
                onClick={() => router.push("/auth/login")}
              >
                Login
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="space-y-4">
            <Calendar className="h-12 w-12 lg:h-14 lg:w-14 text-primary" />
            <CardTitle className="text-xl lg:text-2xl">Easy Scheduling</CardTitle>
            <CardDescription className="text-base lg:text-lg leading-relaxed">
              View available shifts in a monthly calendar and sign up with one click
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="space-y-4">
            <Clock className="h-12 w-12 lg:h-14 lg:w-14 text-primary" />
            <CardTitle className="text-xl lg:text-2xl">Track Your Hours</CardTitle>
            <CardDescription className="text-base lg:text-lg leading-relaxed">
              See all your upcoming shifts in one place and manage your volunteer schedule
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="space-y-4">
            <Users className="h-12 w-12 lg:h-14 lg:w-14 text-primary" />
            <CardTitle className="text-xl lg:text-2xl">Team Coordination</CardTitle>
            <CardDescription className="text-base lg:text-lg leading-relaxed">
              See who else is volunteering and coordinate with your team members
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* CTA Section */}
      {!isAuthenticated && (
        <Card className="bg-muted/50 hover:shadow-lg transition-shadow">
          <CardHeader className="space-y-4 py-8 lg:py-12">
            <CardTitle className="text-center text-2xl lg:text-3xl">Ready to get started?</CardTitle>
            <CardDescription className="text-center text-base lg:text-lg max-w-2xl mx-auto">
              Create an account to start signing up for volunteer shifts
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8 lg:pb-12">
            <Button size="lg" className="text-base sm:text-lg px-8 py-6" onClick={() => router.push("/auth/signup")}>
              Sign Up Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
