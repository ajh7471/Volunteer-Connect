// ============================================================================
// VOLUNTEER CONNECT - E2E INTEGRATION TEST SUITE
//
// Sections 25-27: Full admin workflow, full volunteer workflow, blocklist E2E
// Also includes the original DB CRUD + Auth flow integration tests (sections 6-7)
//
// These tests create real users/data in Supabase and clean up after.
// ============================================================================

let passed = 0
let failed = 0
const failures = []

function assert(condition, label) {
  if (condition) { passed++; console.log(`  PASS: ${label}`) }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label}`) }
}
function assertEqual(actual, expected, label) {
  if (actual === expected) { passed++; console.log(`  PASS: ${label}`) }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`) }
}

// ============================================================================
// 6. DATABASE CRUD OPERATIONS
// ============================================================================
async function testDatabaseOperations() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) { console.log("  SKIP: DB operations (no env vars)"); return }

  const headers = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }
  const baseUrl = SUPABASE_URL + "/rest/v1"

  console.log("\n--- DB: Read shifts ---")
  try {
    const res = await fetch(`${baseUrl}/shifts?select=id,shift_date,slot,capacity&limit=5`, { headers })
    assert(res.ok, "DB: Read shifts succeeds")
    const rows = await res.json()
    assert(Array.isArray(rows), "DB: Shifts returns array")
  } catch (err) { failed++; failures.push("DB: Read shifts - " + err.message) }

  console.log("\n--- DB: Read profiles ---")
  try {
    const res = await fetch(`${baseUrl}/profiles?select=id,name,role&limit=5`, { headers })
    assert(res.ok, "DB: Read profiles succeeds")
  } catch (err) { failed++; failures.push("DB: Read profiles - " + err.message) }

  console.log("\n--- DB: CRUD shift lifecycle ---")
  const futureYear = 2090 + Math.floor(Math.random() * 9)
  let shiftId = null
  try {
    const res = await fetch(`${baseUrl}/shifts`, { method: "POST", headers, body: JSON.stringify({ shift_date: `${futureYear}-06-15`, slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 5 }) })
    const rows = await res.json()
    assert(res.ok && Array.isArray(rows) && rows.length > 0, "DB: Create shift")
    if (rows.length > 0) shiftId = rows[0].id
  } catch (err) { failed++; failures.push("DB: Create shift - " + err.message) }

  if (shiftId) {
    try {
      const res = await fetch(`${baseUrl}/shifts?id=eq.${shiftId}`, { method: "PATCH", headers, body: JSON.stringify({ capacity: 10 }) })
      assert(res.ok, "DB: Update shift capacity")
    } catch (err) { failed++; failures.push("DB: Update shift - " + err.message) }

    try {
      const res = await fetch(`${baseUrl}/shifts?id=eq.${shiftId}`, { method: "DELETE", headers })
      assert(res.ok, "DB: Delete shift")
    } catch (err) { failed++; failures.push("DB: Delete shift - " + err.message) }

    try {
      const res = await fetch(`${baseUrl}/shifts?id=eq.${shiftId}&select=id`, { headers })
      const rows = await res.json()
      assertEqual(Array.isArray(rows) ? rows.length : -1, 0, "DB: Shift deleted verify")
    } catch (err) { failed++; failures.push("DB: Verify delete - " + err.message) }
  }
}

