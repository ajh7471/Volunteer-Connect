import subprocess
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run(cmd, **kwargs):
    print(f"\n> {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=ROOT, **kwargs)
    return result

# Step 1: Install vitest + coverage provider
print("=== Installing Vitest ===")
r = run([
    "npm", "install", "--save-dev",
    "vitest@2.1.0",
    "@vitest/coverage-v8@2.1.0",
    "--legacy-peer-deps"
], capture_output=False)

if r.returncode != 0:
    print("npm install failed")
    sys.exit(r.returncode)

# Step 2: Run tests
print("\n=== Running Tests ===")
vitest = os.path.join(ROOT, "node_modules", ".bin", "vitest")
r = run([vitest, "run", "--reporter=verbose"], capture_output=False)

print(f"\n=== Done (exit code: {r.returncode}) ===")
sys.exit(r.returncode)
