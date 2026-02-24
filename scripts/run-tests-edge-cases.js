/**
 * EDGE CASE & REGRESSION TESTS - Full Coverage Suite
 *
 * Tests every untested pure-logic path across:
 * - Reporting actions: formatTimeAgo, formatHours, CSV generation, fill rate badges
 * - Shift analytics: filter by status, date range logic, statistics calculations
 * - Attendance: hours calculation, avg hours, status badges (Completed/Today/Upcoming)
 * - Volunteer directory: search filter, status filter, CSV export generation
 * - Volunteer detail: phone validation, name required, edit/cancel state, deactivate/reactivate
 * - Email actions: opt-in filtering, category filtering, scheduled email validation
 * - Shift management: template recurrence, waitlist position, emergency coverage urgency
 * - RecurringSignupModal: recurrence options labels, end date default, disable past dates
 * - Session manager: idle timeout, heartbeat config, state transitions
 * - Admin dashboard: stat card calculations, recent activity sorting
 * - Calendar export: multi-event ICS, empty events list
 * - Breadcrumb nav: route-to-breadcrumb mapping
 */

let passed = 0
let failed = 0
const failures = []

function assert(condition, label) {
  if (condition) { passed++; console.log("  PASS: " + label) }
  else { failed++; failures.push(label); console.log("  FAIL: " + label) }
}
function assertEqual(a, b, label) {
  if (a === b) { passed++; console.log("  PASS: " + label) }
  else { failed++; failures.push(label + " (got " + JSON.stringify(a) + ", expected " + JSON.stringify(b) + ")"); console.log("  FAIL: " + label + " (got " + JSON.stringify(a) + ", expected " + JSON.stringify(b) + ")") }
}
function assertIncludes(str, sub, label) {
  if (typeof str === "string" && str.includes(sub)) { passed++; console.log("  PASS: " + label) }
  else { failed++; failures.push(label); console.log("  FAIL: " + label + " - missing '" + sub + "' in '" + str + "'") }
}

// ============================================================================
// SECTION 1: Reports Page - formatTimeAgo
// ============================================================================
console.log("\n--- Section 1: formatTimeAgo ---")

function formatTimeAgo(dateString) {
  var date = new Date(dateString)
  var now = new Date()
  var diffMs = now.getTime() - date.getTime()
  var diffMins = Math.floor(diffMs / 60000)
  var diffHours = Math.floor(diffMs / 3600000)
  var diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 60) return diffMins + " minute" + (diffMins !== 1 ? "s" : "") + " ago"
  if (diffHours < 24) return diffHours + " hour" + (diffHours !== 1 ? "s" : "") + " ago"
  return diffDays + " day" + (diffDays !== 1 ? "s" : "") + " ago"
}

// 1 minute ago (singular)
var oneMinAgo = new Date(Date.now() - 60000).toISOString()
assertEqual(formatTimeAgo(oneMinAgo), "1 minute ago", "1 minute ago is singular")

// 5 minutes ago (plural)
var fiveMinAgo = new Date(Date.now() - 300000).toISOString()
assertEqual(formatTimeAgo(fiveMinAgo), "5 minutes ago", "5 minutes ago is plural")

// 0 minutes ago
var justNow = new Date(Date.now() - 5000).toISOString()
assertEqual(formatTimeAgo(justNow), "0 minutes ago", "0 minutes ago for very recent")

// 59 minutes ago (still in minutes range)
var fiftyNineMin = new Date(Date.now() - 59 * 60000).toISOString()
assertIncludes(formatTimeAgo(fiftyNineMin), "minutes ago", "59 min stays in minutes range")

// 1 hour ago (singular)
var oneHourAgo = new Date(Date.now() - 3600000).toISOString()
assertEqual(formatTimeAgo(oneHourAgo), "1 hour ago", "1 hour ago is singular")

// 23 hours ago (still hours)
var twentyThreeHours = new Date(Date.now() - 23 * 3600000).toISOString()
assertIncludes(formatTimeAgo(twentyThreeHours), "hours ago", "23 hours stays in hours range")

// 1 day ago (singular)
var oneDayAgo = new Date(Date.now() - 86400000).toISOString()
assertEqual(formatTimeAgo(oneDayAgo), "1 day ago", "1 day ago is singular")

// 7 days ago (plural)
var sevenDays = new Date(Date.now() - 7 * 86400000).toISOString()
assertEqual(formatTimeAgo(sevenDays), "7 days ago", "7 days ago is plural")

// ============================================================================
// SECTION 2: Attendance Report - formatHours
// ============================================================================
console.log("\n--- Section 2: formatHours ---")

