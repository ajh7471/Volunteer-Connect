import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from 'next/font/google'
import "./globals.css"
import ToastContainer from "./components/ToastContainer"
import ClientLayout from "@/components/client-layout"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#db2777",
}

export const metadata: Metadata = {
  title: "Volunteer Hub - Vanderpump Dogs",
  description: "Coordinate volunteer shifts at Vanderpump Dogs with ease. Sign up for shifts, manage your schedule, and connect with fellow volunteers.",
  manifest: "/manifest.json",
  appleWebApp: {
    statusBarStyle: "default",
    title: "VP Volunteer",
  },
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} bg-background antialiased`}>
      <body className="min-h-dvh bg-background font-sans">
        <ClientLayout>{children}</ClientLayout>
        <ToastContainer />
      </body>
    </html>
  )
}