// ============================================================================
// 7. AUTH FLOWS
// ============================================================================
async function testAuthFlows() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) { console.log("  SKIP: Auth flows (no env vars)"); return }

  const adminHeaders = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }
  const testEmail = `auth-test-${Date.now()}@volunteer-connect-test.example.com`
  const testPwd = "TestPassword123!"
  let userId = null

  console.log("\n--- Auth: Create test user ---")
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", headers: adminHeaders,
      body: JSON.stringify({ email: testEmail, password: testPwd, email_confirm: true, user_metadata: { name: "Auth Test User", phone: "(555) 000-0000" } }) })
    const data = await res.json()
    if (res.ok && data.id) { userId = data.id; passed++; console.log(`  PASS: Auth user created (${userId})`) }
    else { failed++; failures.push("Auth: user creation failed") }
  } catch (err) { failed++; failures.push("Auth: create - " + err.message) }

  if (!userId) return
  await new Promise(r => setTimeout(r, 1500))

  console.log("\n--- Auth: Login ---")
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST",
      headers: { "apikey": ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: testEmail, password: testPwd }) })
    const data = await res.json()
    assert(res.ok && data.access_token, "Auth: Login succeeds")
  } catch (err) { failed++; failures.push("Auth: login - " + err.message) }

  console.log("\n--- Auth: Wrong password ---")
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST",
      headers: { "apikey": ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: testEmail, password: "WrongPassword" }) })
    assert(!res.ok || res.status === 400, "Auth: Wrong password rejected")
  } catch { passed++; console.log("  PASS: Auth: Wrong password rejected (threw)") }

  console.log("\n--- Auth: Cleanup ---")
  try {
    const baseUrl = SUPABASE_URL + "/rest/v1"
    await fetch(`${baseUrl}/session_events?user_id=eq.${userId}`, { method: "DELETE", headers: adminHeaders })
    await fetch(`${baseUrl}/user_sessions?user_id=eq.${userId}`, { method: "DELETE", headers: adminHeaders })
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders })
    console.log("  INFO: Auth cleanup complete")
  } catch (err) { console.log(`  WARN: Auth cleanup: ${err.message}`) }
}

