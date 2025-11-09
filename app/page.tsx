"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Users, Mail, Phone, MapPin, Loader2, Heart, Award, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  async function checkAuthAndRedirect() {
    const { data } = await supabase.auth.getUser()
    const uid = data.user?.id

    if (uid) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).single()

      if (profile) {
        if (profile.role === "admin") {
          router.push("/admin")
        } else {
          router.push("/volunteer")
        }
        return
      }
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-accent/20 py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Making a difference, <span className="text-primary">one shift at a time</span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Connect volunteers with opportunities to serve. Streamline scheduling, track impact, and build stronger
              communities through organized volunteer coordination.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                <Link href="/auth/signup">Get Started Free</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-base px-8 py-6 bg-transparent"
              >
                <Link href="#about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50 py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            <div>
              <div className="mb-2 text-4xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Active Volunteers</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Shifts Completed</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-primary">200K+</div>
              <div className="text-sm text-muted-foreground">Hours Volunteered</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="scroll-mt-16 py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              About Volunteer Connect
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              We believe volunteering should be simple, rewarding, and impactful. Our platform bridges the gap between
              passionate volunteers and organizations that need their help.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-2 transition-all hover:border-primary hover:shadow-lg">
              <CardHeader>
                <Heart className="mb-4 h-12 w-12 text-primary" />
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  Empower communities by making volunteer coordination effortless, enabling organizations to focus on
                  their mission while volunteers make meaningful contributions.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 transition-all hover:border-primary hover:shadow-lg">
              <CardHeader>
                <Award className="mb-4 h-12 w-12 text-primary" />
                <CardTitle className="text-2xl">Our Values</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  Transparency, accessibility, and impact drive everything we do. We're committed to building tools that
                  serve both volunteers and organizations equally.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 transition-all hover:border-primary hover:shadow-lg">
              <CardHeader>
                <TrendingUp className="mb-4 h-12 w-12 text-primary" />
                <CardTitle className="text-2xl">Our Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  From local food banks to international nonprofits, we've helped thousands of organizations coordinate
                  millions of volunteer hours across the globe.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="scroll-mt-16 bg-accent/30 py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Powerful Features for Everyone
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Whether you're a volunteer or an administrator, we've built tools to make your experience seamless and
              rewarding.
            </p>
          </div>

          <div className="mb-16">
            <h3 className="mb-6 text-center text-2xl font-semibold">For Volunteers</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Calendar className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">Easy Scheduling</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Browse available shifts in an intuitive calendar view and sign up with a single click. Filter by
                    date, category, or location.
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Clock className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">Track Your Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    See all your completed shifts, total hours volunteered, and upcoming commitments in one personalized
                    dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Users className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">Community Connection</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    See who else is volunteering, coordinate with team members, and build lasting relationships with
                    fellow volunteers.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-center text-2xl font-semibold">For Administrators</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Calendar className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">Advanced Shift Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Create recurring shifts, manage waitlists, handle shift swaps, and respond to emergency coverage
                    requests effortlessly.
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Users className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Manage volunteer accounts, assign shifts, track attendance, and maintain an email blocklist for
                    security.
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Mail className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">Email Communication</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Send individual or mass emails, use templates with variable substitution, schedule campaigns, and
                    respect opt-out preferences.
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <TrendingUp className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">Reporting & Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Track volunteer attendance, analyze shift fill rates, export data to CSV, and make data-driven
                    decisions.
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Calendar className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">Calendar Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Export shifts to iCal format, generate secure calendar sync URLs, and integrate with existing
                    calendar systems.
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <Users className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-xl">Notification Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Respect user preferences for email notifications, reminders, and updates with granular
                    opt-in/opt-out controls.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="scroll-mt-16 py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Get in Touch
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Have questions? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Email</div>
                      <a
                        href="mailto:support@volunteerconnect.org"
                        className="text-muted-foreground hover:text-primary"
                      >
                        support@volunteerconnect.org
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Phone</div>
                      <a href="tel:+15551234567" className="text-muted-foreground hover:text-primary">
                        +1 (555) 123-4567
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Address</div>
                      <p className="text-muted-foreground">
                        123 Community Lane
                        <br />
                        Suite 100
                        <br />
                        San Francisco, CA 94102
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Send a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div>
                      <label htmlFor="name" className="mb-1 block text-sm font-medium">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="mb-1 block text-sm font-medium">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="message" className="mb-1 block text-sm font-medium">
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="How can we help?"
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-primary-foreground sm:py-20">
        <div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Ready to Make an Impact?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-pretty text-lg leading-relaxed opacity-90">
            Join thousands of volunteers and organizations already using Volunteer Connect to coordinate meaningful
            community service.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto text-base px-8 py-6">
              <Link href="/auth/signup">Start Volunteering Today</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-base px-8 py-6 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
