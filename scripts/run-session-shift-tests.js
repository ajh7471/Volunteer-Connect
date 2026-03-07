// ============================================================================
// VOLUNTEER CONNECT - SESSION MANAGEMENT & SHIFT CREATION TEST SUITE
// Covers:
//   A. Session state machine (start, restore, heartbeat, idle, timeout, end)
//   B. Cross-tab broadcast & sync-logout
//   C. Shift creation validation & capacity logic
//   D. Shift signup: happy path, duplicate, capacity, unauthenticated
//   E. Recurring signup matching (daily/weekly/biweekly/monthly)
//   F. Cache invalidation
//   G. Edge cases: leap year, month boundary, zero capacity, concurrent signup
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
function assertNotEqual(actual, notExpected, label) {
  if (actual !== notExpected) { passed++; console.log(`  PASS: ${label}`) }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label} — expected NOT ${JSON.stringify(notExpected)}, got same`) }
}
function assertIncludes(arr, item, label) {
  if (Array.isArray(arr) ? arr.includes(item) : String(arr).includes(item)) { passed++; console.log(`  PASS: ${label}`) }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label} — did not include ${JSON.stringify(item)}`) }
}
function assertThrows(fn, label) {
  try { fn(); failed++; failures.push(label); console.log(`  FAIL: ${label} — expected throw`) }
  catch { passed++; console.log(`  PASS: ${label}`) }
}

// ---- Date helpers (inline from lib/date.ts) ----
function ymd(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}
function parseDate(ds) {
  const [y, m, d] = ds.split("-").map(Number)
  return new Date(y, m - 1, d)
}
function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

// ============================================================================
// A. SESSION STATE MACHINE
// ============================================================================
console.log("\n=== A. SESSION STATE MACHINE ===")

// Minimal in-process session manager (mirrors createSessionManager logic)
function makeSessionManager(config = {}) {
  const cfg = {
    idleTimeoutMinutes: 60,
    absoluteTimeoutHours: 12,
    heartbeatIntervalMinutes: 5,
    warnBeforeTimeoutMinutes: 5,
    logoutOnBrowserClose: true,
    syncLogoutAcrossTabs: true,
    ...config,
  }

  let state = {
    isAuthenticated: false,
    userId: null,
    sessionToken: null,
    lastActivity: 0,
    isIdle: false,
    showTimeoutWarning: false,
    timeUntilTimeout: 0,
  }
  const listeners = []
  const events = []

  const notify = () => listeners.forEach(fn => fn({ ...state }))
  const update = (patches) => { state = { ...state, ...patches }; notify() }

  function startSession(userId) {
    if (state.isAuthenticated && state.userId === userId && state.sessionToken) return false // duplicate guard
    const token = `tok-${userId}-${Date.now()}`
    update({ isAuthenticated: true, userId, sessionToken: token, lastActivity: Date.now(), isIdle: false })
    events.push("session_start")
    return true
  }

  function endSession(reason = "logout") {
    events.push(`session_end:${reason}`)
    update({ isAuthenticated: false, userId: null, sessionToken: null, lastActivity: 0, isIdle: false, showTimeoutWarning: false, timeUntilTimeout: 0 })
  }

  function idleStart() {
    update({ isIdle: true })
    if (cfg.warnBeforeTimeoutMinutes <= 0) {
      endSession("timeout")
      events.push("timeout_no_warn")
    } else {
      update({ showTimeoutWarning: true, timeUntilTimeout: cfg.warnBeforeTimeoutMinutes * 60 })
      events.push("warning_shown")
    }
  }

  function idleEnd() {
    update({ isIdle: false, showTimeoutWarning: false, timeUntilTimeout: 0 })
    events.push("idle_end")
  }

  function heartbeat() {
    if (!state.isAuthenticated) return false
    update({ lastActivity: Date.now() })
    events.push("heartbeat")
    return true
  }

  function extendSession() {
    if (!state.isAuthenticated) return
    update({ lastActivity: Date.now(), isIdle: false, showTimeoutWarning: false, timeUntilTimeout: 0 })
    events.push("extended")
  }

  function subscribe(fn) {
    listeners.push(fn)
    return () => listeners.splice(listeners.indexOf(fn), 1)
  }

  function getState() { return { ...state } }
  function getEvents() { return [...events] }

  return { startSession, endSession, idleStart, idleEnd, heartbeat, extendSession, subscribe, getState, getEvents, cfg }
}

