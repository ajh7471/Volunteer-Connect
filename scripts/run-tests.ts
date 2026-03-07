/**
 * Test runner — installs Vitest if needed, then runs the full test suite
 */
import { execSync } from "child_process"

function run(cmd: string, opts: Record<string, any> = {}) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: "inherit", ...opts })
}

try {
  run("npm install --save-dev vitest@^2.1.0 @vitest/coverage-v8@^2.1.0 --legacy-peer-deps")
  run("npx vitest run --reporter=verbose")
} catch (err: any) {
  process.exit(err?.status ?? 1)
}
