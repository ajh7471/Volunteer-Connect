// WF-15: Volunteer signup -> attendee list -> cancel -> re-signup -> profile update
// This is THE bug scenario: after signup, the user must appear in attendee list
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const base = SUPABASE_URL + "/rest/v1"
const adminH = { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Content-Type": "application/json", "Prefer": "return=representation" }
function uH(t) { return { "apikey": ANON_KEY, "Authorization": "Bearer " + t, "Content-Type": "application/json", "Prefer": "return=representation" } }
let passed = 0, failed = 0
const failures = []
function ok(cond, msg) { if (cond) { passed++; console.log("  PASS: " + msg) } else { failed++; failures.push(msg); console.log("  FAIL: " + msg) } }
function eq(a, b, msg) { ok(a === b, msg + " (got " + JSON.stringify(a) + ", want " + JSON.stringify(b) + ")") }

async function run() {
  var ts = Date.now()
  var email = "wf15-" + ts + "@vc-test.example.com"
  var userId, jwt, shiftId, assignmentId

  // 1. Create user + login
  console.log("\n--- Create user + login ---")
  var r = await fetch(SUPABASE_URL + "/auth/v1/admin/users", { method: "POST", headers: adminH,
    body: JSON.stringify({ email: email, password: "WF15pass!", email_confirm: true, user_metadata: { name: "Jane Smith", phone: "(555)100-2000" } }) })
  var d = await r.json()
  if (r.ok && d.id) { userId = d.id; ok(true, "User created") } else { ok(false, "User creation"); return }
  await new Promise(function(r) { setTimeout(r, 800) })

  r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", { method: "POST",
    headers: { "apikey": ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: "WF15pass!" }) })
  d = await r.json()
  if (r.ok && d.access_token) { jwt = d.access_token; ok(true, "Login ok") } else { ok(false, "Login"); return }

  // 2. Create shift
  console.log("\n--- Create shift ---")
  var fy = 2091 + Math.floor(Math.random() * 8)
  r = await fetch(base + "/shifts", { method: "POST", headers: adminH,
    body: JSON.stringify({ shift_date: fy + "-06-15", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 5 }) })
  d = await r.json()
  if (r.ok && Array.isArray(d) && d.length > 0) { shiftId = d[0].id; ok(true, "Shift created") } else { ok(false, "Shift creation"); return }

  // 3. Signup via user JWT (simulates volunteer clicking "Sign Up")
  console.log("\n--- Volunteer signup ---")
  var h = uH(jwt)
  r = await fetch(base + "/shift_assignments", { method: "POST", headers: h,
    body: JSON.stringify({ shift_id: shiftId, user_id: userId }) })
  d = await r.json()
  if (r.ok && Array.isArray(d) && d.length > 0) { assignmentId = d[0].id; ok(true, "Signup ok") } else { ok(false, "Signup") }

  // 4. THE BUG TEST: Fetch attendee list -> user MUST appear with name
  console.log("\n--- Attendee list after signup (THE BUG TEST) ---")
  r = await fetch(base + "/shift_assignments?shift_id=eq." + shiftId + "&select=id,user_id,profiles(id,name)", { headers: adminH })
  d = await r.json()
  ok(Array.isArray(d) && d.length === 1, "Exactly 1 attendee")
  if (d.length > 0) {
    eq(d[0].user_id, userId, "Attendee is the user")
    ok(d[0].profiles && d[0].profiles.name === "Jane Smith", "Attendee name = Jane Smith")
    // Verify first-name-only display logic
    var fullName = d[0].profiles ? d[0].profiles.name : ""
    var firstName = fullName.split(" ")[0]
    eq(firstName, "Jane", "First name only = Jane")
    // Verify "You" label logic: when attendee.id === currentUserId
    ok(d[0].profiles.id === userId, "Attendee id matches -> shows 'You'")
  }

  // 5. Verify assignments_count on shift
  console.log("\n--- Shift count after signup ---")
  r = await fetch(base + "/shifts?id=eq." + shiftId + "&select=id,capacity,assignments_count", { headers: adminH })
  d = await r.json()
  if (d.length > 0) {
    eq(d[0].assignments_count, 1, "assignments_count = 1")
  }

  // 6. Duplicate prevention
  console.log("\n--- Duplicate signup blocked ---")
  r = await fetch(base + "/shift_assignments", { method: "POST", headers: h,
    body: JSON.stringify({ shift_id: shiftId, user_id: userId }) })
  ok(!r.ok || r.status === 409 || r.status === 409, "Duplicate rejected (status " + r.status + ")")

  // 7. Cancel signup
  console.log("\n--- Cancel signup ---")
  r = await fetch(base + "/shift_assignments?id=eq." + assignmentId, { method: "DELETE", headers: h })
  ok(r.ok, "Cancel ok")

  // 8. Verify attendee list empty after cancel
  console.log("\n--- Attendee list after cancel ---")
  r = await fetch(base + "/shift_assignments?shift_id=eq." + shiftId + "&select=id", { headers: adminH })
  d = await r.json()
  eq(Array.isArray(d) ? d.length : -1, 0, "0 attendees after cancel")

  // 9. Re-signup
  console.log("\n--- Re-signup ---")
  r = await fetch(base + "/shift_assignments", { method: "POST", headers: h,
    body: JSON.stringify({ shift_id: shiftId, user_id: userId }) })
  d = await r.json()
  ok(r.ok, "Re-signup ok")
  if (Array.isArray(d) && d.length > 0) assignmentId = d[0].id

  // 10. Verify attendee back
  r = await fetch(base + "/shift_assignments?shift_id=eq." + shiftId + "&select=id,user_id", { headers: adminH })
  d = await r.json()
  eq(Array.isArray(d) ? d.length : 0, 1, "1 attendee after re-signup")

  // 11. Profile update
  console.log("\n--- Profile update ---")
  r = await fetch(base + "/profiles?id=eq." + userId, { method: "PATCH", headers: h,
    body: JSON.stringify({ name: "Jane Updated", phone: "(555)999-8888", email_opt_in: true }) })
  ok(r.ok, "Profile PATCH ok")
  r = await fetch(base + "/profiles?id=eq." + userId + "&select=name,phone,email_opt_in", { headers: h })
  d = await r.json()
  if (d.length > 0) {
    eq(d[0].name, "Jane Updated", "Name persisted")
    eq(d[0].phone, "(555)999-8888", "Phone persisted")
    eq(d[0].email_opt_in, true, "Email opt-in persisted")
  }

  // 12. Verify attendee list shows UPDATED name
  console.log("\n--- Attendee list shows updated name ---")
  r = await fetch(base + "/shift_assignments?shift_id=eq." + shiftId + "&select=id,profiles(name)", { headers: adminH })
  d = await r.json()
  if (d.length > 0) {
    eq(d[0].profiles.name, "Jane Updated", "Attendee shows updated name")
    eq(d[0].profiles.name.split(" ")[0], "Jane", "First name still Jane")
  }

  // Cleanup
  console.log("\n--- Cleanup ---")
  try {
    await fetch(base + "/shift_assignments?user_id=eq." + userId, { method: "DELETE", headers: adminH })
    await fetch(base + "/shifts?id=eq." + shiftId, { method: "DELETE", headers: adminH })
    await fetch(base + "/session_events?user_id=eq." + userId, { method: "DELETE", headers: adminH })
    await fetch(base + "/user_sessions?user_id=eq." + userId, { method: "DELETE", headers: adminH })
    await fetch(SUPABASE_URL + "/auth/v1/admin/users/" + userId, { method: "DELETE", headers: adminH })
  } catch (e) { console.log("  WARN: cleanup " + e.message) }

  console.log("\n==================================================")
  console.log("WF-15: " + passed + " passed, " + failed + " failed")
  if (failures.length > 0) { console.log("Failed:"); failures.forEach(function(f, i) { console.log("  " + (i+1) + ". " + f) }) }
  if (failed === 0) console.log("All WF-15 tests passed!")
}
run()