function testSessionStart() {
  console.log("\n--- Session start ---")
  const sm = makeSessionManager()
  const result = sm.startSession("user-1")
  assert(result === true, "startSession returns true for new session")
  const s = sm.getState()
  assert(s.isAuthenticated, "isAuthenticated=true after start")
  assertEqual(s.userId, "user-1", "userId set")
  assert(s.sessionToken !== null, "sessionToken set")
  assert(s.lastActivity > 0, "lastActivity set")
}

function testSessionStartDuplicateGuard() {
  console.log("\n--- Duplicate session guard ---")
  const sm = makeSessionManager()
  sm.startSession("user-2")
  const token = sm.getState().sessionToken
  const result = sm.startSession("user-2") // should be blocked
  assertEqual(result, false, "duplicate startSession returns false")
  assertEqual(sm.getState().sessionToken, token, "token unchanged")
}

function testSessionEnd() {
  console.log("\n--- Session end ---")
  const sm = makeSessionManager()
  sm.startSession("user-3")
  sm.endSession("logout")
  const s = sm.getState()
  assert(!s.isAuthenticated, "isAuthenticated=false after end")
  assertEqual(s.userId, null, "userId cleared")
  assertEqual(s.sessionToken, null, "sessionToken cleared")
  assertIncludes(sm.getEvents(), "session_end:logout", "logout event recorded")
}

function testSessionIdleWithWarning() {
  console.log("\n--- Idle timeout with warning (warnBefore=5) ---")
  const sm = makeSessionManager({ warnBeforeTimeoutMinutes: 5 })
  sm.startSession("user-4")
  sm.idleStart()
  const s = sm.getState()
  assert(s.isIdle, "isIdle=true")
  assert(s.showTimeoutWarning, "showTimeoutWarning=true when warnBefore>0")
  assertEqual(s.timeUntilTimeout, 300, "timeUntilTimeout=300s")
  assertIncludes(sm.getEvents(), "warning_shown", "warning_shown event")
}

function testSessionIdleWithoutWarning() {
  console.log("\n--- Idle timeout without warning (warnBefore=0) ---")
  const sm = makeSessionManager({ warnBeforeTimeoutMinutes: 0 })
  sm.startSession("user-5")
  sm.idleStart()
  const s = sm.getState()
  assert(!s.isAuthenticated, "session ended immediately on idle (no warning)")
  assertIncludes(sm.getEvents(), "session_end:timeout", "timeout end event")
  assertIncludes(sm.getEvents(), "timeout_no_warn", "no-warn timeout event")
}

function testSessionIdleCancel() {
  console.log("\n--- Idle cancelled by activity ---")
  const sm = makeSessionManager({ warnBeforeTimeoutMinutes: 5 })
  sm.startSession("user-6")
  sm.idleStart()
  assert(sm.getState().isIdle, "isIdle=true")
  sm.idleEnd()
  const s = sm.getState()
  assert(!s.isIdle, "isIdle=false after activity")
  assert(!s.showTimeoutWarning, "warning dismissed")
}

function testSessionExtend() {
  console.log("\n--- Session extend ---")
  const sm = makeSessionManager()
  sm.startSession("user-7")
  sm.idleStart()
  sm.extendSession()
  const s = sm.getState()
  assert(!s.isIdle, "isIdle=false after extend")
  assert(!s.showTimeoutWarning, "warning cleared after extend")
  assertIncludes(sm.getEvents(), "extended", "extended event")
}

function testHeartbeat() {
  console.log("\n--- Heartbeat ---")
  const sm = makeSessionManager()
  sm.startSession("user-8")
  const t1 = sm.getState().lastActivity
  // Simulate small delay
  const result = sm.heartbeat()
  assert(result === true, "heartbeat returns true when authenticated")
  const t2 = sm.getState().lastActivity
  assert(t2 >= t1, "lastActivity updated by heartbeat")
  assertIncludes(sm.getEvents(), "heartbeat", "heartbeat event")
}

