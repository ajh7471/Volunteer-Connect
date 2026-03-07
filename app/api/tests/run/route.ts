import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

export const maxDuration = 60

export async function POST() {
  return new Promise<NextResponse>((resolve) => {
    const cwd = process.cwd()
    const vitestBin = path.join(cwd, "node_modules", ".bin", "vitest")

    let stdout = ""
    let stderr = ""

    const proc = spawn(
      vitestBin,
      ["run", "--reporter=json", "--reporter=verbose"],
      {
        cwd,
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.stub",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-stub-key",
          SUPABASE_URL: "https://test.supabase.co",
          SUPABASE_ANON_KEY:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.stub",
          CI: "true",
          FORCE_COLOR: "0",
        },
        shell: false,
      }
    )

    proc.stdout.on("data", (d) => { stdout += d.toString() })
    proc.stderr.on("data", (d) => { stderr += d.toString() })

    proc.on("close", (code) => {
      // vitest --reporter=json outputs JSON to stdout; find the JSON block
      let parsed: any = null
      try {
        // The JSON block starts with { and ends with the last }
        const jsonStart = stdout.indexOf("{")
        if (jsonStart !== -1) {
          parsed = JSON.parse(stdout.slice(jsonStart))
        }
      } catch {
        // fall through — return raw output
      }

      resolve(
        NextResponse.json({
          success: code === 0,
          exitCode: code,
          json: parsed,
          stdout: stdout.slice(0, 8000),
          stderr: stderr.slice(0, 2000),
          ranAt: new Date().toISOString(),
        })
      )
    })

    proc.on("error", (err) => {
      resolve(
        NextResponse.json({
          success: false,
          exitCode: -1,
          json: null,
          stdout: "",
          stderr: err.message,
          ranAt: new Date().toISOString(),
        })
      )
    })
  })
}