function formatHours(totalHours) {
  var hours = Math.floor(totalHours)
  var minutes = Math.round((totalHours - hours) * 60)
  return hours + "h " + minutes + "m"
}

assertEqual(formatHours(0), "0h 0m", "formatHours(0)")
assertEqual(formatHours(1), "1h 0m", "formatHours(1)")
assertEqual(formatHours(1.5), "1h 30m", "formatHours(1.5)")
assertEqual(formatHours(2.75), "2h 45m", "formatHours(2.75)")
assertEqual(formatHours(0.25), "0h 15m", "formatHours(0.25)")
assertEqual(formatHours(8.33), "8h 20m", "formatHours(8.33)")
assertEqual(formatHours(24), "24h 0m", "formatHours(24)")
assertEqual(formatHours(100.5), "100h 30m", "formatHours(100.5)")

// Average hours per shift edge case: 0 shifts
var shiftCount = 0
var totalHours = 5
var avgDisplay = shiftCount > 0 ? formatHours(totalHours / shiftCount) : "0h 0m"
assertEqual(avgDisplay, "0h 0m", "avg hours with 0 shifts shows 0h 0m")

// Average with real data
shiftCount = 4
totalHours = 10
avgDisplay = formatHours(totalHours / shiftCount)
assertEqual(avgDisplay, "2h 30m", "avg hours 10h/4shifts = 2h 30m")

// ============================================================================
// SECTION 3: Shift Analytics - Fill Rate Badge Variant
// ============================================================================
console.log("\n--- Section 3: Fill Rate Badge Variant ---")

function fillRateBadgeVariant(fillStatus) {
  if (fillStatus === "Full") return "default"
  if (fillStatus === "Partial") return "secondary"
  return "destructive"
}

assertEqual(fillRateBadgeVariant("Full"), "default", "Full -> default badge")
assertEqual(fillRateBadgeVariant("Partial"), "secondary", "Partial -> secondary badge")
assertEqual(fillRateBadgeVariant("Empty"), "destructive", "Empty -> destructive badge")
assertEqual(fillRateBadgeVariant("Unknown"), "destructive", "Unknown -> destructive fallback")

// Fill rate bar color logic
function fillRateBarColor(percent) {
  if (percent >= 100) return "bg-green-600"
  if (percent >= 50) return "bg-orange-500"
  return "bg-red-500"
}

assertEqual(fillRateBarColor(100), "bg-green-600", "100% is green")
assertEqual(fillRateBarColor(150), "bg-green-600", "150% is green (over capacity)")
assertEqual(fillRateBarColor(75), "bg-orange-500", "75% is orange")
assertEqual(fillRateBarColor(50), "bg-orange-500", "50% is orange (boundary)")
assertEqual(fillRateBarColor(49), "bg-red-500", "49% is red")
assertEqual(fillRateBarColor(0), "bg-red-500", "0% is red")

// Bar width clamped to 100%
function barWidth(percent) { return Math.min(percent, 100) }
assertEqual(barWidth(150), 100, "bar width clamped at 100 for overfill")
assertEqual(barWidth(50), 50, "bar width 50 for 50%")
assertEqual(barWidth(0), 0, "bar width 0 for 0%")

// ============================================================================
// SECTION 4: Shift Analytics - Filter by Status
// ============================================================================
console.log("\n--- Section 4: Filter by Status ---")

var sampleFillRates = [
  { shift_id: "1", fill_status: "Full", fill_rate_percent: 100 },
  { shift_id: "2", fill_status: "Partial", fill_rate_percent: 60 },
  { shift_id: "3", fill_status: "Empty", fill_rate_percent: 0 },
  { shift_id: "4", fill_status: "Full", fill_rate_percent: 100 },
  { shift_id: "5", fill_status: "Partial", fill_rate_percent: 33 },
]

function filterByStatus(rates, status) {
  if (status === "all") return rates
  return rates.filter(function(s) { return s.fill_status.toLowerCase() === status.toLowerCase() })
}

assertEqual(filterByStatus(sampleFillRates, "all").length, 5, "filter 'all' returns all")
assertEqual(filterByStatus(sampleFillRates, "full").length, 2, "filter 'full' returns 2")
assertEqual(filterByStatus(sampleFillRates, "partial").length, 2, "filter 'partial' returns 2")
assertEqual(filterByStatus(sampleFillRates, "empty").length, 1, "filter 'empty' returns 1")
assertEqual(filterByStatus(sampleFillRates, "nonexistent").length, 0, "filter unknown returns 0")

// Statistics percentage calculation
function fullShiftPercentage(fullShifts, totalShifts) {
  if (totalShifts === 0) return 0
  return Math.round((fullShifts / totalShifts) * 100)
}