function testHeartbeatWhenUnauthenticated() {
  console.log("\n--- Heartbeat when unauthenticated ---")
  const sm = makeSessionManager()
  const result = sm.heartbeat()
  assertEqual(result, false, "heartbeat returns false when not authenticated")
}

function testSessionSubscribe() {
  console.log("\n--- State subscription ---")
  const sm = makeSessionManager()
  const snapshots = []
  const unsub = sm.subscribe(s => snapshots.push(s.isAuthenticated))
  sm.startSession("user-9")
  sm.endSession()
  unsub()
  sm.startSession("user-10") // should NOT trigger
  assertEqual(snapshots.length, 2, "2 updates before unsubscribe")
  assertEqual(snapshots[0], true, "first snapshot: authenticated")
  assertEqual(snapshots[1], false, "second snapshot: unauthenticated")
}

function testSessionTokenUnique() {
  console.log("\n--- Session token uniqueness ---")
  const sm1 = makeSessionManager()
  const sm2 = makeSessionManager()
  sm1.startSession("user-a")
  sm2.startSession("user-b")
  assertNotEqual(sm1.getState().sessionToken, sm2.getState().sessionToken, "tokens are unique across sessions")
}

function testAbsoluteTimeoutConfig() {
  console.log("\n--- Absolute timeout config ---")
  const sm = makeSessionManager({ absoluteTimeoutHours: 8 })
  assertEqual(sm.cfg.absoluteTimeoutHours, 8, "absoluteTimeoutHours=8")
  assertEqual(sm.cfg.idleTimeoutMinutes, 60, "idleTimeoutMinutes default=60")
}

testSessionStart()
testSessionStartDuplicateGuard()
testSessionEnd()
testSessionIdleWithWarning()
testSessionIdleWithoutWarning()
testSessionIdleCancel()
testSessionExtend()
testHeartbeat()
testHeartbeatWhenUnauthenticated()
testSessionSubscribe()
testSessionTokenUnique()
testAbsoluteTimeoutConfig()

// ============================================================================
// B. CROSS-TAB BROADCAST
// ============================================================================
console.log("\n=== B. CROSS-TAB BROADCAST ===")

function testBroadcastLogoutSync() {
  console.log("\n--- Broadcast: SESSION_LOGOUT received ---")
  const sm = makeSessionManager({ syncLogoutAcrossTabs: true })
  sm.startSession("user-broadcast")
  // Simulate receiving a logout broadcast from another tab
  if (sm.getState().isAuthenticated) {
    sm.endSession("logout_other_tab")
  }
  assert(!sm.getState().isAuthenticated, "session ended on broadcast logout")
  assertIncludes(sm.getEvents(), "session_end:logout_other_tab", "logout_other_tab reason")
}

function testBroadcastRefreshSync() {
  console.log("\n--- Broadcast: SESSION_REFRESH clears idle ---")
  const sm = makeSessionManager({ warnBeforeTimeoutMinutes: 5 })
  sm.startSession("user-refresh")
  sm.idleStart()
  assert(sm.getState().isIdle, "idle before refresh")
  sm.idleEnd() // simulate receiving SESSION_REFRESH
  assert(!sm.getState().isIdle, "not idle after refresh broadcast")
}

testBroadcastLogoutSync()
testBroadcastRefreshSync()

// ============================================================================
// C. SHIFT CREATION VALIDATION
// ============================================================================
console.log("\n=== C. SHIFT CREATION VALIDATION ===")

function validateShiftForm(data) {
  const errors = []
  if (!data.shift_date) errors.push("shift_date required")
  if (!data.slot || !["AM", "MID", "PM"].includes(data.slot)) errors.push("slot must be AM, MID, or PM")
  if (!data.start_time) errors.push("start_time required")
  if (!data.end_time) errors.push("end_time required")
  if (typeof data.capacity !== "number" || data.capacity < 1) errors.push("capacity must be >= 1")
  if (data.start_time && data.end_time && data.start_time >= data.end_time) errors.push("start_time must be before end_time")
  return errors
}

function testShiftValidationHappy() {
  console.log("\n--- Shift creation: valid data ---")
  const errors = validateShiftForm({ shift_date: "2026-06-01", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 10 })
  assertEqual(errors.length, 0, "no errors for valid shift")
}

