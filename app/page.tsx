import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="space-y-12 py-12">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-7xl">
          Welcome to <span className="text-primary">Volunteer Connect</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
          Coordinate volunteer shifts with ease. Sign up for shifts, view your schedule, and help make a difference.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/auth/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <Calendar className="mb-2 h-12 w-12 text-primary" />
            <CardTitle className="text-2xl">Easy Scheduling</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              View available shifts in a monthly calendar and sign up with one click
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <Clock className="mb-2 h-12 w-12 text-primary" />
            <CardTitle className="text-2xl">Track Your Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              See all your upcoming shifts in one place and manage your volunteer schedule
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <Users className="mb-2 h-12 w-12 text-primary" />
            <CardTitle className="text-2xl">Team Coordination</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">See who else is volunteering and coordinate with your team members</p>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="rounded-2xl bg-accent p-8 text-center sm:p-12">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Ready to get started?</h2>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-muted-foreground">
          Create an account to start signing up for volunteer shifts
        </p>
        <Button asChild size="lg">
          <Link href="/auth/signup">Sign Up Now</Link>
        </Button>
      </section>
    </div>
  )
}
