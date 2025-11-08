import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import Header from "./components/Header"
import ToastContainer from "./components/ToastContainer"

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Volunteer Connect",
  description: "Coordinate volunteer shifts with ease",
  manifest: "/manifest.json",
  themeColor: "#8B5CF6",
  appleWebApp: {
    capable: true,
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
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-dvh bg-background font-sans antialiased`}>
        <Header />
        <main className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <ToastContainer />
      </body>
    </html>
  )
}
