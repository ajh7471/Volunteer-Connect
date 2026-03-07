/**
 * Test runner script — installs test deps if needed, then executes Vitest
 */
import { execSync } from "child_process"

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`)
  try {
    execSync(cmd, { stdio: "inherit", ...opts })
  } catch (err) {
    process.exit(err.status ?? 1)
  }
}

// Install test dependencies
run("npm install --save-dev vitest@^2.1.0 @vitest/coverage-v8@^2.1.0 --legacy-peer-deps")

// Run tests
run("npx vitest run --reporter=verbose")