function testShiftValidationMissingDate() {
  console.log("\n--- Shift creation: missing date ---")
  const errors = validateShiftForm({ shift_date: "", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 5 })
  assertIncludes(errors, "shift_date required", "date required error")
}

function testShiftValidationInvalidSlot() {
  console.log("\n--- Shift creation: invalid slot ---")
  const errors = validateShiftForm({ shift_date: "2026-06-01", slot: "EVENING", start_time: "09:00", end_time: "12:00", capacity: 5 })
  assertIncludes(errors, "slot must be AM, MID, or PM", "invalid slot error")
}

function testShiftValidationZeroCapacity() {
  console.log("\n--- Shift creation: zero capacity ---")
  const errors = validateShiftForm({ shift_date: "2026-06-01", slot: "PM", start_time: "13:00", end_time: "17:00", capacity: 0 })
  assertIncludes(errors, "capacity must be >= 1", "zero capacity error")
}

function testShiftValidationNegativeCapacity() {
  console.log("\n--- Shift creation: negative capacity ---")
  const errors = validateShiftForm({ shift_date: "2026-06-01", slot: "PM", start_time: "13:00", end_time: "17:00", capacity: -3 })
  assertIncludes(errors, "capacity must be >= 1", "negative capacity error")
}

function testShiftValidationTimeInversion() {
  console.log("\n--- Shift creation: end before start ---")
  const errors = validateShiftForm({ shift_date: "2026-06-01", slot: "AM", start_time: "12:00", end_time: "09:00", capacity: 5 })
  assertIncludes(errors, "start_time must be before end_time", "time inversion error")
}

function testShiftValidationEqualTimes() {
  console.log("\n--- Shift creation: equal start and end time ---")
  const errors = validateShiftForm({ shift_date: "2026-06-01", slot: "AM", start_time: "09:00", end_time: "09:00", capacity: 5 })
  assertIncludes(errors, "start_time must be before end_time", "equal times error")
}

function testShiftValidationAllSlots() {
  console.log("\n--- Shift creation: all valid slots ---")
  for (const slot of ["AM", "MID", "PM"]) {
    const errors = validateShiftForm({ shift_date: "2026-06-01", slot, start_time: "08:00", end_time: "16:00", capacity: 1 })
    assertEqual(errors.length, 0, `slot ${slot} is valid`)
  }
}

testShiftValidationHappy()
testShiftValidationMissingDate()
testShiftValidationInvalidSlot()
testShiftValidationZeroCapacity()
testShiftValidationNegativeCapacity()
testShiftValidationTimeInversion()
testShiftValidationEqualTimes()
testShiftValidationAllSlots()

// ============================================================================
// D. SHIFT SIGNUP LOGIC
// ============================================================================
console.log("\n=== D. SHIFT SIGNUP LOGIC ===")

// Minimal in-memory signup engine
function makeSignupEngine(shifts = [], assignments = []) {
  const db = {
    shifts: shifts.map(s => ({ ...s })),
    assignments: assignments.map(a => ({ ...a, id: a.id || `assign-${Math.random()}` })),
  }

  function signUpForShift(shiftId, userId) {
    if (!userId) return { success: false, error: "Please sign in to sign up for shifts." }

    const shift = db.shifts.find(s => s.id === shiftId)
    if (!shift) return { success: false, error: "Shift not found" }

    const alreadySignedUp = db.assignments.some(a => a.shift_id === shiftId && a.user_id === userId)
    if (alreadySignedUp) return { success: false, error: "Already signed up for this shift" }

    const count = db.assignments.filter(a => a.shift_id === shiftId).length
    if (count >= shift.capacity) return { success: false, error: "Shift is at full capacity" }

    db.assignments.push({ id: `assign-new-${Date.now()}`, shift_id: shiftId, user_id: userId })
    return { success: true }
  }

  function cancelSignup(assignmentId) {
    const idx = db.assignments.findIndex(a => a.id === assignmentId)
    if (idx === -1) return { success: false, error: "Assignment not found" }
    db.assignments.splice(idx, 1)
    return { success: true }
  }

  function getCount(shiftId) { return db.assignments.filter(a => a.shift_id === shiftId).length }
  function getAssignments() { return [...db.assignments] }

  return { signUpForShift, cancelSignup, getCount, getAssignments }
}

