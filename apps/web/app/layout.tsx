import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GitHub Issue Summarizer",
  description: "AI-powered GitHub issue summaries using MCP Server",
  keywords: ["GitHub", "Issues", "AI", "Summarizer", "MCP"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
