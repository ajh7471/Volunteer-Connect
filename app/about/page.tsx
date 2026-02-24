import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Clock, Shield, Heart, Zap, PawPrint } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <section className="text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/vanderpump-dogs-logo.png"
            alt="Vanderpump Dogs Foundation"
            width={200}
            height={100}
            className="h-auto w-full max-w-[200px] object-contain"
            priority
          />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
          About <span className="text-primary">Volunteer Hub</span>
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-balance text-lg text-muted-foreground sm:text-xl leading-relaxed">
          Helping the Vanderpump Dogs Foundation coordinate its amazing team of volunteers. Sign up for shifts, manage
          your schedule, and help rescue dogs find their forever homes.
        </p>
        <Button asChild size="lg" className="min-h-[44px]">
          <Link href="/auth/signup">Join Our Volunteer Team</Link>
        </Button>
      </section>

      {/* Mission Section */}
      <section className="mx-auto max-w-4xl">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-3xl">
              <PawPrint className="h-8 w-8 text-primary" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-lg leading-relaxed text-muted-foreground">
              The Vanderpump Dogs Foundation is dedicated to rescuing, rehabilitating, and rehoming dogs in need. Our
              volunteer team is the backbone of the rescue operation. This platform streamlines the volunteer experience
              -- from signing up for shifts to tracking your incredible impact.
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

      {/* Hours of Operation */}
      <section className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold">Hours of Operation</h2>
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Monday - Saturday
                </h3>
                <p className="mb-1 text-muted-foreground">Open 9:00 AM - 5:00 PM</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Morning Shift (AM): 9:00 AM - 12:00 PM</p>
                  <p>Midday Shift (MID): 12:00 PM - 3:00 PM</p>
                  <p>Afternoon Shift (PM): 3:00 PM - 5:00 PM</p>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Sunday
                </h3>
                <p className="mb-1 text-muted-foreground">Open 10:00 AM - 5:00 PM</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Morning Shift (AM): 10:00 AM - 12:00 PM</p>
                  <p>Midday Shift (MID): 12:00 PM - 3:00 PM</p>
                  <p>Afternoon Shift (PM): 3:00 PM - 5:00 PM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
      <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center sm:p-12">
        <PawPrint className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">Ready to Help Rescue Dogs?</h2>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Join the Vanderpump Dogs volunteer team and help us give every dog the love and care they deserve.
          Every shift makes a difference.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="min-h-[44px]">
            <Link href="/auth/signup">Sign Up Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-[44px]">
            <Link href="/">Back to Login</Link>
          </Button>
        </div>
      </section>

      {/* Created By Footer */}
      <footer className="border-t border-border pt-8 pb-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Created by{" "}
            <a
              href="https://www.bridgepathaisolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
            >
              Bridgepath AI Solutions
            </a>
          </p>
          <div className="flex items-center gap-5">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/bridgepathaisolutions"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bridgepath AI Solutions on Instagram"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
            {/* Facebook */}
            <a
              href="https://www.facebook.com/Bridgepathaisolutions"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bridgepath AI Solutions on Facebook"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/bridgepathaisolutions/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bridgepath AI Solutions on LinkedIn"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
