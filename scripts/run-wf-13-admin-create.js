// WF-13: Admin create-user + verify profile + shift CRUD
let p = 0, f = 0; const fl = []
function ok(c, l) { if (c) { p++; console.log("  PASS: " + l) } else { f++; fl.push(l); console.log("  FAIL: " + l) } }
function eq(a, b, l) { if (a === b) { p++; console.log("  PASS: " + l) } else { f++; fl.push(l + " (" + JSON.stringify(a) + " != " + JSON.stringify(b) + ")"); console.log("  FAIL: " + l + " (" + JSON.stringify(a) + " != " + JSON.stringify(b) + ")") } }

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY
const AK = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const H = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=representation" }
const B = SB + "/rest/v1"

async function run() {
  if (!SB || !SK) { console.log("SKIP: no env"); return }
  var em = "wf13-" + Date.now() + "@vc-test.example.com"
  var fy = 2091 + Math.floor(Math.random() * 8)
  var uid = null, sid = null

  // Create user
  console.log("\n--- Create user ---")
  var r1 = await fetch(SB + "/auth/v1/admin/users", { method: "POST", headers: H,
    body: JSON.stringify({ email: em, password: "TestPass123!", email_confirm: true, user_metadata: { name: "WF13 Tester", phone: "(555) 111-2222" } }) })
  var d1 = await r1.json()
  ok(r1.ok && d1.id, "User created")
  uid = d1.id
  if (!uid) return

  await new Promise(function(r) { setTimeout(r, 800) })

  // Verify profile
  console.log("--- Verify profile ---")
  var r2 = await fetch(B + "/profiles?id=eq." + uid + "&select=id,name,phone,role,active", { headers: H })
  var p2 = await r2.json()
  ok(p2.length === 1, "Profile exists")
  if (p2[0]) {
    eq(p2[0].name, "WF13 Tester", "Name correct")
    eq(p2[0].phone, "(555) 111-2222", "Phone correct")
    eq(p2[0].role, "volunteer", "Default role")
    eq(p2[0].active, true, "Active default")
  }

  // Verify auth record
  var r3 = await fetch(SB + "/auth/v1/admin/users/" + uid, { headers: H })
  var d3 = await r3.json()
  eq(d3.email, em, "Auth email matches")

  // Create shift
  console.log("--- Shift CRUD ---")
  var r4 = await fetch(B + "/shifts", { method: "POST", headers: H,
    body: JSON.stringify({ shift_date: fy + "-07-20", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 3 }) })
  var d4 = await r4.json()
  ok(r4.ok && d4[0], "Shift created")
  sid = d4[0] ? d4[0].id : null

  if (sid) {
    // Assign
    var r5 = await fetch(B + "/shift_assignments", { method: "POST", headers: H,
      body: JSON.stringify({ shift_id: sid, user_id: uid }) })
    ok(r5.ok, "Assigned")
    var d5 = await r5.json()
    var aid = d5 && d5[0] ? d5[0].id : null

    // Verify attendee join
    var r6 = await fetch(B + "/shift_assignments?shift_id=eq." + sid + "&select=user_id,profiles(name)", { headers: H })
    var d6 = await r6.json()
    eq(d6.length, 1, "1 attendee")
    if (d6[0] && d6[0].profiles) eq(d6[0].profiles.name, "WF13 Tester", "Attendee name")

    // Update capacity
    await fetch(B + "/shifts?id=eq." + sid, { method: "PATCH", headers: H, body: JSON.stringify({ capacity: 5 }) })
    var r7 = await fetch(B + "/shifts?id=eq." + sid + "&select=capacity", { headers: H })
    var d7 = await r7.json()
    eq(d7[0].capacity, 5, "Cap updated")

    // Remove assignment
    if (aid) await fetch(B + "/shift_assignments?id=eq." + aid, { method: "DELETE", headers: H })
    var r8 = await fetch(B + "/shift_assignments?shift_id=eq." + sid + "&select=id", { headers: H })
    var d8 = await r8.json()
    eq(d8.length, 0, "Unassigned")

    // Delete shift
    await fetch(B + "/shifts?id=eq." + sid, { method: "DELETE", headers: H })
    var r9 = await fetch(B + "/shifts?id=eq." + sid + "&select=id", { headers: H })
    var d9 = await r9.json()
    eq(d9.length, 0, "Shift deleted")
  }

  // Cleanup
  console.log("--- Cleanup ---")
  try { await fetch(B + "/profiles?id=eq." + uid, { method: "DELETE", headers: H }) } catch (e) {}
  await fetch(SB + "/auth/v1/admin/users/" + uid, { method: "DELETE", headers: H })

  console.log("\n" + "=".repeat(50))
  console.log("WF-13: " + p + " passed, " + f + " failed")
  if (fl.length) { console.log("Failed:"); fl.forEach(function(x, i) { console.log("  " + (i+1) + ". " + x) }) }
  if (f === 0) console.log("All WF-13 tests passed!")
}
run()