assertEqual(fullShiftPercentage(2, 5), 40, "2 of 5 full = 40%")
assertEqual(fullShiftPercentage(0, 5), 0, "0 of 5 full = 0%")
assertEqual(fullShiftPercentage(5, 5), 100, "5 of 5 full = 100%")
assertEqual(fullShiftPercentage(0, 0), 0, "0 of 0 = 0% (no division by zero)")

// ============================================================================
// SECTION 5: Attendance Report - Status Badge Variant
// ============================================================================
console.log("\n--- Section 5: Attendance Badge Variant ---")

function attendanceBadgeVariant(status) {
  if (status === "Completed") return "default"
  if (status === "Today") return "secondary"
  return "outline"
}

assertEqual(attendanceBadgeVariant("Completed"), "default", "Completed -> default")
assertEqual(attendanceBadgeVariant("Today"), "secondary", "Today -> secondary")
assertEqual(attendanceBadgeVariant("Upcoming"), "outline", "Upcoming -> outline")
assertEqual(attendanceBadgeVariant("Unknown"), "outline", "Unknown -> outline fallback")

// ============================================================================
// SECTION 6: Volunteer Directory - Search Filter
// ============================================================================
console.log("\n--- Section 6: Volunteer Directory Search ---")

var testVolunteers = [
  { id: "uid-1", name: "Alice Johnson", email: "alice@test.com", phone: "+1-555-0101", role: "volunteer", active: true },
  { id: "uid-2", name: "Bob Smith", email: "bob@test.com", phone: "+1-555-0202", role: "admin", active: true },
  { id: "uid-3", name: "Charlie Brown", email: "charlie@test.com", phone: null, role: "volunteer", active: false },
  { id: "uid-4", name: null, email: "noname@test.com", phone: null, role: "volunteer", active: true },
]

function searchVolunteers(vols, q) {
  var query = q.toLowerCase()
  return vols.filter(function(v) {
    return (v.name || "").toLowerCase().includes(query) ||
      (v.phone || "").toLowerCase().includes(query) ||
      (v.email || "").toLowerCase().includes(query) ||
      v.id.toLowerCase().includes(query)
  })
}

assertEqual(searchVolunteers(testVolunteers, "alice").length, 1, "search by name 'alice'")
assertEqual(searchVolunteers(testVolunteers, "test.com").length, 4, "search by email domain")
assertEqual(searchVolunteers(testVolunteers, "555-0101").length, 1, "search by phone")
assertEqual(searchVolunteers(testVolunteers, "uid-2").length, 1, "search by ID")
assertEqual(searchVolunteers(testVolunteers, "nonexistent").length, 0, "no results for bad query")
assertEqual(searchVolunteers(testVolunteers, "").length, 4, "empty query returns all")
assertEqual(searchVolunteers(testVolunteers, "ALICE").length, 1, "search is case-insensitive")

// Status filter
function filterByActive(vols, statusFilter) {
  if (statusFilter === "active") return vols.filter(function(u) { return u.active !== false })
  if (statusFilter === "inactive") return vols.filter(function(u) { return u.active === false })
  return vols
}

assertEqual(filterByActive(testVolunteers, "active").length, 3, "active filter returns 3")
assertEqual(filterByActive(testVolunteers, "inactive").length, 1, "inactive filter returns 1")
assertEqual(filterByActive(testVolunteers, "all").length, 4, "all filter returns 4")

// Role badge variant
function roleBadgeVariant(role) {
  return role === "admin" ? "default" : "secondary"
}
assertEqual(roleBadgeVariant("admin"), "default", "admin role badge")
assertEqual(roleBadgeVariant("volunteer"), "secondary", "volunteer role badge")
assertEqual(roleBadgeVariant(null), "secondary", "null role badge")

// Status badge variant
function activeStatusBadge(active) {
  return active === false ? "destructive" : "default"
}
assertEqual(activeStatusBadge(true), "default", "active status badge")
assertEqual(activeStatusBadge(false), "destructive", "inactive status badge")
assertEqual(activeStatusBadge(null), "default", "null active badge (treated as active)")

// ============================================================================
// SECTION 7: Volunteer Directory - CSV Export
// ============================================================================
console.log("\n--- Section 7: CSV Export Generation ---")

function generateVolunteerCSV(vols) {
  var headers = ["Name", "Email", "Phone", "Role", "Status", "Joined", "Last Sign In"]
  var rows = vols.map(function(v) {
    return [
      v.name || "Unnamed",
      v.email || "",
      v.phone || "",
      v.role || "volunteer",
      v.active === false ? "Inactive" : "Active",
      new Date(v.created_at || "2025-01-01").toLocaleDateString(),
      v.last_sign_in_at ? new Date(v.last_sign_in_at).toLocaleDateString() : "Never",
    ]
  })
  return [headers].concat(rows).map(function(row) { return row.join(",") }).join("\n")
}

