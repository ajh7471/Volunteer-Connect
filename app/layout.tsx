import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Analytics } from "@vercel/analytics/react"
import Header from "./components/Header"
import { ToastProvider } from "./components/Toast"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Volunteer Connect",
  description: "Connect volunteers with opportunities",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh bg-background text-foreground`}
      >
        <ToastProvider>
          <Header />
          <div className="container max-w-6xl px-4 py-4 sm:px-6 sm:py-6">{children}</div>
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  )
}