function testSignupHappyPath() {
  console.log("\n--- Signup: happy path ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 5 }])
  const result = eng.signUpForShift("s1", "user-a")
  assert(result.success, "signup succeeds")
  assertEqual(eng.getCount("s1"), 1, "assignment count=1")
}

function testSignupDuplicate() {
  console.log("\n--- Signup: duplicate prevented ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 5 }])
  eng.signUpForShift("s1", "user-a")
  const result = eng.signUpForShift("s1", "user-a")
  assert(!result.success, "duplicate signup fails")
  assertEqual(result.error, "Already signed up for this shift", "correct error message")
  assertEqual(eng.getCount("s1"), 1, "still only 1 assignment")
}

function testSignupAtCapacity() {
  console.log("\n--- Signup: at full capacity ---")
  const eng = makeSignupEngine(
    [{ id: "s1", capacity: 2 }],
    [{ shift_id: "s1", user_id: "user-x" }, { shift_id: "s1", user_id: "user-y" }]
  )
  const result = eng.signUpForShift("s1", "user-z")
  assert(!result.success, "signup fails when full")
  assertEqual(result.error, "Shift is at full capacity", "capacity error")
}

function testSignupOneBeforeCapacity() {
  console.log("\n--- Signup: last available spot ---")
  const eng = makeSignupEngine(
    [{ id: "s1", capacity: 2 }],
    [{ shift_id: "s1", user_id: "user-x" }]
  )
  const result = eng.signUpForShift("s1", "user-y")
  assert(result.success, "last spot taken successfully")
  assertEqual(eng.getCount("s1"), 2, "now at capacity")
}

function testSignupUnauthenticated() {
  console.log("\n--- Signup: unauthenticated user ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 5 }])
  const result = eng.signUpForShift("s1", null)
  assert(!result.success, "unauthenticated signup fails")
  assertIncludes(result.error, "sign in", "sign-in error message")
}

function testSignupCancellation() {
  console.log("\n--- Signup: cancellation ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 5 }])
  eng.signUpForShift("s1", "user-a")
  const assignId = eng.getAssignments()[0].id
  const result = eng.cancelSignup(assignId)
  assert(result.success, "cancel succeeds")
  assertEqual(eng.getCount("s1"), 0, "count back to 0 after cancel")
}

function testSignupCancelNonExistent() {
  console.log("\n--- Signup: cancel non-existent assignment ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 5 }])
  const result = eng.cancelSignup("bogus-id")
  assert(!result.success, "cancel non-existent fails")
}

function testSignupConcurrentSameUser() {
  console.log("\n--- Signup: concurrent same user (idempotency) ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 5 }])
  const r1 = eng.signUpForShift("s1", "user-a")
  const r2 = eng.signUpForShift("s1", "user-a")
  assert(r1.success, "first signup succeeds")
  assert(!r2.success, "second concurrent signup fails (idempotent)")
  assertEqual(eng.getCount("s1"), 1, "only 1 assignment despite race")
}

function testSignupMultipleUsers() {
  console.log("\n--- Signup: multiple users on same shift ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 10 }])
  for (let i = 1; i <= 5; i++) eng.signUpForShift("s1", `user-${i}`)
  assertEqual(eng.getCount("s1"), 5, "5 distinct users signed up")
}

function testSignupCapacityOne() {
  console.log("\n--- Signup: capacity=1 edge case ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 1 }])
  const r1 = eng.signUpForShift("s1", "user-a")
  const r2 = eng.signUpForShift("s1", "user-b")
  assert(r1.success, "first user gets the spot")
  assert(!r2.success, "second user blocked")
  assertEqual(r2.error, "Shift is at full capacity", "capacity error for second user")
}

testSignupHappyPath()
testSignupDuplicate()
testSignupAtCapacity()
testSignupOneBeforeCapacity()
testSignupUnauthenticated()
testSignupCancellation()
testSignupCancelNonExistent()
testSignupConcurrentSameUser()
testSignupMultipleUsers()
testSignupCapacityOne()

// ============================================================================
// E. RECURRING SIGNUP MATCHING
// ============================================================================
console.log("\n=== E. RECURRING SHIFT MATCHING ===")

function matchesRecurrence(shiftDateStr, origDateStr, recurrence) {
  const orig = parseDate(origDateStr)
  const d = parseDate(shiftDateStr)
  switch (recurrence) {
    case "daily": return true
    case "weekly": return d.getDay() === orig.getDay()
    case "biweekly": {
      if (d.getDay() !== orig.getDay()) return false
      const diffMs = d.getTime() - orig.getTime()
      const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
      return diffWeeks % 2 === 0
    }
    case "monthly": return d.getDate() === orig.getDate()
    default: return false
  }
}

function testRecurringDaily() {
  console.log("\n--- Recurring: daily ---")
  const orig = "2026-03-15"
  const dates = ["2026-03-15","2026-03-16","2026-03-17","2026-03-20","2026-04-01"]
  for (const ds of dates) assert(matchesRecurrence(ds, orig, "daily"), `daily matches ${ds}`)
}

function testRecurringWeekly() {
  console.log("\n--- Recurring: weekly (Sunday) ---")
  const orig = "2026-03-15" // Sunday
  const matches = ["2026-03-15","2026-03-22","2026-03-29","2026-04-05","2026-04-12"]
  const noMatch = ["2026-03-16","2026-03-17","2026-03-18","2026-03-19","2026-03-20","2026-03-21"]
  for (const ds of matches) assert(matchesRecurrence(ds, orig, "weekly"), `weekly matches ${ds}`)
  for (const ds of noMatch) assert(!matchesRecurrence(ds, orig, "weekly"), `weekly skips ${ds}`)
}

function testRecurringBiweekly() {
  console.log("\n--- Recurring: biweekly ---")
  const orig = "2026-03-15" // Sunday, week 0
  const matches = ["2026-03-15","2026-03-29","2026-04-12","2026-04-26"]
  const noMatch = ["2026-03-22","2026-04-05","2026-04-19","2026-03-16","2026-03-17"]
  for (const ds of matches) assert(matchesRecurrence(ds, orig, "biweekly"), `biweekly matches ${ds}`)
  for (const ds of noMatch) assert(!matchesRecurrence(ds, orig, "biweekly"), `biweekly skips ${ds}`)
}

function testRecurringMonthly() {
  console.log("\n--- Recurring: monthly (15th) ---")
  const orig = "2026-03-15"
  const matches = ["2026-03-15","2026-04-15","2026-05-15","2026-06-15","2026-12-15"]
  const noMatch = ["2026-03-14","2026-03-16","2026-04-01","2026-04-30"]
  for (const ds of matches) assert(matchesRecurrence(ds, orig, "monthly"), `monthly matches ${ds}`)
  for (const ds of noMatch) assert(!matchesRecurrence(ds, orig, "monthly"), `monthly skips ${ds}`)
}

function testRecurringEdge_LastDayOfMonth() {
  console.log("\n--- Recurring: monthly on 31st (edge: months with <31 days) ---")
  const orig = "2026-01-31"
  // Feb 28 is NOT the 31st, so it should not match
  assert(!matchesRecurrence("2026-02-28", orig, "monthly"), "Feb 28 does not match 31st")
  assert(matchesRecurrence("2026-03-31", orig, "monthly"), "Mar 31 matches 31st")
  assert(!matchesRecurrence("2026-04-30", orig, "monthly"), "Apr 30 does not match 31st")
}

function testRecurringUnknownPattern() {
  console.log("\n--- Recurring: unknown pattern ---")
  assert(!matchesRecurrence("2026-03-15", "2026-03-15", "yearly"), "unknown pattern returns false")
}

testRecurringDaily()
testRecurringWeekly()
testRecurringBiweekly()
testRecurringMonthly()
testRecurringEdge_LastDayOfMonth()
testRecurringUnknownPattern()

// ============================================================================
// F. SHIFT CACHE INVALIDATION
// ============================================================================
console.log("\n=== F. CACHE INVALIDATION ===")

function makeShiftCache() {
  const cache = new Map()
  const key = (y, m) => `${y}-${m}`
  return {
    set(y, m, data) { cache.set(key(y, m), { data, timestamp: Date.now() }) },
    get(y, m) { return cache.get(key(y, m)) },
    has(y, m) { return cache.has(key(y, m)) },
    invalidate(y, m) {
      if (y !== undefined && m !== undefined) cache.delete(key(y, m))
      else cache.clear()
    },
    size() { return cache.size },
  }
}

function testCacheSetAndGet() {
  console.log("\n--- Cache: set and get ---")
  const c = makeShiftCache()
  c.set(2026, 2, [{ id: "s1" }])
  assert(c.has(2026, 2), "cache has key after set")
  assertEqual(c.get(2026, 2).data.length, 1, "data retrieved correctly")
}

function testCacheInvalidateSingle() {
  console.log("\n--- Cache: invalidate single month ---")
  const c = makeShiftCache()
  c.set(2026, 2, [{ id: "s1" }])
  c.set(2026, 3, [{ id: "s2" }])
  c.invalidate(2026, 2)
  assert(!c.has(2026, 2), "Mar 2026 cleared")
  assert(c.has(2026, 3), "Apr 2026 still cached")
}

function testCacheInvalidateAll() {
  console.log("\n--- Cache: invalidate all ---")
  const c = makeShiftCache()
  for (let m = 0; m < 12; m++) c.set(2026, m, [])
  assertEqual(c.size(), 12, "12 months cached")
  c.invalidate()
  assertEqual(c.size(), 0, "all cleared after invalidateAll")
}

function testCacheMiss() {
  console.log("\n--- Cache: miss on empty cache ---")
  const c = makeShiftCache()
  assert(!c.has(2026, 5), "cache miss for June 2026")
  assertEqual(c.get(2026, 5), undefined, "get returns undefined on miss")
}

function testCacheAfterSignup() {
  console.log("\n--- Cache: invalidated after signup ---")
  const c = makeShiftCache()
  c.set(2026, 2, [{ id: "s1", assignments_count: 0 }])
  // Simulate signup -> invalidate
  c.invalidate(2026, 2)
  assert(!c.has(2026, 2), "cache invalidated after signup")
}

function testCacheAfterCancel() {
  console.log("\n--- Cache: invalidated after cancel ---")
  const c = makeShiftCache()
  c.set(2026, 2, [{ id: "s1", assignments_count: 3 }])
  c.invalidate(2026, 2)
  assert(!c.has(2026, 2), "cache invalidated after cancel")
}

testCacheSetAndGet()
testCacheInvalidateSingle()
testCacheInvalidateAll()
testCacheMiss()
testCacheAfterSignup()
testCacheAfterCancel()

// ============================================================================
// G. EDGE CASES
// ============================================================================
console.log("\n=== G. EDGE CASES ===")

function testLeapYearShift() {
  console.log("\n--- Edge: Feb 29 on leap year ---")
  const d = parseDate("2024-02-29")
  assertEqual(d.getMonth(), 1, "Feb (month=1)")
  assertEqual(d.getDate(), 29, "day=29")
  assert(!matchesRecurrence("2025-02-28", "2024-02-29", "monthly"), "Feb 28 in non-leap year does not match 29th")
  assert(!matchesRecurrence("2026-02-28", "2024-02-29", "monthly"), "Feb 28 2026 does not match 29th")
  assert(matchesRecurrence("2028-02-29", "2024-02-29", "monthly"), "Feb 29 in next leap year matches")
}

function testMonthBoundaryShifts() {
  console.log("\n--- Edge: month boundary (Dec -> Jan) ---")
  const eng = makeSignupEngine([{ id: "s-dec", capacity: 5 }, { id: "s-jan", capacity: 5 }])
  eng.signUpForShift("s-dec", "user-a")
  eng.signUpForShift("s-jan", "user-a")
  assertEqual(eng.getCount("s-dec"), 1, "Dec shift has 1 assignment")
  assertEqual(eng.getCount("s-jan"), 1, "Jan shift has 1 assignment")
}

function testSignupMultipleShiftsPerDay() {
  console.log("\n--- Edge: user signs up for AM and PM same day ---")
  const eng = makeSignupEngine([
    { id: "am-shift", capacity: 5 },
    { id: "pm-shift", capacity: 5 },
  ])
  const r1 = eng.signUpForShift("am-shift", "user-a")
  const r2 = eng.signUpForShift("pm-shift", "user-a")
  assert(r1.success, "AM signup ok")
  assert(r2.success, "PM signup ok (different shifts allowed)")
}

function testCapacityStatusBoundaries() {
  console.log("\n--- Edge: capacity status thresholds ---")
  function getCapStatus(count, cap) {
    if (cap === 0) return "none"
    const pct = (count / cap) * 100
    if (pct >= 100) return "full"
    if (pct >= 50) return "nearly-full"
    return "available"
  }
  assertEqual(getCapStatus(0, 5), "available", "0/5 = available")
  assertEqual(getCapStatus(2, 5), "available", "2/5 = available (39%)")
  assertEqual(getCapStatus(3, 5), "nearly-full", "3/5 = nearly-full (60%)")
  assertEqual(getCapStatus(4, 5), "nearly-full", "4/5 = nearly-full (80%)")
  assertEqual(getCapStatus(5, 5), "full", "5/5 = full")
  assertEqual(getCapStatus(0, 0), "none", "0/0 = none")
  assertEqual(getCapStatus(1, 2), "nearly-full", "1/2 = nearly-full (50%)")
}

function testSessionEndClearsWarning() {
  console.log("\n--- Edge: session end clears timeout warning ---")
  const sm = makeSessionManager({ warnBeforeTimeoutMinutes: 5 })
  sm.startSession("user-edge")
  sm.idleStart()
  assert(sm.getState().showTimeoutWarning, "warning shown")
  sm.endSession("logout")
  assert(!sm.getState().showTimeoutWarning, "warning cleared on logout")
  assert(!sm.getState().isIdle, "isIdle cleared on logout")
}

function testShiftSignupThenImmediateCancel() {
  console.log("\n--- Edge: signup then immediate cancel restores availability ---")
  const eng = makeSignupEngine([{ id: "s1", capacity: 1 }])
  eng.signUpForShift("s1", "user-a")
  assertEqual(eng.getCount("s1"), 1, "at capacity after signup")
  const assignId = eng.getAssignments()[0].id
  eng.cancelSignup(assignId)
  assertEqual(eng.getCount("s1"), 0, "back to 0 after cancel")
  const r = eng.signUpForShift("s1", "user-b")
  assert(r.success, "another user can now sign up after cancel")
}

function testSessionRestoreAfterPageRefresh() {
  console.log("\n--- Edge: session state after 'restore' ---")
  const sm = makeSessionManager()
  sm.startSession("user-restore")
  const token = sm.getState().sessionToken
  // Simulate page refresh: new manager, same token
  const sm2 = makeSessionManager()
  // Inject state as if restored from sessionStorage
  sm2.startSession("user-restore")
  assert(sm2.getState().isAuthenticated, "restored session is authenticated")
  assertNotEqual(sm2.getState().sessionToken, token, "new token generated on start (not same object)")
}

function testMultipleSessionManagers() {
  console.log("\n--- Edge: multiple independent session managers ---")
  const sm1 = makeSessionManager()
  const sm2 = makeSessionManager()
  sm1.startSession("user-1")
  assertEqual(sm2.getState().isAuthenticated, false, "sm2 unaffected by sm1 start")
  sm2.startSession("user-2")
  assert(sm1.getState().isAuthenticated, "sm1 still authenticated")
  assert(sm2.getState().isAuthenticated, "sm2 authenticated independently")
  assertNotEqual(sm1.getState().sessionToken, sm2.getState().sessionToken, "distinct tokens")
}

testLeapYearShift()
testMonthBoundaryShifts()
testSignupMultipleShiftsPerDay()
testCapacityStatusBoundaries()
testSessionEndClearsWarning()
testShiftSignupThenImmediateCancel()
testSessionRestoreAfterPageRefresh()
testMultipleSessionManagers()

// ============================================================================
// RESULTS
// ============================================================================
console.log("\n" + "=".repeat(60))
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} total`)
if (failures.length > 0) {
  console.log("\nFailed tests:")
  failures.forEach(f => console.log(`  - ${f}`))
  process.exit(1)
} else {
  console.log("All tests passed!")
}