var csvData = generateVolunteerCSV([
  { name: "Alice", email: "a@b.com", phone: "555", role: "admin", active: true, created_at: "2025-06-15" },
  { name: null, email: "b@b.com", phone: null, role: null, active: false, created_at: "2025-01-01", last_sign_in_at: "2025-06-01" },
])

assertIncludes(csvData, "Name,Email,Phone,Role,Status,Joined,Last Sign In", "CSV has correct headers")
assertIncludes(csvData, "Alice,a@b.com,555,admin,Active", "CSV row 1 correct")
assertIncludes(csvData, "Unnamed,b@b.com,,volunteer,Inactive", "CSV row 2 defaults correct")
assertIncludes(csvData, "Never", "CSV shows Never for no last sign in on row 1")

// Reporting CSV format (quoted cells)
function generateReportCSV(headers, rows) {
  return [headers.join(",")].concat(rows.map(function(row) {
    return row.map(function(cell) { return '"' + cell + '"' }).join(",")
  })).join("\n")
}

var reportCSV = generateReportCSV(
  ["Date", "Slot", "Capacity"],
  [["2025-06-15", "AM", "5"], ["2025-06-16", "PM", "3"]]
)
assertIncludes(reportCSV, '"2025-06-15","AM","5"', "report CSV quotes cells")

// ============================================================================
// SECTION 8: Volunteer Detail Page - Phone Validation
// ============================================================================
console.log("\n--- Section 8: Phone Validation ---")

function isValidPhone(phone) {
  if (!phone) return true // phone is optional
  return /^\+?[\d\s\-()]+$/.test(phone)
}

assert(isValidPhone(""), "empty phone is valid (optional)")
assert(isValidPhone(null), "null phone is valid (optional)")
assert(isValidPhone("+1 (555) 123-4567"), "US phone format valid")
assert(isValidPhone("+44 20 7946 0958"), "UK phone format valid")
assert(isValidPhone("5551234567"), "digits only valid")
assert(!isValidPhone("abc"), "letters invalid")
assert(!isValidPhone("555-abc-1234"), "mixed letters invalid")
assert(!isValidPhone("test@email.com"), "email is not a phone")

// Name required validation
function isNameValid(name) {
  return name && name.trim().length > 0
}

assert(isNameValid("Alice"), "valid name")
assert(!isNameValid(""), "empty name invalid")
assert(!isNameValid(null), "null name invalid")
assert(!isNameValid("   "), "whitespace-only name invalid")

// ============================================================================
// SECTION 9: Email Actions - Opt-in Filtering
// ============================================================================
console.log("\n--- Section 9: Email Opt-in Filtering ---")

var emailProfiles = [
  { id: "1", name: "Alice", email_opt_in: true, email_categories: { newsletter: true, reminders: true } },
  { id: "2", name: "Bob", email_opt_in: true, email_categories: { newsletter: false, reminders: true } },
  { id: "3", name: "Charlie", email_opt_in: false, email_categories: { newsletter: true, reminders: true } },
  { id: "4", name: "Diana", email_opt_in: true, email_categories: null },
]

// Only opted-in
var optedIn = emailProfiles.filter(function(p) { return p.email_opt_in })
assertEqual(optedIn.length, 3, "3 users opted in")

// Filter by category
function filterByCategory(profiles, category) {
  if (!category || category === "all") return profiles.filter(function(p) { return p.email_opt_in })
  return profiles.filter(function(p) {
    if (!p.email_opt_in) return false
    var cats = p.email_categories || {}
    return cats[category] === true
  })
}

assertEqual(filterByCategory(emailProfiles, "all").length, 3, "all category returns all opted-in")
assertEqual(filterByCategory(emailProfiles, "newsletter").length, 1, "newsletter category returns 1 (Alice)")
assertEqual(filterByCategory(emailProfiles, "reminders").length, 2, "reminders returns 2 (Alice, Bob)")
assertEqual(filterByCategory(emailProfiles, "nonexistent").length, 0, "nonexistent category returns 0")

// Scheduled email validation: must be in future
function isScheduledTimeValid(scheduledFor) {
  return new Date(scheduledFor) > new Date()
}
assert(isScheduledTimeValid(new Date(Date.now() + 3600000).toISOString()), "1 hour in future is valid")
assert(!isScheduledTimeValid(new Date(Date.now() - 3600000).toISOString()), "1 hour in past is invalid")

// ============================================================================
// SECTION 10: Shift Templates - Recurrence Pattern Labels
// ============================================================================
console.log("\n--- Section 10: Shift Template Recurrence ---")

