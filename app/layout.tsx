import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from 'next/font/google'
import "./globals.css"
import ToastContainer from "./components/ToastContainer"
import ClientLayout from "@/components/client-layout"

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Volunteer Hub",
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
        <ClientLayout>{children}</ClientLayout>
        <ToastContainer />
      </body>
    </html>
  )
}