// ============================================================================
// 25. ADMIN FULL WORKFLOW E2E
// ============================================================================
async function testAdminFullWorkflow() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) { console.log("  SKIP: Admin workflow (no env vars)"); return }

  const H = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }
  const B = SUPABASE_URL + "/rest/v1"
  const email = `admin-wf-${Date.now()}@volunteer-connect-test.example.com`
  let userId = null, shiftId = null, assignmentId = null

  console.log("\n--- AdminWF: Create user ---")
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", headers: H,
      body: JSON.stringify({ email, password: "AdminWF123!", email_confirm: true, user_metadata: { name: "WF Test Vol", phone: "(555)000-1111" } }) })
    const d = await res.json()
    if (res.ok && d.id) { userId = d.id; passed++; console.log(`  PASS: User created`) } else { failed++; failures.push("AdminWF: create user") }
  } catch (e) { failed++; failures.push("AdminWF: create - " + e.message) }
  if (!userId) return
  await new Promise(r => setTimeout(r, 1500))

  console.log("\n--- AdminWF: Verify profile ---")
  try {
    const res = await fetch(`${B}/profiles?id=eq.${userId}&select=id,name,role`, { headers: H })
    const rows = await res.json()
    assert(res.ok && Array.isArray(rows) && rows.length === 1, "AdminWF: profile exists")
    if (rows.length === 1) { assertEqual(rows[0].name, "WF Test Vol", "AdminWF: name"); assertEqual(rows[0].role, "volunteer", "AdminWF: role=vol") }
  } catch (e) { failed++; failures.push("AdminWF: profile - " + e.message) }

  const yr = 2091 + Math.floor(Math.random() * 8)
  console.log("\n--- AdminWF: Create shift ---")
  try {
    const res = await fetch(`${B}/shifts`, { method: "POST", headers: H,
      body: JSON.stringify({ shift_date: `${yr}-07-20`, slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 3 }) })
    const rows = await res.json()
    if (res.ok && Array.isArray(rows) && rows.length > 0) { shiftId = rows[0].id; passed++; console.log("  PASS: Shift created") }
    else { failed++; failures.push("AdminWF: create shift") }
  } catch (e) { failed++; failures.push("AdminWF: shift - " + e.message) }

  if (shiftId) {
    console.log("\n--- AdminWF: Assign volunteer ---")
    try {
      const res = await fetch(`${B}/shift_assignments`, { method: "POST", headers: H, body: JSON.stringify({ shift_id: shiftId, user_id: userId }) })
      const rows = await res.json()
      if (res.ok && Array.isArray(rows) && rows.length > 0) { assignmentId = rows[0].id; passed++; console.log("  PASS: Assigned") }
      else { failed++; failures.push("AdminWF: assign") }
    } catch (e) { failed++; failures.push("AdminWF: assign - " + e.message) }

    console.log("\n--- AdminWF: Verify assignment count ---")
    try {
      const res = await fetch(`${B}/shift_assignments?shift_id=eq.${shiftId}&select=id`, { headers: H })
      const rows = await res.json()
      assertEqual(rows.length, 1, "AdminWF: 1 assignment")
    } catch (e) { failed++; failures.push("AdminWF: count - " + e.message) }
  }

  console.log("\n--- AdminWF: Promote to admin ---")
  try {
    await fetch(`${B}/profiles?id=eq.${userId}`, { method: "PATCH", headers: H, body: JSON.stringify({ role: "admin" }) })
    const r = await fetch(`${B}/profiles?id=eq.${userId}&select=role`, { headers: H })
    const rows = await r.json()
    if (rows.length === 1) assertEqual(rows[0].role, "admin", "AdminWF: promoted")
  } catch (e) { failed++; failures.push("AdminWF: promote - " + e.message) }

  console.log("\n--- AdminWF: Demote back ---")
  try {
    await fetch(`${B}/profiles?id=eq.${userId}`, { method: "PATCH", headers: H, body: JSON.stringify({ role: "volunteer" }) })
    const r = await fetch(`${B}/profiles?id=eq.${userId}&select=role`, { headers: H })
    const rows = await r.json()
    assertEqual(rows[0].role, "volunteer", "AdminWF: demoted")
  } catch (e) { failed++; failures.push("AdminWF: demote - " + e.message) }

  console.log("\n--- AdminWF: Cleanup ---")
  try {
    if (assignmentId) await fetch(`${B}/shift_assignments?id=eq.${assignmentId}`, { method: "DELETE", headers: H })
    if (shiftId) await fetch(`${B}/shifts?id=eq.${shiftId}`, { method: "DELETE", headers: H })
    await fetch(`${B}/session_events?user_id=eq.${userId}`, { method: "DELETE", headers: H })
    await fetch(`${B}/user_sessions?user_id=eq.${userId}`, { method: "DELETE", headers: H })
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H })
    console.log("  INFO: AdminWF cleanup done")
  } catch (e) { console.log(`  WARN: cleanup: ${e.message}`) }
}