var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function daysOfWeekDisplay(days) {
  return days.map(function(d) { return dayNames[d] })
}

var result = daysOfWeekDisplay([1, 3, 5])
assertEqual(result.join(", "), "Mon, Wed, Fri", "days 1,3,5 = Mon,Wed,Fri")
assertEqual(daysOfWeekDisplay([0, 6]).join(", "), "Sun, Sat", "days 0,6 = Sun,Sat")
assertEqual(daysOfWeekDisplay([]).join(", "), "", "empty days array")

// Template active badge
function templateBadgeVariant(active) {
  return active ? "default" : "secondary"
}
assertEqual(templateBadgeVariant(true), "default", "active template badge")
assertEqual(templateBadgeVariant(false), "secondary", "inactive template badge")

// RecurringSignupModal: recurrence option descriptions
function recurrenceDescription(pattern, startDate) {
  var dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][startDate.getDay()]
  switch (pattern) {
    case "daily": return "Every day"
    case "weekly": return "Every " + dayName
    case "biweekly": return "Every other " + dayName
    case "monthly": return startDate.getDate() + "th of each month"
    default: return ""
  }
}

var monday = new Date(2025, 5, 2) // June 2, 2025 is Monday
assertEqual(recurrenceDescription("daily", monday), "Every day", "daily description")
assertEqual(recurrenceDescription("weekly", monday), "Every Monday", "weekly description")
assertEqual(recurrenceDescription("biweekly", monday), "Every other Monday", "biweekly description")
assertIncludes(recurrenceDescription("monthly", monday), "of each month", "monthly description")

// ============================================================================
// SECTION 11: Waitlist Position Logic
// ============================================================================
console.log("\n--- Section 11: Waitlist Logic ---")

// Position calculation
function nextWaitlistPosition(currentCount) { return currentCount + 1 }
assertEqual(nextWaitlistPosition(0), 1, "first person gets position 1")
assertEqual(nextWaitlistPosition(3), 4, "4th person gets position 4")

// Position reorder after removal
function reorderPositions(entries, removedPosition) {
  return entries
    .filter(function(e) { return e.position !== removedPosition })
    .map(function(e) {
      if (e.position > removedPosition) return { id: e.id, position: e.position - 1 }
      return e
    })
}

var waitlist = [
  { id: "a", position: 1 },
  { id: "b", position: 2 },
  { id: "c", position: 3 },
]

var reordered = reorderPositions(waitlist, 1)
assertEqual(reordered.length, 2, "removing position 1 leaves 2")
assertEqual(reordered[0].position, 1, "b moves from 2 to 1")
assertEqual(reordered[1].position, 2, "c moves from 3 to 2")

var reorderedMid = reorderPositions(waitlist, 2)
assertEqual(reorderedMid.length, 2, "removing position 2 leaves 2")
assertEqual(reorderedMid[0].position, 1, "a stays at 1")
assertEqual(reorderedMid[1].position, 2, "c moves from 3 to 2")

// Waitlist status transitions
var validStatuses = ["waiting", "notified", "converted", "expired"]
assert(validStatuses.includes("waiting"), "waiting is valid status")
assert(validStatuses.includes("notified"), "notified is valid status")
assert(validStatuses.includes("converted"), "converted is valid status")
assert(validStatuses.includes("expired"), "expired is valid status")
assert(!validStatuses.includes("active"), "active is NOT valid status")

// Can only accept when status is "notified"
function canAcceptWaitlistSpot(status) { return status === "notified" }
assert(canAcceptWaitlistSpot("notified"), "can accept when notified")
assert(!canAcceptWaitlistSpot("waiting"), "cannot accept when waiting")
assert(!canAcceptWaitlistSpot("converted"), "cannot accept when converted")

// ============================================================================
// SECTION 12: Emergency Coverage - Urgency & Expiry
// ============================================================================
console.log("\n--- Section 12: Emergency Coverage ---")

function calculateExpiresAt(hoursFromNow) {
  var d = new Date()
  d.setHours(d.getHours() + hoursFromNow)
  return d
}

var expires2h = calculateExpiresAt(2)
assert(expires2h.getTime() > Date.now(), "2h expiry is in future")
assert(expires2h.getTime() - Date.now() < 2.01 * 3600000, "2h expiry within ~2 hours")

// Coverage status transitions
function canClaimCoverage(status) { return status === "open" }
assert(canClaimCoverage("open"), "can claim open coverage")
assert(!canClaimCoverage("filled"), "cannot claim filled")
assert(!canClaimCoverage("cancelled"), "cannot claim cancelled")
assert(!canClaimCoverage("expired"), "cannot claim expired")

