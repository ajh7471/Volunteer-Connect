import { execSync } from "child_process"

function run(cmd: string, opts: object = {}) {
  console.log("\n> " + cmd)
  execSync(cmd, { stdio: "inherit", ...opts })
}

// Step 1: Install test dependencies
run(
  "npm install --save-dev vitest@2.1.0 @vitest/coverage-v8@2.1.0 --legacy-peer-deps",
  { cwd: process.cwd() }
)

// Step 2: Run all tests via the local vitest binary
run("./node_modules/.bin/vitest run --reporter=verbose", { cwd: process.cwd() })
