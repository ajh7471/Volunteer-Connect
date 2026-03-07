import subprocess
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEST_ENV = {
    **os.environ,
    "NEXT_PUBLIC_SUPABASE_URL": "https://test.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.stub",
    "SUPABASE_SERVICE_ROLE_KEY": "service-role-stub-key",
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.stub",
    "CI": "true",
    "FORCE_COLOR": "0",
}

def run(cmd, **kwargs):
    print(f"\n> {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, cwd=ROOT, env=TEST_ENV, **kwargs)
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

# Step 2: Run tests with verbose reporter
print("\n=== Running Tests ===")
vitest = os.path.join(ROOT, "node_modules", ".bin", "vitest")
r = run([vitest, "run", "--reporter=verbose"], capture_output=False)

print(f"\n=== Done (exit code: {r.returncode}) ===")
sys.exit(r.returncode)
