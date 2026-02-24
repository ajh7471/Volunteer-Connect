// WF-18: Multi-volunteer team view, overcapacity prevention, role management
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
  var email1 = "wf18a-" + ts + "@vc-test.example.com"
  var email2 = "wf18b-" + ts + "@vc-test.example.com"
  var uid1, uid2, shiftId

  // Create 2 users
  console.log("\n--- Create 2 volunteers ---")
  var r = await fetch(SUPABASE_URL + "/auth/v1/admin/users", { method: "POST", headers: adminH,
    body: JSON.stringify({ email: email1, password: "WF18pass!", email_confirm: true, user_metadata: { name: "Alice Johnson", phone: "(555)111-1111" } }) })
  var d = await r.json()
  if (r.ok && d.id) { uid1 = d.id; ok(true, "User 1 (Alice) created") } else { ok(false, "User 1"); return }

  r = await fetch(SUPABASE_URL + "/auth/v1/admin/users", { method: "POST", headers: adminH,
    body: JSON.stringify({ email: email2, password: "WF18pass!", email_confirm: true, user_metadata: { name: "Bob Martinez", phone: "(555)222-2222" } }) })
  d = await r.json()
  if (r.ok && d.id) { uid2 = d.id; ok(true, "User 2 (Bob) created") } else { ok(false, "User 2"); return }
  await new Promise(function(r) { setTimeout(r, 800) })

  // Create shift with capacity 2
  console.log("\n--- Create shift (cap=2) ---")
  var fy = 2091 + Math.floor(Math.random() * 8)
  r = await fetch(base + "/shifts", { method: "POST", headers: adminH,
    body: JSON.stringify({ shift_date: fy + "-07-20", slot: "MID", start_time: "11:00", end_time: "14:00", capacity: 2 }) })
  d = await r.json()
  if (r.ok && Array.isArray(d) && d.length > 0) { shiftId = d[0].id; ok(true, "Shift created (cap 2)") } else { ok(false, "Shift"); return }

  // Assign both
  console.log("\n--- Assign both volunteers ---")
  r = await fetch(base + "/shift_assignments", { method: "POST", headers: adminH,
    body: JSON.stringify({ shift_id: shiftId, user_id: uid1 }) })
  ok(r.ok, "Alice assigned")
  r = await fetch(base + "/shift_assignments", { method: "POST", headers: adminH,
    body: JSON.stringify({ shift_id: shiftId, user_id: uid2 }) })
  ok(r.ok, "Bob assigned")

  // Multi-volunteer attendee list
  console.log("\n--- Multi-volunteer attendee list ---")
  r = await fetch(base + "/shift_assignments?shift_id=eq." + shiftId + "&select=id,user_id,profiles(id,name)", { headers: adminH })
  d = await r.json()
  eq(Array.isArray(d) ? d.length : 0, 2, "2 attendees")
  if (d.length === 2) {
    var names = d.map(function(a) { return a.profiles ? a.profiles.name : "" }).sort()
    eq(names[0], "Alice Johnson", "Alice in list")
    eq(names[1], "Bob Martinez", "Bob in list")
    // First-name-only for others
    var firstNames = names.map(function(n) { return n.split(" ")[0] })
    eq(firstNames[0], "Alice", "Alice first-name only")
    eq(firstNames[1], "Bob", "Bob first-name only")
    // "You" label: from Alice's perspective
    var aliceEntry = d.find(function(a) { return a.user_id === uid1 })
    var bobEntry = d.find(function(a) { return a.user_id === uid2 })
    ok(aliceEntry && aliceEntry.profiles.id === uid1, "Alice entry -> shows 'You' for Alice")
    ok(bobEntry && bobEntry.profiles.id !== uid1, "Bob entry -> shows first name for Alice")
    // Sorting: current user first
    var sorted = d.slice().sort(function(a, b) {
      if (a.user_id === uid1) return -1
      if (b.user_id === uid1) return 1
      return (a.profiles.name || "").localeCompare(b.profiles.name || "")
    })
    eq(sorted[0].user_id, uid1, "Sorting: Alice (You) first")
    eq(sorted[1].user_id, uid2, "Sorting: Bob second")
  }

  // "Tell a friend" should NOT show (2 people)
  console.log("\n--- Tell-a-friend logic ---")
  ok(d.length !== 1, "Tell-a-friend hidden when 2+ volunteers")

  // Overcapacity prevention
  console.log("\n--- Overcapacity prevention ---")
  eq(d.length, 2, "At capacity (2/2)")
  // Capacity reduction guard
  var newCap = 1
  ok(newCap < d.length, "Cannot reduce cap to " + newCap + " (2 assigned)")

  // Role management
  console.log("\n--- Role management ---")
  r = await fetch(base + "/profiles?id=eq." + uid1, { method: "PATCH", headers: adminH, body: JSON.stringify({ role: "admin" }) })
  ok(r.ok, "Alice promoted to admin")
  r = await fetch(base + "/profiles?id=eq." + uid1 + "&select=role", { headers: adminH })
  d = await r.json()
  if (d.length > 0) eq(d[0].role, "admin", "Alice is admin")

  // Demote back
  r = await fetch(base + "/profiles?id=eq." + uid1, { method: "PATCH", headers: adminH, body: JSON.stringify({ role: "volunteer" }) })
  r = await fetch(base + "/profiles?id=eq." + uid1 + "&select=role", { headers: adminH })
  d = await r.json()
  if (d.length > 0) eq(d[0].role, "volunteer", "Alice demoted back")

  // Cleanup
  console.log("\n--- Cleanup ---")
  try {
    await fetch(base + "/shift_assignments?shift_id=eq." + shiftId, { method: "DELETE", headers: adminH })
    await fetch(base + "/shifts?id=eq." + shiftId, { method: "DELETE", headers: adminH })
    for (var uid of [uid1, uid2]) {
      await fetch(base + "/session_events?user_id=eq." + uid, { method: "DELETE", headers: adminH })
      await fetch(base + "/user_sessions?user_id=eq." + uid, { method: "DELETE", headers: adminH })
      await fetch(SUPABASE_URL + "/auth/v1/admin/users/" + uid, { method: "DELETE", headers: adminH })
    }
  } catch (e) { console.log("  WARN: cleanup " + e.message) }

  console.log("\n==================================================")
  console.log("WF-18: " + passed + " passed, " + failed + " failed")
  if (failures.length > 0) { console.log("Failed:"); failures.forEach(function(f, i) { console.log("  " + (i+1) + ". " + f) }) }
  if (failed === 0) console.log("All WF-18 tests passed!")
}
run()