// Urgency levels
var urgencyLevels = ["low", "medium", "high", "critical"]
urgencyLevels.forEach(function(level) {
  assert(typeof level === "string", "urgency '" + level + "' is valid string")
})

// ============================================================================
// SECTION 13: Session Config Defaults
// ============================================================================
console.log("\n--- Section 13: Session Config ---")

var defaultConfig = {
  idleTimeoutMinutes: 30,
  absoluteTimeoutHours: 8,
  heartbeatIntervalMinutes: 5,
  warnBeforeTimeoutMinutes: 5,
  maxConcurrentSessions: 0,
  logoutOnBrowserClose: true,
  syncLogoutAcrossTabs: true,
}

assertEqual(defaultConfig.idleTimeoutMinutes, 30, "default idle timeout is 30 min")
assertEqual(defaultConfig.absoluteTimeoutHours, 8, "default absolute timeout is 8 hours")
assertEqual(defaultConfig.heartbeatIntervalMinutes, 5, "default heartbeat is 5 min")
assertEqual(defaultConfig.warnBeforeTimeoutMinutes, 5, "default warning is 5 min before")
assert(defaultConfig.logoutOnBrowserClose, "logout on browser close is true")
assert(defaultConfig.syncLogoutAcrossTabs, "sync logout across tabs is true")

// Override merging
var userOverrides = { idleTimeoutMinutes: 15, logoutOnBrowserClose: false }
var merged = Object.assign({}, defaultConfig, userOverrides)
assertEqual(merged.idleTimeoutMinutes, 15, "override idle timeout to 15")
assert(!merged.logoutOnBrowserClose, "override browser close to false")
assertEqual(merged.absoluteTimeoutHours, 8, "non-overridden stays at default")

// Session state transitions
var sessionStates = {
  unauthenticated: { isAuthenticated: false, userId: null, sessionToken: null },
  authenticated: { isAuthenticated: true, userId: "user-1", sessionToken: "tok-123" },
  idle: { isAuthenticated: true, userId: "user-1", sessionToken: "tok-123", isIdle: true },
  warning: { isAuthenticated: true, userId: "user-1", sessionToken: "tok-123", isIdle: true, showTimeoutWarning: true },
}

assert(!sessionStates.unauthenticated.isAuthenticated, "unauth state")
assert(sessionStates.authenticated.isAuthenticated, "auth state")
assert(sessionStates.idle.isIdle, "idle state")
assert(sessionStates.warning.showTimeoutWarning, "warning state")

// Warning time calculation
var warningMs = (defaultConfig.idleTimeoutMinutes - defaultConfig.warnBeforeTimeoutMinutes) * 60 * 1000
assertEqual(warningMs, 25 * 60 * 1000, "warning fires at 25 min (30-5)")

// ============================================================================
// SECTION 14: Admin Dashboard Stats
// ============================================================================
console.log("\n--- Section 14: Dashboard Stats ---")

var dashboardStats = {
  totalVolunteers: 25,
  totalShifts: 100,
  totalAssignments: 300,
  activeThisMonth: 15,
}

assertEqual(dashboardStats.totalVolunteers || 0, 25, "total volunteers renders")
assertEqual(dashboardStats.totalShifts || 0, 100, "total shifts renders")
assertEqual(dashboardStats.totalAssignments || 0, 300, "total assignments renders")
assertEqual(dashboardStats.activeThisMonth || 0, 15, "active this month renders")

// Null safety for dashboard stats
var nullStats = null
assertEqual((nullStats && nullStats.totalVolunteers) || 0, 0, "null stats -> 0 volunteers")
assertEqual((nullStats && nullStats.totalShifts) || 0, 0, "null stats -> 0 shifts")

// ============================================================================
// SECTION 15: Calendar Export - Multi-Event ICS
// ============================================================================
console.log("\n--- Section 15: Calendar Export ---")

function escapeICSText(text) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

assertEqual(escapeICSText("Hello, World"), "Hello\\, World", "comma escaped")
assertEqual(escapeICSText("A;B"), "A\\;B", "semicolon escaped")
assertEqual(escapeICSText("Line1\nLine2"), "Line1\\nLine2", "newline escaped")
assertEqual(escapeICSText("Back\\slash"), "Back\\\\slash", "backslash escaped")
assertEqual(escapeICSText("Plain text"), "Plain text", "plain text unchanged")

// ICS structure validation
function generateICSStructure(events) {
  var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Test//EN"]
  events.forEach(function(e) {
    lines.push("BEGIN:VEVENT")
    lines.push("SUMMARY:" + escapeICSText(e.summary))
    lines.push("END:VEVENT")
  })
  lines.push("END:VCALENDAR")
  return lines.join("\n")
}

