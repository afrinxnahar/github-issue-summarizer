"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Alert, AlertDescription } from "@repo/ui/alert"
import { Badge } from "@repo/ui/badge"
import { Loader2, Github, Search, AlertCircle, ExternalLink } from "lucide-react"

interface IssueSummary {
  id: number
  title: string
  summary: string
  url?: string
  state?: string
  labels?: string[]
}

interface ApiResponse {
  success: boolean
  data?: IssueSummary[]
  error?: string
}

export default function Home() {
  const [repo, setRepo] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<IssueSummary[]>([])

  const validateRepo = (repoInput: string): boolean => {
    const repoPattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/
    return repoPattern.test(repoInput.trim())
  }

  const summarizeIssues = async () => {
    if (!repo.trim()) {
      setError("Please enter a GitHub repository")
      return
    }

    if (!validateRepo(repo)) {
      setError('Please enter a valid repository format (e.g., "vercel/next.js")')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await fetch("http://localhost:3001/api/tools/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: "summarizeIssues",
          parameters: {
            repo: repo.trim(),
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()

      if (data.success && data.data) {
        setResults(data.data)
        if (data.data.length === 0) {
          setError("No issues found for this repository")
        }
      } else {
        setError(data.error || "Failed to fetch issue summaries")
      }
    } catch (err) {
      console.error("Error fetching summaries:", err)
      setError("Failed to connect to the server. Please make sure the backend is running on http://localhost:3001")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    summarizeIssues()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Github className="h-8 w-8 text-gray-900 dark:text-white" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GitHub Issue Summarizer</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Summarize Repository Issues
            </CardTitle>
            <CardDescription>Enter a GitHub repository to get AI-powered summaries of its issues</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="e.g., vercel/next.js"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  disabled={loading}
                  className="text-base"
                />
              </div>
              <Button type="submit" disabled={loading || !repo.trim()} className="px-6">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Summarize Issues
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">
                Analyzing issues for <span className="font-semibold">{repo}</span>...
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !loading && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Issue Summaries</h2>
              <Badge variant="secondary" className="text-sm">
                {results.length} {results.length === 1 ? "issue" : "issues"} found
              </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.map((issue) => (
                <Card key={issue.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">#{issue.id}</CardTitle>
                      {issue.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => window.open(issue.url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {issue.title && (
                      <CardDescription className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {issue.title}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{issue.summary}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {issue.state && (
                        <Badge variant={issue.state === "open" ? "default" : "secondary"} className="text-xs">
                          {issue.state}
                        </Badge>
                      )}
                      {issue.labels &&
                        issue.labels.slice(0, 2).map((label, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      {issue.labels && issue.labels.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{issue.labels.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && repo && (
          <div className="text-center py-12">
            <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Enter a repository name above to get started</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Powered by</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <span>and AI</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