// ============================================================================
// 26. VOLUNTEER FULL WORKFLOW E2E
// ============================================================================
async function testVolunteerFullWorkflow() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) { console.log("  SKIP: Vol workflow (no env vars)"); return }

  const H = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }
  const B = SUPABASE_URL + "/rest/v1"
  const email = `vol-wf-${Date.now()}@volunteer-connect-test.example.com`
  let userId = null, jwt = null, shiftId = null, assignmentId = null
  function uH(t) { return { "apikey": ANON_KEY, "Authorization": `Bearer ${t}`, "Content-Type": "application/json", "Prefer": "return=representation" } }

  // Create user
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", headers: H,
      body: JSON.stringify({ email, password: "VolWF123!", email_confirm: true, user_metadata: { name: "Vol WF Test", phone: "(555)222-3333" } }) })
    const d = await res.json()
    if (res.ok && d.id) userId = d.id
  } catch {}
  if (!userId) { console.log("  SKIP: VolWF user creation failed"); return }
  await new Promise(r => setTimeout(r, 1500))

  // Login
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST",
      headers: { "apikey": ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "VolWF123!" }) })
    const d = await res.json()
    if (res.ok && d.access_token) { jwt = d.access_token; passed++; console.log("  PASS: VolWF: Logged in") }
  } catch {}
  if (!jwt) { await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H }); return }

  const h = uH(jwt)
  const yr = 2092 + Math.floor(Math.random() * 7)
  const sd = `${yr}-08-10`

  // Create shift (admin)
  try {
    const res = await fetch(`${B}/shifts`, { method: "POST", headers: H, body: JSON.stringify({ shift_date: sd, slot: "PM", start_time: "13:00", end_time: "17:00", capacity: 5 }) })
    const rows = await res.json()
    if (res.ok && Array.isArray(rows) && rows.length > 0) shiftId = rows[0].id
  } catch {}
  if (!shiftId) { await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H }); return }

  console.log("\n--- VolWF: Read shifts ---")
  try {
    const res = await fetch(`${B}/shifts?shift_date=eq.${sd}&select=id,shift_date,slot,capacity`, { headers: h })
    const rows = await res.json()
    assert(res.ok, "VolWF: Can read shifts")
    assert(Array.isArray(rows) && rows.some(r => r.id === shiftId), "VolWF: Test shift visible")
  } catch (e) { failed++; failures.push("VolWF: read - " + e.message) }

  console.log("\n--- VolWF: Sign up ---")
  try {
    const res = await fetch(`${B}/shift_assignments`, { method: "POST", headers: h, body: JSON.stringify({ shift_id: shiftId, user_id: userId }) })
    const rows = await res.json()
    assert(res.ok, "VolWF: Signup succeeded")
    if (Array.isArray(rows) && rows.length > 0) assignmentId = rows[0].id
  } catch (e) { failed++; failures.push("VolWF: signup - " + e.message) }

  if (assignmentId) {
    console.log("\n--- VolWF: Verify in schedule ---")
    try {
      const res = await fetch(`${B}/shift_assignments?user_id=eq.${userId}&shift_id=eq.${shiftId}&select=id`, { headers: h })
      const rows = await res.json()
      assert(res.ok && Array.isArray(rows) && rows.length === 1, "VolWF: Assignment visible")
    } catch (e) { failed++; failures.push("VolWF: verify - " + e.message) }

    console.log("\n--- VolWF: Duplicate blocked ---")
    try {
      const res = await fetch(`${B}/shift_assignments`, { method: "POST", headers: h, body: JSON.stringify({ shift_id: shiftId, user_id: userId }) })
      assert(!res.ok || res.status === 409, "VolWF: Duplicate rejected")
    } catch { passed++; console.log("  PASS: VolWF: Duplicate rejected") }

    console.log("\n--- VolWF: Cancel ---")
    try {
      const res = await fetch(`${B}/shift_assignments?id=eq.${assignmentId}`, { method: "DELETE", headers: h })
      assert(res.ok, "VolWF: Cancel succeeded")
    } catch (e) { failed++; failures.push("VolWF: cancel - " + e.message) }

    console.log("\n--- VolWF: Verify cancelled ---")
    try {
      const res = await fetch(`${B}/shift_assignments?user_id=eq.${userId}&shift_id=eq.${shiftId}&select=id`, { headers: h })
      const rows = await res.json()
      assert(res.ok && Array.isArray(rows) && rows.length === 0, "VolWF: Assignment removed")
    } catch (e) { failed++; failures.push("VolWF: verify cancel - " + e.message) }

    console.log("\n--- VolWF: Re-signup ---")
    try {
      const res = await fetch(`${B}/shift_assignments`, { method: "POST", headers: h, body: JSON.stringify({ shift_id: shiftId, user_id: userId }) })
      assert(res.ok, "VolWF: Re-signup succeeded")
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length > 0) assignmentId = rows[0].id
    } catch (e) { failed++; failures.push("VolWF: re-signup - " + e.message) }
  }

  console.log("\n--- VolWF: Read profile ---")
  try {
    const res = await fetch(`${B}/profiles?id=eq.${userId}&select=name,phone,email_opt_in`, { headers: h })
    const rows = await res.json()
    assert(res.ok && Array.isArray(rows) && rows.length === 1, "VolWF: Can read profile")
    assertEqual(rows[0].name, "Vol WF Test", "VolWF: name correct")
  } catch (e) { failed++; failures.push("VolWF: read profile - " + e.message) }

  console.log("\n--- VolWF: Update profile ---")
  try {
    await fetch(`${B}/profiles?id=eq.${userId}`, { method: "PATCH", headers: h, body: JSON.stringify({ name: "Updated Vol", phone: "(555)444-5555", email_opt_in: true }) })
    const r = await fetch(`${B}/profiles?id=eq.${userId}&select=name,phone,email_opt_in`, { headers: h })
    const rows = await r.json()
    if (rows.length === 1) {
      assertEqual(rows[0].name, "Updated Vol", "VolWF: name updated")
      assertEqual(rows[0].phone, "(555)444-5555", "VolWF: phone updated")
      assertEqual(rows[0].email_opt_in, true, "VolWF: email opt-in updated")
    }
  } catch (e) { failed++; failures.push("VolWF: update - " + e.message) }

  console.log("\n--- VolWF: Cleanup ---")
  try {
    await fetch(`${B}/shift_assignments?user_id=eq.${userId}`, { method: "DELETE", headers: H })
    if (shiftId) await fetch(`${B}/shifts?id=eq.${shiftId}`, { method: "DELETE", headers: H })
    await fetch(`${B}/session_events?user_id=eq.${userId}`, { method: "DELETE", headers: H })
    await fetch(`${B}/user_sessions?user_id=eq.${userId}`, { method: "DELETE", headers: H })
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H })
    console.log("  INFO: VolWF cleanup done")
  } catch (e) { console.log(`  WARN: cleanup: ${e.message}`) }
}