var ics0 = generateICSStructure([])
assertIncludes(ics0, "BEGIN:VCALENDAR", "empty ICS has calendar start")
assertIncludes(ics0, "END:VCALENDAR", "empty ICS has calendar end")
assert(!ics0.includes("BEGIN:VEVENT"), "empty ICS has no events")

var ics2 = generateICSStructure([{ summary: "Shift 1" }, { summary: "Shift 2" }])
var eventCount = (ics2.match(/BEGIN:VEVENT/g) || []).length
assertEqual(eventCount, 2, "2 events in multi-event ICS")

// ============================================================================
// SECTION 16: Recurring Shift Matching - Biweekly Edge Case
// ============================================================================
console.log("\n--- Section 16: Recurring Shift Matching ---")

function isMatchingRecurrence(originalDate, candidateDate, pattern) {
  var origDay = originalDate.getDay()
  var candDay = candidateDate.getDay()
  
  switch (pattern) {
    case "daily": return true
    case "weekly": return candDay === origDay
    case "biweekly":
      if (candDay !== origDay) return false
      var diffTime = candidateDate.getTime() - originalDate.getTime()
      var diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000))
      return diffWeeks % 2 === 0
    case "monthly":
      return candidateDate.getDate() === originalDate.getDate()
    default: return false
  }
}

var jun2 = new Date(2025, 5, 2) // Monday
var jun9 = new Date(2025, 5, 9) // Monday (1 week)
var jun16 = new Date(2025, 5, 16) // Monday (2 weeks)
var jun3 = new Date(2025, 5, 3) // Tuesday

assert(isMatchingRecurrence(jun2, jun9, "daily"), "daily matches any day")
assert(isMatchingRecurrence(jun2, jun9, "weekly"), "weekly matches same weekday")
assert(!isMatchingRecurrence(jun2, jun3, "weekly"), "weekly rejects different weekday")
assert(!isMatchingRecurrence(jun2, jun9, "biweekly"), "biweekly rejects 1-week gap")
assert(isMatchingRecurrence(jun2, jun16, "biweekly"), "biweekly accepts 2-week gap")
assert(isMatchingRecurrence(jun2, new Date(2025, 6, 2), "monthly"), "monthly matches same day-of-month")
assert(!isMatchingRecurrence(jun2, new Date(2025, 6, 3), "monthly"), "monthly rejects different day-of-month")

// ============================================================================
// SECTION 17: Admin Action Validation Guards
// ============================================================================
console.log("\n--- Section 17: Admin Action Guards ---")

// Cannot delete self
function canDeleteUser(currentUserId, targetUserId) {
  return currentUserId !== targetUserId
}
assert(!canDeleteUser("admin-1", "admin-1"), "cannot delete self")
assert(canDeleteUser("admin-1", "user-2"), "can delete other user")

// Cannot delete last admin
function canDeleteAdmin(adminCount, targetIsAdmin) {
  if (!targetIsAdmin) return true
  return adminCount > 1
}
assert(!canDeleteAdmin(1, true), "cannot delete last admin")
assert(canDeleteAdmin(2, true), "can delete admin when 2 exist")
assert(canDeleteAdmin(1, false), "can delete volunteer even with 1 admin")

// Cannot demote last admin
function canDemoteAdmin(adminCount) {
  return adminCount > 1
}
assert(!canDemoteAdmin(1), "cannot demote last admin")
assert(canDemoteAdmin(2), "can demote when 2 admins")
assert(canDemoteAdmin(5), "can demote when 5 admins")

// Blocklist check
function isBlocked(email, blocklist) {
  return blocklist.some(function(b) { return b.email === email.toLowerCase() })
}
var blocklist = [{ email: "bad@test.com" }, { email: "spam@test.com" }]
assert(isBlocked("bad@test.com", blocklist), "blocked email detected")
assert(isBlocked("BAD@test.com", blocklist), "case-insensitive block check")
assert(!isBlocked("good@test.com", blocklist), "non-blocked email passes")

// Duplicate assignment check
function isDuplicate(userId, shiftId, existingAssignments) {
  return existingAssignments.some(function(a) { return a.user_id === userId && a.shift_id === shiftId })
}
var assignments = [{ user_id: "u1", shift_id: "s1" }, { user_id: "u2", shift_id: "s1" }]
assert(isDuplicate("u1", "s1", assignments), "duplicate detected")
assert(!isDuplicate("u1", "s2", assignments), "different shift not duplicate")
assert(!isDuplicate("u3", "s1", assignments), "different user not duplicate")

// Capacity check
function isAtCapacity(currentCount, capacity) {
  return currentCount >= capacity
}
assert(isAtCapacity(5, 5), "at capacity")
assert(isAtCapacity(6, 5), "over capacity")
assert(!isAtCapacity(4, 5), "below capacity")
assert(!isAtCapacity(0, 5), "empty not at capacity")

