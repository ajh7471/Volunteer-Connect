import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Clock, Shield, Heart, Zap } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          About <span className="text-primary">Volunteer Hub</span>
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-balance text-lg text-muted-foreground sm:text-xl">
          We're on a mission to make volunteer coordination simple, efficient, and accessible for everyone. Connect
          with opportunities, manage your schedule, and make a real difference in your community.
        </p>
        <Button asChild size="lg">
          <Link href="/auth/signup">Get Started Today</Link>
        </Button>
      </section>

      {/* Mission Section */}
      <section className="mx-auto max-w-4xl">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-center text-3xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-lg leading-relaxed text-muted-foreground">
              Volunteer Hub bridges the gap between passionate volunteers and organizations that need help. We
              believe that giving back should be easy, organized, and rewarding. Our platform streamlines the entire
              volunteer experience—from discovering opportunities to tracking your impact.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Features Section */}
      <section>
        <h2 className="mb-8 text-center text-3xl font-bold">Why Choose Volunteer Hub?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Calendar className="mb-2 h-12 w-12 text-primary" />
              <CardTitle className="text-xl">Smart Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Browse available shifts in an intuitive calendar view and sign up instantly. No more back-and-forth
                emails or phone calls.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Clock className="mb-2 h-12 w-12 text-primary" />
              <CardTitle className="text-xl">Track Your Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                See your volunteer hours, completed shifts, and total contribution at a glance. Celebrate your
                commitment to making a difference.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Users className="mb-2 h-12 w-12 text-primary" />
              <CardTitle className="text-xl">Team Coordination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Connect with fellow volunteers, see who's working when, and coordinate with your team for a better
                experience.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Shield className="mb-2 h-12 w-12 text-primary" />
              <CardTitle className="text-xl">Secure & Reliable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your data is protected with enterprise-grade security. We take privacy seriously and never share your
                information.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Zap className="mb-2 h-12 w-12 text-primary" />
              <CardTitle className="text-xl">Real-Time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get instant notifications about shift changes, new opportunities, and important updates. Stay informed
                and never miss out.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Heart className="mb-2 h-12 w-12 text-primary" />
              <CardTitle className="text-xl">Built for Good</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Created by volunteers, for volunteers. We understand the challenges and built a platform that truly
                serves the community.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold">How It Works</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  1
                </span>
                Create Your Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Sign up in seconds with just your email. Set up your profile and let us know your interests and
                availability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  2
                </span>
                Browse Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Explore available volunteer shifts in our calendar view. Filter by date, time, or type to find the
                perfect opportunity.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  3
                </span>
                Sign Up & Show Up
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Click to add shifts to your schedule. Get reminders, coordinate with your team, and make a difference
                in your community.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-2xl bg-accent p-8 text-center sm:p-12">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Ready to Make a Difference?</h2>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-muted-foreground">
          Join thousands of volunteers who are using Volunteer Hub to organize their giving and maximize their
          impact.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/auth/signup">Sign Up Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Back to Login</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