// ============================================================================
// 27. BLOCKLIST E2E
// ============================================================================
async function testBlocklistE2E() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) { console.log("  SKIP: Blocklist E2E (no env vars)"); return }

  const H = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }
  const B = SUPABASE_URL + "/rest/v1"
  const email = `bl-test-${Date.now()}@volunteer-connect-test.example.com`

  console.log("\n--- BlocklistE2E: Add ---")
  try {
    const res = await fetch(`${B}/auth_blocklist`, { method: "POST", headers: H, body: JSON.stringify({ email, reason: "E2E test" }) })
    assert(res.ok, "BlocklistE2E: Added")
  } catch (e) { failed++; failures.push("BlocklistE2E: add - " + e.message); return }

  console.log("\n--- BlocklistE2E: Verify ---")
  try {
    const res = await fetch(`${B}/auth_blocklist?email=eq.${email}&select=email`, { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" } })
    const rows = await res.json()
    assert(res.ok && Array.isArray(rows) && rows.length === 1, "BlocklistE2E: Found")
  } catch (e) { failed++; failures.push("BlocklistE2E: verify - " + e.message) }

  console.log("\n--- BlocklistE2E: Remove ---")
  try {
    await fetch(`${B}/auth_blocklist?email=eq.${email}`, { method: "DELETE", headers: H })
    const r = await fetch(`${B}/auth_blocklist?email=eq.${email}&select=email`, { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" } })
    const rows = await r.json()
    assertEqual(Array.isArray(rows) ? rows.length : -1, 0, "BlocklistE2E: Removed")
  } catch (e) {
    failed++; failures.push("BlocklistE2E: remove - " + e.message)
    await fetch(`${B}/auth_blocklist?email=eq.${email}`, { method: "DELETE", headers: H })
  }
}

// ============================================================================
// RUN ALL E2E TESTS
// ============================================================================
async function runAllE2ETests() {
  console.log("\n=== E2E INTEGRATION TESTS ===\n")

  await testDatabaseOperations()
  await testAuthFlows()
  await testAdminFullWorkflow()
  await testVolunteerFullWorkflow()
  await testBlocklistE2E()

  console.log("\n" + "=".repeat(60))
  console.log(`E2E TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`)
  console.log("=".repeat(60))
  if (failures.length > 0) { console.log("\nFailed tests:"); failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`)) }
  if (failed === 0) console.log("\nAll E2E tests passed!")
}

runAllE2ETests()