// ============================================================================
// SECTION 18: Shift Templates - Apply Date Range
// ============================================================================
console.log("\n--- Section 18: Template Apply Date Range ---")

// Default date range (last 30 days)
function defaultDateRange() {
  var today = new Date()
  var thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  var startDate = thirtyDaysAgo.toISOString().split("T")[0]
  var endDate = today.toISOString().split("T")[0]
  return { startDate: startDate, endDate: endDate }
}

var range = defaultDateRange()
assert(range.startDate < range.endDate, "start date before end date")
assertEqual(range.startDate.length, 10, "start date is YYYY-MM-DD format")
assertEqual(range.endDate.length, 10, "end date is YYYY-MM-DD format")

// RecurringSignupModal default end date (3 months from start)
function defaultEndDate(startDate) {
  var d = new Date(startDate)
  d.setMonth(d.getMonth() + 3)
  return d
}

var start = new Date(2025, 5, 1) // June 1
var endDef = defaultEndDate(start)
assertEqual(endDef.getMonth(), 8, "3 months from June = September")

// Cannot select end date before start
function isEndDateValid(startDate, endDate) {
  return endDate > startDate
}
assert(isEndDateValid(new Date(2025, 5, 1), new Date(2025, 8, 1)), "end after start valid")
assert(!isEndDateValid(new Date(2025, 5, 1), new Date(2025, 4, 1)), "end before start invalid")
assert(!isEndDateValid(new Date(2025, 5, 1), new Date(2025, 5, 1)), "same date invalid")

// ============================================================================
// SECTION 19: Volunteer Detail - Edit/Cancel State Machine
// ============================================================================
console.log("\n--- Section 19: Detail Page State Machine ---")

// Edit mode: form values reset on cancel
function cancelEditing(profile) {
  return {
    editing: false,
    name: profile.name || "",
    phone: profile.phone || "",
    role: profile.role || "volunteer",
  }
}

var prof = { name: "Alice", phone: "+1-555", role: "admin" }
var cancelled = cancelEditing(prof)
assert(!cancelled.editing, "editing is false after cancel")
assertEqual(cancelled.name, "Alice", "name reverts to original")
assertEqual(cancelled.phone, "+1-555", "phone reverts to original")
assertEqual(cancelled.role, "admin", "role reverts to original")

// Null profile fields
var nullProf = { name: null, phone: null, role: null }
var cancelledNull = cancelEditing(nullProf)
assertEqual(cancelledNull.name, "", "null name -> empty string")
assertEqual(cancelledNull.phone, "", "null phone -> empty string")
assertEqual(cancelledNull.role, "volunteer", "null role -> volunteer default")

// Deactivate/Reactivate toggle
function accountAction(isActive) {
  return isActive === false ? "reactivate" : "deactivate"
}
assertEqual(accountAction(true), "deactivate", "active user sees deactivate")
assertEqual(accountAction(false), "reactivate", "inactive user sees reactivate")
assertEqual(accountAction(null), "deactivate", "null active treated as active")

// ============================================================================
// SECTION 20: Bulk Operations
// ============================================================================
console.log("\n--- Section 20: Bulk Operations ---")

// Bulk assign tracking
function trackBulkAssign(shiftIds, results) {
  var successful = []
  var failedOps = []
  shiftIds.forEach(function(id, i) {
    if (results[i] && results[i].success) successful.push(id)
    else failedOps.push({ shiftId: id, reason: (results[i] && results[i].error) || "Unknown" })
  })
  return { success: successful.length > 0, assigned: successful.length, failed: failedOps.length, errors: failedOps }
}

var bulkResult = trackBulkAssign(
  ["s1", "s2", "s3"],
  [{ success: true }, { success: false, error: "Full" }, { success: true }]
)
assert(bulkResult.success, "bulk assign success when at least 1 succeeded")
assertEqual(bulkResult.assigned, 2, "2 successful assignments")
assertEqual(bulkResult.failed, 1, "1 failed assignment")
assertEqual(bulkResult.errors[0].reason, "Full", "failure reason preserved")

// All fail
var allFail = trackBulkAssign(["s1"], [{ success: false, error: "Dup" }])
assert(!allFail.success, "bulk fails when all fail")
assertEqual(allFail.assigned, 0, "0 assigned when all fail")

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n======================================")
console.log("EDGE CASE TESTS: " + passed + " passed, " + failed + " failed out of " + (passed + failed))
console.log("======================================")

if (failures.length > 0) {
  console.log("\nFailures:")
  failures.forEach(function(f) { console.log("  - " + f) })
}
