"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle2, XCircle, Clock, Play, RotateCcw,
  ChevronDown, ChevronRight, AlertTriangle, FlaskConical,
  FileCode2, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types (mirrors vitest --reporter=json output shape) ────────────────────

interface VitestTestResult {
  name: string
  status: "passed" | "failed" | "skipped" | "pending"
  duration?: number
  failureMessages?: string[]
}

interface VitestSuite {
  name: string          // file path
  status: "passed" | "failed"
  duration?: number
  assertionResults: VitestTestResult[]
}

interface VitestJSON {
  numPassedTests: number
  numFailedTests: number
  numPendingTests: number
  numTotalTests: number
  startTime: number
  success: boolean
  testResults: VitestSuite[]
}

interface RunResult {
  success: boolean
  exitCode: number | null
  json: VitestJSON | null
  stdout: string
  stderr: string
  ranAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function suiteName(filePath: string) {
  // e.g. "/__tests__/lib/date.test.ts" → "lib/date"
  return filePath
    .replace(/.*__tests__[\\/]/, "")
    .replace(/\.(test|spec)\.(ts|tsx|js)$/, "")
    .replace(/\\/g, "/")
}

function suiteGroup(filePath: string) {
  const name = suiteName(filePath)
  if (name.startsWith("lib/")) return "Utility (lib)"
  if (name.startsWith("admin/actions")) return "Admin — Actions"
  if (name.includes("integration")) return "Admin — Integration"
  return "Other"
}

function ms(duration?: number) {
  if (!duration) return ""
  if (duration < 1000) return `${Math.round(duration)}ms`
  return `${(duration / 1000).toFixed(2)}s`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusIcon({ status, size = 14 }: { status: string; size?: number }) {
  if (status === "passed") return <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" style={{ width: size, height: size }} />
  if (status === "failed")  return <XCircle      className="text-destructive shrink-0" style={{ width: size, height: size }} />
  return <Clock className="text-muted-foreground shrink-0" style={{ width: size, height: size }} />
}

function TestRow({ test }: { test: VitestTestResult }) {
  const [open, setOpen] = useState(false)
  const hasMsgs = (test.failureMessages?.length ?? 0) > 0

  return (
    <div className="border-b last:border-0">
      <button
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors",
          test.status === "failed" && "bg-destructive/5 hover:bg-destructive/10"
        )}
        onClick={() => hasMsgs && setOpen((o) => !o)}
        disabled={!hasMsgs}
      >
        <StatusIcon status={test.status} />
        <span className="flex-1 truncate font-mono text-xs">{test.name}</span>
        {test.duration != null && (
          <span className="text-xs text-muted-foreground tabular-nums ml-2">{ms(test.duration)}</span>
        )}
        {hasMsgs && (
          open
            ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && hasMsgs && (
        <div className="px-3 pb-3">
          {test.failureMessages!.map((msg, i) => (
            <pre key={i} className="text-xs bg-destructive/8 text-destructive rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono">
              {msg}
            </pre>
          ))}
        </div>
      )}
    </div>
  )
}

function SuiteCard({ suite }: { suite: VitestSuite }) {
  const [open, setOpen] = useState(suite.status === "failed")
  const passed  = suite.assertionResults.filter((t) => t.status === "passed").length
  const failed  = suite.assertionResults.filter((t) => t.status === "failed").length
  const total   = suite.assertionResults.length

  return (
    <Card className={cn("overflow-hidden", suite.status === "failed" && "border-destructive/40")}>
      <button
        className="w-full text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-3">
            <StatusIcon status={suite.status} size={16} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{suiteName(suite.name)}</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{suite.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-xs font-mono tabular-nums">
                {passed}/{total}
              </Badge>
              {failed > 0 && (
                <Badge variant="destructive" className="text-xs font-mono tabular-nums">
                  {failed} fail
                </Badge>
              )}
              {suite.duration != null && (
                <span className="text-xs text-muted-foreground">{ms(suite.duration)}</span>
              )}
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="p-0 border-t">
          <div>
            {suite.assertionResults.map((test, i) => (
              <TestRow key={i} test={test} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TestsPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runTests = useCallback(async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch("/api/tests/run", { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: RunResult = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message ?? "Unknown error")
    } finally {
      setRunning(false)
    }
  }, [])

  const j = result?.json
  const allSuites = j?.testResults ?? []

  // Group suites by category
  const groups: Record<string, VitestSuite[]> = {}
  for (const suite of allSuites) {
    const g = suiteGroup(suite.name)
    if (!groups[g]) groups[g] = []
    groups[g].push(suite)
  }
  const groupOrder = ["Utility (lib)", "Admin — Actions", "Admin — Integration", "Other"]

  const totalPassed  = j?.numPassedTests ?? 0
  const totalFailed  = j?.numFailedTests ?? 0
  const totalPending = j?.numPendingTests ?? 0
  const totalTests   = j?.numTotalTests ?? 0
  const totalDuration = j ? allSuites.reduce((s, suite) => s + (suite.duration ?? 0), 0) : 0

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Test Suite
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unit, business-logic, and integration tests — run live against the codebase
          </p>
        </div>
        <Button
          onClick={runTests}
          disabled={running}
          className="shrink-0 gap-2"
        >
          {running
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
            : result
            ? <><RotateCcw className="h-4 w-4" /> Re-run</>
            : <><Play className="h-4 w-4" /> Run Tests</>
          }
        </Button>
      </div>

      {/* Summary bar */}
      {j && (
        <div className={cn(
          "rounded-lg border p-4 flex flex-wrap gap-6 items-center",
          j.success ? "border-green-500/40 bg-green-50/50 dark:bg-green-950/20" : "border-destructive/40 bg-destructive/5"
        )}>
          <div className="flex items-center gap-2">
            {j.success
              ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              : <XCircle className="h-5 w-5 text-destructive" />}
            <span className={cn("text-sm font-semibold", j.success ? "text-green-700 dark:text-green-300" : "text-destructive")}>
              {j.success ? "All tests passed" : "Some tests failed"}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-green-700 dark:text-green-400 font-medium tabular-nums">{totalPassed} passed</span>
            {totalFailed > 0 && <span className="text-destructive font-medium tabular-nums">{totalFailed} failed</span>}
            {totalPending > 0 && <span className="text-muted-foreground tabular-nums">{totalPending} pending</span>}
            <span className="text-muted-foreground tabular-nums">{totalTests} total</span>
          </div>
          <span className="text-xs text-muted-foreground ml-auto tabular-nums">
            {ms(totalDuration)} · {new Date(result!.ranAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {j && totalTests > 0 && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", j.success ? "bg-green-500" : "bg-destructive")}
            style={{ width: `${Math.round((totalPassed / totalTests) * 100)}%` }}
          />
        </div>
      )}

      {/* Idle state */}
      {!running && !result && !error && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click <strong>Run Tests</strong> to execute the full test suite</p>
          <p className="text-xs mt-1 opacity-70">Unit tests · Admin actions · Integration workflows</p>
        </div>
      )}

      {/* Running spinner */}
      {running && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <Loader2 className="h-10 w-10 mx-auto mb-3 opacity-40 animate-spin" />
          <p className="text-sm">Running tests…</p>
          <p className="text-xs mt-1 opacity-70">This may take 15–30 seconds</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex gap-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to run tests</p>
            <p className="text-xs mt-0.5 font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Results — grouped by category */}
      {j && groupOrder.map((groupName) => {
        const suites = groups[groupName]
        if (!suites?.length) return null
        const gPassed = suites.reduce((s, su) => s + su.assertionResults.filter((t) => t.status === "passed").length, 0)
        const gTotal  = suites.reduce((s, su) => s + su.assertionResults.length, 0)
        const gFailed = suites.reduce((s, su) => s + su.assertionResults.filter((t) => t.status === "failed").length, 0)

        return (
          <div key={groupName} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <FileCode2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{groupName}</h2>
              <span className="text-xs text-muted-foreground">
                {gPassed}/{gTotal} passed
                {gFailed > 0 && <span className="text-destructive ml-1">· {gFailed} failed</span>}
              </span>
            </div>
            {suites.map((suite, i) => (
              <SuiteCard key={i} suite={suite} />
            ))}
          </div>
        )
      })}

      {/* Raw stdout for debugging if no JSON was parsed */}
      {result && !j && result.stdout && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Raw Output</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <pre className="text-xs font-mono p-4 whitespace-pre-wrap break-words">{result.stdout}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Stderr if any */}
      {result?.stderr && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Stderr / Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-48">
              <pre className="text-xs font-mono p-4 whitespace-pre-wrap break-words text-amber-700 dark:text-amber-400">{result.stderr}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
