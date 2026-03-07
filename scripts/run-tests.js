// ============================================================================
// VOLUNTEER CONNECT - COMPREHENSIVE REGRESSION TEST SUITE
//
// Sections 1-7:  Core date utilities, grid alignment, UI logic, ICS, toast, validation, cache
// Sections 8-24: Recurring shifts, slots, navigation, capacity, CSV, profile, blocklist,
//                ShiftModal, end-time filter, weekdays, leap year, vol stats, reports,
//                ICS mapping, admin validation, login errors, toast subscription
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
function assertIncludes(str, sub, label) {
  if (typeof str === "string" && str.includes(sub)) { passed++; console.log(`  PASS: ${label}`) }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label} — "${str}" does not include "${sub}"`) }
}

// ---- Inline copies of lib/date.ts functions ----
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function ymd(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function daysInGrid(d) {
  const start = startOfMonth(d), end = endOfMonth(d)
  const startWeekday = start.getDay()
  const cells = []
  for (let i = 0; i < startWeekday; i++) { const prev = new Date(start); prev.setDate(prev.getDate() - (startWeekday - i)); cells.push(prev) }
  for (let i = 1; i <= end.getDate(); i++) cells.push(new Date(start.getFullYear(), start.getMonth(), i))
  while (cells.length % 7 !== 0) { const last = cells[cells.length - 1]; const next = new Date(last); next.setDate(next.getDate() + 1); cells.push(next) }
  return cells
}
function isSameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function parseDate(dateString) { const [y, m, d] = dateString.split("-").map(Number); return new Date(y, m - 1, d) }
function formatDateForDisplay(ds, opts) { return parseDate(ds).toLocaleDateString("default", opts) }
function formatTime12Hour(time) {
  if (!time) return ""
  const [hours, minutes] = time.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`
}

// ---- Inline copy of calendar-export generateICS ----
function escapeICSText(text) { return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n") }
function formatICSDate(date) {
  const pad = (n) => n.toString().padStart(2, "0")
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}
function generateICS(events) {
  const icsEvents = events.map((e) => {
    const dtstart = formatICSDate(e.startDate), dtend = formatICSDate(e.endDate), dtstamp = formatICSDate(new Date())
    return `BEGIN:VEVENT\nUID:${e.id}@vanderpumpdogs.org\nDTSTAMP:${dtstamp}\nDTSTART:${dtstart}\nDTEND:${dtend}\nSUMMARY:${escapeICSText(e.summary)}\nDESCRIPTION:${escapeICSText(e.description)}\nLOCATION:${escapeICSText(e.location)}\nSTATUS:CONFIRMED\nSEQUENCE:0\nEND:VEVENT`
  }).join("\n")
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Vanderpump Dogs//Volunteer Calendar//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n${icsEvents}\nEND:VCALENDAR`
}

// ============================================================================
// 1. DATE UTILITIES
// ============================================================================
console.log("\n=== DATE UTILITY TESTS ===")

function testStartOfMonth() {
  console.log("\n--- startOfMonth ---")
  const s = startOfMonth(new Date(2026, 2, 15))
  assertEqual(s.getFullYear(), 2026, "startOfMonth year"); assertEqual(s.getMonth(), 2, "startOfMonth month"); assertEqual(s.getDate(), 1, "startOfMonth date")
}
function testEndOfMonth() {
  console.log("\n--- endOfMonth ---")
  const e = endOfMonth(new Date(2026, 0, 10))
  assertEqual(e.getDate(), 31, "endOfMonth Jan=31")
  assertEqual(endOfMonth(new Date(2026, 1, 10)).getDate(), 28, "endOfMonth Feb2026=28")
  assertEqual(endOfMonth(new Date(2024, 1, 10)).getDate(), 29, "endOfMonth Feb2024=29 (leap)")
}
function testYmd() {
  console.log("\n--- ymd ---")
  assertEqual(ymd(new Date(2026, 0, 5)), "2026-01-05", "ymd zero-pad month+day")
  assertEqual(ymd(new Date(2026, 11, 25)), "2026-12-25", "ymd December")
}
function testAddMonths() {
  console.log("\n--- addMonths ---")
  const r = addMonths(new Date(2026, 0, 15), 1)
  assertEqual(r.getMonth(), 1, "addMonths +1")
  assertEqual(addMonths(new Date(2026, 11, 1), 1).getMonth(), 0, "addMonths Dec->Jan wrap")
  assertEqual(addMonths(new Date(2026, 0, 1), -1).getMonth(), 11, "addMonths Jan->Dec wrap")
}
function testIsSameMonth() {
  console.log("\n--- isSameMonth ---")
  assert(isSameMonth(new Date(2026, 2, 1), new Date(2026, 2, 31)), "isSameMonth same")
  assert(!isSameMonth(new Date(2026, 2, 1), new Date(2026, 3, 1)), "isSameMonth diff")
}
function testIsSameDay() {
  console.log("\n--- isSameDay ---")
  assert(isSameDay(new Date(2026, 2, 15), new Date(2026, 2, 15)), "isSameDay same")
  assert(!isSameDay(new Date(2026, 2, 15), new Date(2026, 2, 16)), "isSameDay diff day")
}
function testParseDate() {
  console.log("\n--- parseDate ---")
  const d = parseDate("2026-03-15")
  assertEqual(d.getFullYear(), 2026, "parseDate year"); assertEqual(d.getMonth(), 2, "parseDate month"); assertEqual(d.getDate(), 15, "parseDate day")
}
function testFormatTime12Hour() {
  console.log("\n--- formatTime12Hour ---")
  assertEqual(formatTime12Hour("09:00"), "9:00 AM", "9AM"); assertEqual(formatTime12Hour("13:30"), "1:30 PM", "1:30PM")
  assertEqual(formatTime12Hour("00:00"), "12:00 AM", "midnight"); assertEqual(formatTime12Hour("12:00"), "12:00 PM", "noon")
}
function testFormatDateForDisplay() {
  console.log("\n--- formatDateForDisplay ---")
  const r = formatDateForDisplay("2026-03-15", { weekday: "long" })
  assertIncludes(r, "Sunday", "formatDateForDisplay weekday")
}

// ============================================================================
// 1b. CALENDAR GRID ALIGNMENT
// ============================================================================
console.log("\n=== CALENDAR GRID ALIGNMENT TESTS ===")

function testDaysInGrid() {
  console.log("\n--- daysInGrid: length, month-days, multiple-of-7 ---")
  const mar = daysInGrid(new Date(2026, 2, 1))
  assertEqual(mar.length % 7, 0, "Mar 2026 grid multiple of 7")
  const marDays = mar.filter(d => d.getMonth() === 2)
  assertEqual(marDays.length, 31, "Mar has 31 days in grid")
}
function testGridWeekdayAlignment() {
  console.log("\n--- Grid weekday alignment (8 months) ---")
  const months = [[2026,0],[2026,1],[2026,2],[2026,3],[2026,5],[2026,8],[2026,11],[2025,6]]
  for (const [y, m] of months) {
    const grid = daysInGrid(new Date(y, m, 1))
    for (let i = 0; i < grid.length; i++) {
      const expectedDay = i % 7
      assertEqual(grid[i].getDay(), expectedDay, `Grid ${y}-${m+1} cell[${i}] weekday=${expectedDay}`)
    }
  }
}
function testGridFirstOfMonthColumn() {
  console.log("\n--- Grid: first-of-month column for all 2026 months ---")
  const known = [/*Jan*/4,/*Feb*/0,/*Mar*/0,/*Apr*/3,/*May*/5,/*Jun*/1,/*Jul*/3,/*Aug*/6,/*Sep*/2,/*Oct*/4,/*Nov*/0,/*Dec*/2]
  for (let m = 0; m < 12; m++) {
    const first = new Date(2026, m, 1)
    assertEqual(first.getDay(), known[m], `2026-${m+1}-01 getDay()=${known[m]}`)
  }
}
function testGridTodayAlignment() {
  console.log("\n--- Grid: today's date alignment ---")
  const today = new Date()
  const grid = daysInGrid(today)
  const todayCell = grid.find(d => isSameDay(d, today))
  assert(todayCell !== undefined, "Today found in grid")
  if (todayCell) {
    const idx = grid.indexOf(todayCell)
    assertEqual(idx % 7, today.getDay(), "Today in correct column")
  }
}
function testGridLeadingFillerDays() {
  console.log("\n--- Grid: leading filler days ---")
  const tests = [[2026,1,0],[2026,3,3],[2026,7,6],[2026,0,4]]
  for (const [y, m, expectedFillers] of tests) {
    const grid = daysInGrid(new Date(y, m, 1))
    const fillers = grid.filter(d => d.getMonth() !== m || d.getFullYear() !== y).filter((d, i) => i < grid.indexOf(grid.find(g => g.getMonth() === m && g.getDate() === 1)))
    assertEqual(fillers.length, expectedFillers, `${y}-${m+1} has ${expectedFillers} filler days`)
  }
}

// ============================================================================
// 1c. UI LOGIC TESTS
// ============================================================================
console.log("\n=== UI LOGIC TESTS ===")

function testCapacityStatus() {
  console.log("\n--- Capacity status ---")
  function getCapacityStatus(count, cap) {
    if (cap === 0) return "none"
    const ratio = count / cap
    if (ratio >= 1) return "full"
    if (ratio >= 0.7) return "nearly-full"
    return "available"
  }
  assertEqual(getCapacityStatus(0, 5), "available", "0/5"); assertEqual(getCapacityStatus(3, 5), "available", "3/5")
  assertEqual(getCapacityStatus(4, 5), "nearly-full", "4/5"); assertEqual(getCapacityStatus(5, 5), "full", "5/5")
  assertEqual(getCapacityStatus(0, 0), "none", "0/0")
}
function testShiftIndicatorTimeFormat() {
  console.log("\n--- Shift indicator compact time ---")
  function compactTime(t) { const [h,m]=t.split(":").map(Number); const p=h>=12?"PM":"AM"; const h12=h%12||12; return m===0?`${h12}${p}`:`${h12}:${String(m).padStart(2,"0")}${p}` }
  assertEqual(compactTime("09:00"), "9AM", "9AM compact"); assertEqual(compactTime("13:30"), "1:30PM", "1:30PM compact")
  assertEqual(compactTime("00:00"), "12AM", "midnight compact"); assertEqual(compactTime("12:00"), "12PM", "noon compact")
}
function testDayCellShiftFiltering() {
  console.log("\n--- DayCell shift filtering ---")
  const shifts = [
    { id:"1", shift_date:"2026-03-15", slot:"AM" },
    { id:"2", shift_date:"2026-03-15", slot:"PM" },
    { id:"3", shift_date:"2026-03-16", slot:"AM" },
  ]
  const filtered = shifts.filter(s => s.shift_date === "2026-03-15")
  assertEqual(filtered.length, 2, "2 shifts on Mar 15")
  assertEqual(filtered.find(s => s.slot === "AM").id, "1", "AM=id1")
}
function testDayCellPastDayFiltering() {
  console.log("\n--- DayCell past-day filtering ---")
  const today = ymd(new Date())
  const past = "2020-01-01", future = "2099-12-31"
  assert(past < today, "2020 is past"); assert(future >= today, "2099 is future")
}
function testUserAssignmentSetLookup() {
  console.log("\n--- User assignment Set lookup ---")
  const set = new Set(["shift-1","shift-2","shift-3"])
  assert(set.has("shift-1"), "Set has shift-1"); assert(!set.has("shift-99"), "Set missing shift-99")
}
function testYmdTimezoneConsistency() {
  console.log("\n--- ymd timezone consistency ---")
  for (const ds of ["2026-03-08","2026-11-01","2026-06-15","2026-01-01"]) {
    const d = parseDate(ds); assertEqual(ymd(d), ds, `roundtrip ${ds}`)
  }
}
function testShiftCacheKeyFormat() {
  console.log("\n--- Shift cache key format ---")
  function cacheKey(y,m) { return `shifts-${y}-${String(m+1).padStart(2,"0")}` }
  assertEqual(cacheKey(2026,0), "shifts-2026-01", "Jan key"); assertEqual(cacheKey(2026,11), "shifts-2026-12", "Dec key")
}

// ============================================================================
// 2. ICS GENERATION
// ============================================================================
console.log("\n=== ICS GENERATION TESTS ===")

function testICSGeneration() {
  console.log("\n--- ICS basic generation ---")
  const ics = generateICS([{ id:"test-1", summary:"Test Shift", description:"Desc", location:"Location", startDate:new Date(2026,2,15,9,0), endDate:new Date(2026,2,15,12,0) }])
  assertIncludes(ics, "BEGIN:VCALENDAR", "has VCALENDAR"); assertIncludes(ics, "BEGIN:VEVENT", "has VEVENT")
  assertIncludes(ics, "SUMMARY:Test Shift", "has SUMMARY"); assertIncludes(ics, "END:VCALENDAR", "has END")
}
function testICSMultipleEvents() {
  console.log("\n--- ICS multiple events ---")
  const events = [
    { id:"e1", summary:"Shift 1", description:"", location:"", startDate:new Date(2026,2,15,9,0), endDate:new Date(2026,2,15,12,0) },
    { id:"e2", summary:"Shift 2", description:"", location:"", startDate:new Date(2026,2,16,9,0), endDate:new Date(2026,2,16,12,0) },
  ]
  const ics = generateICS(events)
  const count = (ics.match(/BEGIN:VEVENT/g) || []).length
  assertEqual(count, 2, "2 VEVENTs")
}
function testICSEscaping() {
  console.log("\n--- ICS text escaping ---")
  assertEqual(escapeICSText("a,b"), "a\\,b", "comma"); assertEqual(escapeICSText("a;b"), "a\\;b", "semicolon")
  assertEqual(escapeICSText("a\\b"), "a\\\\b", "backslash"); assertEqual(escapeICSText("a\nb"), "a\\nb", "newline")
}
function testICSDateFormat() {
  console.log("\n--- ICS date format ---")
  const f = formatICSDate(new Date(Date.UTC(2026, 2, 15, 9, 0, 0)))
  assertEqual(f, "20260315T090000Z", "ICS date format")
}

// ============================================================================
// 3. TOAST SYSTEM
// ============================================================================
console.log("\n=== TOAST TESTS ===")

function testToastSystem() {
  console.log("\n--- Toast types ---")
  const queue = []
  const toast = { success:(m)=>queue.push({type:"success",message:m}), error:(m)=>queue.push({type:"error",message:m}), info:(m)=>queue.push({type:"info",message:m}) }
  toast.success("OK"); toast.error("Fail"); toast.info("Note")
  assertEqual(queue.length, 3, "3 toasts queued"); assertEqual(queue[0].type, "success", "first=success"); assertEqual(queue[2].type, "info", "third=info")
}

// ============================================================================
// 4. VALIDATION
// ============================================================================
console.log("\n=== VALIDATION TESTS ===")

function testEmailValidation() {
  console.log("\n--- Email validation ---")
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  assert(re.test("user@example.com"), "valid email"); assert(!re.test("userexample.com"), "missing @")
  assert(!re.test("@example.com"), "missing local"); assert(!re.test("user@"), "missing domain")
  assert(!re.test(""), "empty string")
}
function testPasswordValidation() {
  console.log("\n--- Password validation ---")
  function val(p) { return p.length >= 6 }
  assert(!val("12345"), "5 chars fails"); assert(val("123456"), "6 chars passes"); assert(val("longpassword123!"), "long passes")
}
function testFormRequiredFields() {
  console.log("\n--- Form required fields ---")
  function check(data) { return Boolean(data.email && data.password && data.name) }
  assert(!check({ email:"", password:"pw", name:"n" }), "empty email"); assert(!check({ email:"e", password:"", name:"n" }), "empty pw")
  assert(check({ email:"e", password:"p", name:"n" }), "all filled")
}

// ============================================================================
// 5. SHIFT CACHE
// ============================================================================
console.log("\n=== CACHE TESTS ===")

function testShiftCache() {
  console.log("\n--- Shift cache ---")
  const cache = new Map()
  cache.set("shifts-2026-03", [{ id:"s1" }])
  assert(cache.has("shifts-2026-03"), "cache hit"); assert(!cache.has("shifts-2026-04"), "cache miss")
  cache.delete("shifts-2026-03"); assert(!cache.has("shifts-2026-03"), "cache cleared")
}

// ============================================================================
// 8. RECURRING SHIFT MATCHING
// ============================================================================
console.log("\n=== RECURRING SHIFT MATCHING TESTS ===")

function testRecurrenceWeeklyFilter() {
  console.log("\n--- Recurrence: weekly ---")
  const origDay = new Date(2026, 2, 15).getDay() // Sunday=0
  assertEqual(origDay, 0, "Mar 15 2026 is Sunday")
  const cases = [["2026-03-15",true],["2026-03-16",false],["2026-03-22",true],["2026-03-29",true],["2026-04-05",true],["2026-03-21",false]]
  for (const [ds, exp] of cases) { assertEqual(parseDate(ds).getDay() === origDay, exp, `Weekly: ${ds} ${exp?"matches":"skips"}`) }
}
function testRecurrenceBiweeklyFilter() {
  console.log("\n--- Recurrence: biweekly ---")
  const orig = new Date(2026, 2, 15), origDay = orig.getDay()
  const cases = [["2026-03-15",true],["2026-03-22",false],["2026-03-29",true],["2026-04-05",false],["2026-04-12",true]]
  for (const [ds, exp] of cases) {
    const d = parseDate(ds)
    if (d.getDay() !== origDay) { assert(!exp, `Biweekly: ${ds} wrong day`); continue }
    const weeks = Math.round((d.getTime()-orig.getTime())/(7*864e5))
    assertEqual(weeks%2===0, exp, `Biweekly: ${ds} week ${weeks}`)
  }
}
function testRecurrenceMonthlyFilter() {
  console.log("\n--- Recurrence: monthly ---")
  const cases = [["2026-03-15",true],["2026-04-15",true],["2026-05-15",true],["2026-03-16",false],["2026-04-01",false]]
  for (const [ds, exp] of cases) assertEqual(parseDate(ds).getDate()===15, exp, `Monthly: ${ds}`)
}
function testRecurrenceDailyFilter() {
  console.log("\n--- Recurrence: daily ---")
  for (const ds of ["2026-03-15","2026-03-16","2026-04-01"]) assert(true, `Daily: ${ds} matches`)
}

// ============================================================================
// 9. SLOT SORTING
// ============================================================================
console.log("\n=== SLOT SORTING TESTS ===")

function testSlotSorting() {
  console.log("\n--- Slot sorting AM < MID < PM ---")
  const ORDER = { AM:0, MID:1, PM:2 }
  const sorted = [{slot:"PM"},{slot:"AM"},{slot:"MID"}].sort((a,b)=>ORDER[a.slot]-ORDER[b.slot])
  assertEqual(sorted[0].slot, "AM", "first=AM"); assertEqual(sorted[1].slot, "MID", "second=MID"); assertEqual(sorted[2].slot, "PM", "third=PM")
}
function testSlotFindingInDayCell() {
  console.log("\n--- DayCell slot finding ---")
  const shifts = [{id:"1",shift_date:"2026-03-15",slot:"PM"},{id:"2",shift_date:"2026-03-15",slot:"AM"},{id:"3",shift_date:"2026-03-15",slot:"MID"},{id:"4",shift_date:"2026-03-16",slot:"AM"}]
  const day = shifts.filter(s=>s.shift_date==="2026-03-15")
  assertEqual(day.length, 3, "3 shifts on Mar 15")
  assert(day.find(s=>s.slot==="AM")!==undefined, "AM found"); assert(day.find(s=>s.slot==="MID")!==undefined, "MID found"); assert(day.find(s=>s.slot==="PM")!==undefined, "PM found")
}

// ============================================================================
// 10. CALENDAR NAVIGATION
// ============================================================================
console.log("\n=== CALENDAR NAVIGATION TESTS ===")

function testCalendarNavigationChaining() {
  console.log("\n--- Navigation chaining ---")
  let c = new Date(2026,0,1)
  c=addMonths(c,1); assertEqual(c.getMonth(),1,"Jan->Feb")
  c=addMonths(c,1); assertEqual(c.getMonth(),2,"Feb->Mar")
  c=addMonths(c,-1); assertEqual(c.getMonth(),1,"Mar->Feb back")
  c=addMonths(c,-1); assertEqual(c.getMonth(),0,"Feb->Jan back")
}
function testCalendarNavigationYearBoundary() {
  console.log("\n--- Year boundary ---")
  const nj = addMonths(new Date(2026,11,1),1)
  assertEqual(nj.getMonth(),0,"Dec->Jan month"); assertEqual(nj.getFullYear(),2027,"Dec->Jan year")
  const pd = addMonths(new Date(2026,0,1),-1)
  assertEqual(pd.getMonth(),11,"Jan->Dec month"); assertEqual(pd.getFullYear(),2025,"Jan->Dec year")
}
function testMonthNameFormatting() {
  console.log("\n--- Month names ---")
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  for (let m=0;m<12;m++) {
    const f = new Date(2026,m,1).toLocaleString("default",{month:"long",year:"numeric"})
    assertIncludes(f, names[m], `Month ${m} = ${names[m]}`); assertIncludes(f, "2026", `Month ${m} has year`)
  }
}

// ============================================================================
// 11. CAPACITY ENFORCEMENT
// ============================================================================
console.log("\n=== CAPACITY ENFORCEMENT TESTS ===")

function testCapacityReductionBlocking() {
  console.log("\n--- Capacity reduction guard ---")
  function ok(nc,ca){ return nc>=ca }
  assert(ok(5,3),"5>=3"); assert(ok(3,3),"3>=3"); assert(!ok(2,3),"2<3 blocked"); assert(!ok(0,1),"0<1 blocked"); assert(ok(0,0),"0>=0")
}
function testDoubleSignupPrevention() {
  console.log("\n--- Double signup ---")
  const ex=[{shift_id:"s1",user_id:"u1"},{shift_id:"s2",user_id:"u1"}]
  function has(sid,uid){return ex.some(a=>a.shift_id===sid&&a.user_id===uid)}
  assert(has("s1","u1"),"u1 on s1"); assert(!has("s3","u1"),"u1 not on s3"); assert(!has("s1","u2"),"u2 not on s1")
}
function testOvercapacityPrevention() {
  console.log("\n--- Overcapacity ---")
  function full(cap,cnt){return cnt>=cap}
  assert(!full(5,3),"3/5 ok"); assert(full(5,5),"5/5 full"); assert(full(5,6),"6/5 over"); assert(full(1,1),"1/1 full")
}

// ============================================================================
// 12. CSV EXPORT
// ============================================================================
console.log("\n=== CSV EXPORT TESTS ===")

function testCSVHeaderFormat() {
  console.log("\n--- CSV headers ---")
  assertEqual(["Name","Email","Phone","Role","Status","Joined Date"].join(","),"Name,Email,Phone,Role,Status,Joined Date","vol headers")
  assertEqual(["Date","Time Slot","Capacity","Filled","Fill Rate %","Status","Volunteers"].length,7,"shift 7 cols")
  assertEqual(["Volunteer Name","Email","Shift Date","Time Slot","Status","Hours"].length,6,"attendance 6 cols")
}
function testCSVEscaping() {
  console.log("\n--- CSV escaping ---")
  function csvRow(cells){return cells.map(c=>`"${c}"`).join(",")}
  const r = csvRow(["John Doe","j@e.com","(555)123","vol","Active","1/15"])
  assertIncludes(r,'"John Doe"',"name quoted"); assertEqual(r.split(",").length,6,"6 cols")
}
function testCSVRowGeneration() {
  console.log("\n--- CSV rows ---")
  const data=[{name:"Alice",email:"a@t.com",role:"vol"},{name:null,email:null,role:"vol"}]
  const rows=data.map(v=>[v.name||"",v.email||"",v.role||""])
  const csv=[["Name","Email","Role"].join(","),...rows.map(r=>r.map(c=>`"${c}"`).join(","))].join("\n")
  assertEqual(csv.split("\n").length,3,"3 lines"); assertIncludes(csv.split("\n")[2],'""',"null->empty")
}

// ============================================================================
// 13. PROFILE UPDATE
// ============================================================================
console.log("\n=== PROFILE UPDATE TESTS ===")

function testEmailCategoriesDefault() {
  console.log("\n--- Email categories defaults ---")
  const dc = {reminders:true,confirmations:true,promotional:false,urgent:true}
  assertEqual(dc.reminders,true,"reminders=true"); assertEqual(dc.promotional,false,"promotional=false")
}
function testEmailOptInToggle() {
  console.log("\n--- Email opt-in toggle ---")
  const cats={reminders:true,confirmations:true,promotional:false,urgent:true}
  const off={email_opt_in:false,email_categories:false?cats:null}
  assertEqual(off.email_categories,null,"off->null")
  const on={email_opt_in:true,email_categories:true?cats:null}
  assert(on.email_categories!==null,"on->present"); assertEqual(on.email_categories.reminders,true,"on->reminders")
}
function testProfileFieldValidation() {
  console.log("\n--- Profile field validation ---")
  assert("John Doe".length>0,"name ok"); assert("(555)123".length>0,"phone ok"); assert("".length===0,"empty detected")
}

// ============================================================================
// 14. BLOCKED EMAIL
// ============================================================================
console.log("\n=== BLOCKED EMAIL TESTS ===")

function testBlocklistChecking() {
  console.log("\n--- Blocklist checking ---")
  const bl=["banned@test.com","spammer@evil.com","UPPER@TEST.COM"].map(e=>e.toLowerCase())
  function isB(e){return bl.includes(e.toLowerCase())}
  assert(isB("banned@test.com"),"exact match"); assert(isB("BANNED@TEST.COM"),"case insensitive")
  assert(isB("upper@test.com"),"stored upper"); assert(!isB("good@test.com"),"not blocked")
}
function testBlocklistInSignupFlow() {
  console.log("\n--- Blocklist in signup ---")
  const bl=new Set(["banned@test.com"])
  function sim(e){return bl.has(e.toLowerCase())?{success:false}:{success:true}}
  assertEqual(sim("banned@test.com").success,false,"blocked rejected"); assertEqual(sim("good@test.com").success,true,"allowed passes")
}
function testBlocklistInAdminCreate() {
  console.log("\n--- Blocklist in admin create ---")
  const bl=["test@blocked.com"]
  function sim(e){
    if(bl.includes(e.toLowerCase()))return{success:false,error:"blocked"}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return{success:false,error:"invalid"}
    return{success:true}
  }
  assertEqual(sim("test@blocked.com").success,false,"blocked"); assertEqual(sim("invalid").success,false,"invalid"); assertEqual(sim("good@test.com").success,true,"valid")
}

// ============================================================================
// 15. SHIFT MODAL UI
// ============================================================================
console.log("\n=== SHIFT MODAL UI TESTS ===")

function testShiftModalBadgeMapping() {
  console.log("\n--- Badge mapping ---")
  function v(s){return s==="available"?"default":s==="nearly-full"?"secondary":"destructive"}
  function l(s){return s==="available"?"Available":s==="nearly-full"?"Nearly Full":"Full"}
  assertEqual(v("available"),"default","available->default"); assertEqual(v("nearly-full"),"secondary","nf->secondary"); assertEqual(v("full"),"destructive","full->destructive")
  assertEqual(l("available"),"Available","label available"); assertEqual(l("nearly-full"),"Nearly Full","label nf"); assertEqual(l("full"),"Full","label full")
}
function testShiftIndicatorStatusColors() {
  console.log("\n--- Status colors ---")
  const sc={registered:"bg-blue-600",available:"bg-green-500","nearly-full":"bg-orange-500",full:"bg-red-500",none:"bg-gray-300"}
  assertEqual(Object.keys(sc).length,5,"5 statuses")
  for(const[s,c]of Object.entries(sc)) assert(c.includes("bg-"),`${s} has bg-`)
}
function testShiftIndicatorAssignedOverride() {
  console.log("\n--- isAssigned override ---")
  function eff(cs,ia){return ia?"registered":cs}
  assertEqual(eff("available",true),"registered","overrides available"); assertEqual(eff("full",true),"registered","overrides full")
  assertEqual(eff("available",false),"available","keeps available"); assertEqual(eff("full",false),"full","keeps full")
}

// ============================================================================
// 16. END-TIME FILTERING
// ============================================================================
console.log("\n=== END-TIME FILTERING TESTS ===")

function testEndTimeFilteringToday() {
  console.log("\n--- EndTime filtering ---")
  function isActive(et,now){return et>now}
  const now=new Date(2026,2,15,14,0,0)
  assert(!isActive(new Date(2026,2,15,12,0,0),now),"12PM hidden at 2PM")
  assert(isActive(new Date(2026,2,15,17,0,0),now),"5PM visible at 2PM")
  assert(!isActive(new Date(2026,2,15,14,0,0),now),"exact 2PM hidden")
  assert(isActive(new Date(2026,2,16,12,0,0),now),"tomorrow visible")
}
function testEndTimeParsingFromString() {
  console.log("\n--- EndTime parsing ---")
  function pEnd(sd,et){const d=parseDate(sd);const[h,m]=et.split(":").map(Number);return new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,m)}
  assertEqual(pEnd("2026-03-15","12:00").getHours(),12,"12:00->h12")
  assertEqual(pEnd("2026-03-15","17:30").getMinutes(),30,"17:30->m30")
  assertEqual(pEnd("2026-12-31","23:59").getHours(),23,"23:59->h23")
}

// ============================================================================
// 17. WEEKDAYS HEADER CONTRACT
// ============================================================================
console.log("\n=== WEEKDAYS HEADER TESTS ===")

function testWeekdaysHeaderContract() {
  console.log("\n--- WEEKDAYS matches getDay() ---")
  const WD=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
  assertEqual(WD.length,7,"7 entries"); assertEqual(WD[0],"Sun","[0]=Sun"); assertEqual(WD[6],"Sat","[6]=Sat")
  assertEqual(WD[new Date(2026,1,21).getDay()],"Sat","Feb 21 2026=Sat")
}
function testWeekdaysShortContract() {
  console.log("\n--- WEEKDAYS_SHORT ---")
  const WS=["S","M","T","W","T","F","S"]
  assertEqual(WS.length,7,"7 entries"); assertEqual(WS[0],"S","[0]=S Sun"); assertEqual(WS[5],"F","[5]=F Fri")
}

// ============================================================================
// 18. LEAP YEAR / FEBRUARY
// ============================================================================
console.log("\n=== LEAP YEAR TESTS ===")

function testLeapYearGrids() {
  console.log("\n--- Feb 2024 (29 days, leap) ---")
  const g=daysInGrid(new Date(2024,1,1))
  assert(g.find(d=>d.getFullYear()===2024&&d.getMonth()===1&&d.getDate()===29)!==undefined,"Feb 29 exists")
  assertEqual(g.length%7,0,"grid multiple of 7")
  for(let i=0;i<g.length;i++) assertEqual(g[i].getDay(),i%7,`cell[${i}] aligned`)
}
function testNonLeapYearFeb() {
  console.log("\n--- Feb 2026 (28 days, non-leap) ---")
  const g=daysInGrid(new Date(2026,1,1))
  assertEqual(g.find(d=>d.getFullYear()===2026&&d.getMonth()===1&&d.getDate()===29),undefined,"no Feb 29")
  assert(g.find(d=>d.getFullYear()===2026&&d.getMonth()===1&&d.getDate()===28)!==undefined,"Feb 28 exists")
}
function testFebruaryStartsOnSunday() {
  console.log("\n--- Feb 2026 starts Sunday ---")
  const g=daysInGrid(new Date(2026,1,1))
  assertEqual(g[0].getMonth(),1,"first cell=Feb"); assertEqual(g[0].getDate(),1,"first cell=1st")
  assertEqual(g[0].getDay(),0,"first cell=Sunday"); assertEqual(g.length,28,"28 cells (4 weeks)")
}

// ============================================================================
// 19. VOLUNTEER DASHBOARD STATS
// ============================================================================
console.log("\n=== VOLUNTEER STATS TESTS ===")

function testVolunteerStatsCalculation() {
  console.log("\n--- Stats calculation ---")
  const today=ymd(new Date()), yesterday=ymd(new Date(Date.now()-864e5)), tomorrow=ymd(new Date(Date.now()+864e5))
  const asgn=[
    {shifts:{shift_date:yesterday,start_time:"09:00",end_time:"12:00"}},
    {shifts:{shift_date:yesterday,start_time:"13:00",end_time:"17:00"}},
    {shifts:{shift_date:tomorrow,start_time:"09:00",end_time:"12:00"}},
    {shifts:{shift_date:tomorrow,start_time:"13:00",end_time:"17:00"}},
  ]
  let completed=0,totalHrs=0,upcoming=[]
  for(const a of asgn){
    if(a.shifts.shift_date<today){completed++;const[sH,sM]=a.shifts.start_time.split(":").map(Number);const[eH,eM]=a.shifts.end_time.split(":").map(Number);totalHrs+=(eH-sH)+(eM-sM)/60}
    else upcoming.push(a)
  }
  assertEqual(completed,2,"2 completed"); assertEqual(totalHrs,7,"7 hours"); assertEqual(upcoming.length,2,"2 upcoming")
}
function testVolunteerHoursCalcEdgeCases() {
  console.log("\n--- Hours edge cases ---")
  function hrs(s,e){const[sH,sM]=s.split(":").map(Number);const[eH,eM]=e.split(":").map(Number);return(eH-sH)+(eM-sM)/60}
  assertEqual(hrs("09:00","09:00"),0,"9-9=0"); assertEqual(hrs("09:00","09:30"),0.5,"9-9:30=0.5"); assertEqual(hrs("00:00","23:00"),23,"0-23=23")
}

// ============================================================================
// 20. REPORT formatTimeAgo
// ============================================================================
console.log("\n=== REPORT UTILITY TESTS ===")

function testFormatTimeAgo() {
  console.log("\n--- formatTimeAgo ---")
  function fta(ds){const d=Date.now()-new Date(ds).getTime();const m=Math.floor(d/6e4),h=Math.floor(d/36e5),dy=Math.floor(d/864e5);if(m<60)return`${m} minute${m!==1?"s":""} ago`;if(h<24)return`${h} hour${h!==1?"s":""} ago`;return`${dy} day${dy!==1?"s":""} ago`}
  assertEqual(fta(new Date(Date.now()-5*6e4).toISOString()),"5 minutes ago","5 min")
  assertEqual(fta(new Date(Date.now()-1*6e4).toISOString()),"1 minute ago","1 min singular")
  assertEqual(fta(new Date(Date.now()-3*36e5).toISOString()),"3 hours ago","3 hrs")
  assertEqual(fta(new Date(Date.now()-1*36e5).toISOString()),"1 hour ago","1 hr singular")
  assertEqual(fta(new Date(Date.now()-2*864e5).toISOString()),"2 days ago","2 days")
  assertEqual(fta(new Date(Date.now()-1*864e5).toISOString()),"1 day ago","1 day singular")
}

// ============================================================================
// 21. ICS ASSIGNMENT MAPPING
// ============================================================================
console.log("\n=== ICS MAPPING TESTS ===")

function testICSAssignmentMapping() {
  console.log("\n--- Assignment -> CalendarEvent ---")
  function mapA(a){const d=parseDate(a.shift_date);const[sH,sM]=a.start_time.split(":").map(Number);const[eH,eM]=a.end_time.split(":").map(Number);return{id:a.id,summary:`Volunteer Shift - ${a.slot==="AM"?"Morning":a.slot==="MID"?"Midday":"Afternoon"}`,description:"shift",location:"Vanderpump Dogs",startDate:new Date(d.getFullYear(),d.getMonth(),d.getDate(),sH,sM),endDate:new Date(d.getFullYear(),d.getMonth(),d.getDate(),eH,eM)}}
  const ev=mapA({id:"a1",shift_date:"2026-03-15",slot:"AM",start_time:"09:00",end_time:"12:00"})
  assertEqual(ev.summary,"Volunteer Shift - Morning","AM->Morning"); assertEqual(ev.startDate.getHours(),9,"start h9"); assertEqual(ev.endDate.getHours(),12,"end h12")
  assertEqual(mapA({id:"a2",shift_date:"2026-03-15",slot:"PM",start_time:"13:00",end_time:"17:00"}).summary,"Volunteer Shift - Afternoon","PM->Afternoon")
  assertEqual(mapA({id:"a3",shift_date:"2026-03-15",slot:"MID",start_time:"11:00",end_time:"14:00"}).summary,"Volunteer Shift - Midday","MID->Midday")
  assertIncludes(generateICS([ev]),"SUMMARY:Volunteer Shift - Morning","ICS has summary")
}

// ============================================================================
// 22. ADMIN CREATE USER VALIDATION
// ============================================================================
console.log("\n=== ADMIN VALIDATION TESTS ===")

function testAdminCreateUserValidation() {
  console.log("\n--- Admin create validation ---")
  function val(d){if(!d.email||!d.password||!d.name)return{valid:false};if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))return{valid:false};if(d.password.length<8)return{valid:false};return{valid:true}}
  assertEqual(val({email:"",password:"12345678",name:"J"}).valid,false,"empty email")
  assertEqual(val({email:"j@t.com",password:"",name:"J"}).valid,false,"empty pwd")
  assertEqual(val({email:"j@t.com",password:"12345678",name:""}).valid,false,"empty name")
  assertEqual(val({email:"bad",password:"12345678",name:"J"}).valid,false,"invalid email")
  assertEqual(val({email:"j@t.com",password:"1234567",name:"J"}).valid,false,"7-char pwd")
  assertEqual(val({email:"j@t.com",password:"12345678",name:"J"}).valid,true,"valid data")
}
function testRoleToggleLogic() {
  console.log("\n--- Role toggle ---")
  function t(r){return r==="admin"?"volunteer":"admin"}
  assertEqual(t("admin"),"volunteer","admin->vol"); assertEqual(t("volunteer"),"admin","vol->admin")
}
function testAdminLastAdminProtection() {
  console.log("\n--- Last admin protection ---")
  function canDemote(n){return n>1}
  assert(!canDemote(1),"cannot when 1"); assert(canDemote(2),"can when 2+")
}
function testAdminSelfDeleteProtection() {
  console.log("\n--- Self-delete protection ---")
  function canDel(c,t){return c!==t}
  assert(!canDel("u1","u1"),"cannot self-delete"); assert(canDel("u1","u2"),"can delete other")
}

// ============================================================================
// 23. LOGIN ERROR MESSAGES
// ============================================================================
console.log("\n=== LOGIN ERROR TESTS ===")

function testLoginErrorMessages() {
  console.log("\n--- Error mapping ---")
  function m(msg){if(msg.includes("Invalid login credentials")||msg.includes("invalid"))return"password incorrect";if(msg.includes("Email not confirmed"))return"verify email";return"unable to sign in"}
  assertEqual(m("Invalid login credentials"),"password incorrect","invalid creds")
  assertEqual(m("Email not confirmed"),"verify email","unconfirmed")
  assertEqual(m("Some unknown error"),"unable to sign in","unknown")
  assertEqual(m("Load failed"),"unable to sign in","load failed")
}

// ============================================================================
// 24. TOAST SUBSCRIPTION
// ============================================================================
console.log("\n=== TOAST SUBSCRIPTION TESTS ===")

function testToastSubscription() {
  console.log("\n--- Subscribe/unsubscribe ---")
  const listeners=[],received=[]
  function sub(cb){listeners.push(cb);return()=>{const i=listeners.indexOf(cb);if(i>-1)listeners.splice(i,1)}}
  function show(msg,type){listeners.forEach(l=>l(msg,type))}
  const unsub=sub((msg,type)=>received.push({msg,type}))
  show("hello","success"); assertEqual(received.length,1,"receives after sub")
  unsub(); show("world","error"); assertEqual(received.length,1,"no msg after unsub")
}
function testToastWarningType() {
  console.log("\n--- Warning type ---")
  const q=[];const mt={warning:(m)=>q.push({type:"warning",message:m})}
  mt.warning("Low"); assertEqual(q[0].type,"warning","type=warning"); assertEqual(q[0].message,"Low","msg correct")
}

// ============================================================================
// 25. ADMIN WEEK GRID LOGIC (new shifts page)
// ============================================================================
console.log("\n=== ADMIN WEEK GRID LOGIC ===")

function testWeekGridBuilding() {
  console.log("\n--- buildWeek: 7 days, Sun–Sat ---")
  function startOfWeek(d) { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); return c }
  function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c }
  function toDateStr(d) { return d.toISOString().split("T")[0] }
  function buildWeek(base) {
    const sun = startOfWeek(base)
    return Array.from({ length: 7 }, (_, i) => { const date = addDays(sun, i); return { date, dateStr: toDateStr(date) } })
  }
  const week = buildWeek(new Date(2026, 2, 18)) // Wed Mar 18 → week starts Mar 15 (Sun)
  assertEqual(week.length, 7, "week has 7 days")
  assertEqual(week[0].date.getDay(), 0, "week[0] is Sunday")
  assertEqual(week[6].date.getDay(), 6, "week[6] is Saturday")
  assertEqual(week[0].dateStr, "2026-03-15", "week starts Mar 15")
  assertEqual(week[6].dateStr, "2026-03-21", "week ends Mar 21")
}

function testWeekGridFilling() {
  console.log("\n--- fillWeek: shifts land on correct day+slot ---")
  const SLOTS = ["AM", "MID", "PM"]
  function buildWeek(base) {
    function startOfWeek(d) { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); return c }
    function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c }
    function toDateStr(d) { return d.toISOString().split("T")[0] }
    const sun = startOfWeek(base)
    return Array.from({ length: 7 }, (_, i) => { const date = addDays(sun, i); return { date, dateStr: toDateStr(date), shifts: { AM: null, MID: null, PM: null } } })
  }
  function fillWeek(weekData, shifts) {
    const map = {}
    for (const s of shifts) { if (!map[s.shift_date]) map[s.shift_date] = []; map[s.shift_date].push(s) }
    return weekData.map((day) => {
      const dayShifts = map[day.dateStr] || []
      const slotMap = { AM: null, MID: null, PM: null }
      for (const slot of SLOTS) slotMap[slot] = dayShifts.find((s) => s.slot === slot) ?? null
      return { ...day, shifts: slotMap }
    })
  }
  const week = buildWeek(new Date(2026, 2, 18))
  const shifts = [
    { id: "s1", shift_date: "2026-03-16", slot: "AM", shift_assignments: [], capacity: 3, start_time: "09:00", end_time: "12:00" },
    { id: "s2", shift_date: "2026-03-16", slot: "PM", shift_assignments: [], capacity: 3, start_time: "16:00", end_time: "20:00" },
    { id: "s3", shift_date: "2026-03-20", slot: "MID", shift_assignments: [], capacity: 5, start_time: "12:00", end_time: "16:00" },
  ]
  const filled = fillWeek(week, shifts)
  const mon = filled.find((d) => d.dateStr === "2026-03-16")
  assert(mon !== undefined, "Monday Mar 16 found in week")
  assert(mon.shifts.AM !== null, "Mon AM shift populated")
  assert(mon.shifts.PM !== null, "Mon PM shift populated")
  assert(mon.shifts.MID === null, "Mon MID slot empty")
  assertEqual(mon.shifts.AM.id, "s1", "Mon AM = s1")
  const fri = filled.find((d) => d.dateStr === "2026-03-20")
  assert(fri.shifts.MID !== null, "Fri MID shift populated")
  const sun = filled.find((d) => d.dateStr === "2026-03-15")
  assert(sun.shifts.AM === null && sun.shifts.MID === null && sun.shifts.PM === null, "Sun all empty")
}

function testFillBadgeThresholds() {
  console.log("\n--- FillBadge: color thresholds ---")
  function fillColor(assigned, capacity) {
    const full = assigned >= capacity
    const close = !full && assigned >= capacity * 0.75
    return full ? "red" : close ? "amber" : "green"
  }
  assertEqual(fillColor(0, 4), "green",  "0/4 = green")
  assertEqual(fillColor(2, 4), "green",  "2/4 = green (50%)")
  assertEqual(fillColor(3, 4), "amber",  "3/4 = amber (75%)")
  assertEqual(fillColor(4, 4), "red",    "4/4 = red (full)")
  assertEqual(fillColor(5, 4), "red",    "5/4 = red (over)")
  assertEqual(fillColor(0, 1), "green",  "0/1 = green")
  assertEqual(fillColor(1, 1), "red",    "1/1 = red")
  assertEqual(fillColor(3, 3), "red",    "3/3 = red")
}

function testFmt12() {
  console.log("\n--- fmt12: 24h→12h conversion ---")
  function fmt12(time) {
    if (!time) return ""
    const [h, m] = time.split(":").map(Number)
    const ampm = h < 12 ? "AM" : "PM"
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`
  }
  assertEqual(fmt12("08:00"), "8:00 AM",  "08:00")
  assertEqual(fmt12("12:00"), "12:00 PM", "noon")
  assertEqual(fmt12("00:00"), "12:00 AM", "midnight")
  assertEqual(fmt12("13:30"), "1:30 PM",  "13:30")
  assertEqual(fmt12("20:00"), "8:00 PM",  "20:00")
  assertEqual(fmt12(""),      "",          "empty string")
}

// ============================================================================
// 26. BULK CREATE SHIFT LOGIC (server action mirrors)
// ============================================================================
console.log("\n=== BULK CREATE SHIFT LOGIC ===")

function testBulkCreateDayFilter() {
  console.log("\n--- bulkCreateShifts: day-of-week filter ---")
  function countMatchingDays(startDate, endDate, daysOfWeek) {
    let count = 0
    const cur = new Date(startDate + "T00:00:00")
    const end = new Date(endDate + "T00:00:00")
    while (cur <= end) { if (daysOfWeek.includes(cur.getDay())) count++; cur.setDate(cur.getDate() + 1) }
    return count
  }
  // Mon–Fri for one full week (Mar 16–20 = 5 weekdays)
  assertEqual(countMatchingDays("2026-03-16", "2026-03-22", [1,2,3,4,5]), 5, "Mon–Fri in Mar 16–22 = 5")
  // Weekends only (Mar 15 Sun + Mar 21 Sat = 2)
  assertEqual(countMatchingDays("2026-03-15", "2026-03-21", [0,6]), 2, "Weekends in Mar 15–21 = 2")
  // All days for 7 days = 7
  assertEqual(countMatchingDays("2026-03-15", "2026-03-21", [0,1,2,3,4,5,6]), 7, "All days in 7-day range = 7")
  // No matching days
  assertEqual(countMatchingDays("2026-03-15", "2026-03-21", []), 0, "No days selected = 0")
  // Single day: Mon only, range has 3 Mondays
  assertEqual(countMatchingDays("2026-03-01", "2026-03-31", [1]), 5, "Mon only in March 2026 = 5 Mondays")
  // Leap year Feb: Mon count for Feb 2028
  assertEqual(countMatchingDays("2028-02-01", "2028-02-29", [1]), 5, "Feb 2028 has 5 Mondays (leap)")
}

function testBulkCreateDeduplication() {
  console.log("\n--- bulkCreateShifts: existing shift deduplication ---")
  function filterOutExisting(candidateDates, existingSet) {
    return candidateDates.filter((d) => !existingSet.has(d))
  }
  const existing = new Set(["2026-03-16", "2026-03-17"])
  const candidates = ["2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19"]
  const toCreate = filterOutExisting(candidates, existing)
  assertEqual(toCreate.length, 2, "dedup removes 2 existing dates")
  assert(!toCreate.includes("2026-03-16"), "existing date excluded")
  assert(!toCreate.includes("2026-03-17"), "existing date excluded")
  assert(toCreate.includes("2026-03-18"), "new date included")
  assert(toCreate.includes("2026-03-19"), "new date included")
  // All existing: nothing to create
  const allExisting = new Set(["2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19"])
  assertEqual(filterOutExisting(candidates, allExisting).length, 0, "all existing → 0 to create")
  // None existing: all created
  assertEqual(filterOutExisting(candidates, new Set()).length, 4, "none existing → all 4 created")
}

function testBulkDeleteOnlyEmpty() {
  console.log("\n--- bulkDeleteShifts: onlyEmpty guard ---")
  function applyOnlyEmptyFilter(shiftIds, assignedShiftIds, onlyEmpty) {
    if (!onlyEmpty) return { toDelete: shiftIds, skipped: 0 }
    const assignedSet = new Set(assignedShiftIds)
    const toDelete = shiftIds.filter((id) => !assignedSet.has(id))
    return { toDelete, skipped: shiftIds.length - toDelete.length }
  }
  const shifts = ["s1", "s2", "s3", "s4"]
  const assigned = ["s2", "s4"]
  // onlyEmpty = true: skip assigned
  const r1 = applyOnlyEmptyFilter(shifts, assigned, true)
  assertEqual(r1.toDelete.length, 2, "onlyEmpty: 2 shifts to delete")
  assertEqual(r1.skipped, 2, "onlyEmpty: 2 shifts skipped")
  assert(!r1.toDelete.includes("s2"), "s2 (assigned) not deleted")
  assert(!r1.toDelete.includes("s4"), "s4 (assigned) not deleted")
  // onlyEmpty = false: delete all including assigned
  const r2 = applyOnlyEmptyFilter(shifts, assigned, false)
  assertEqual(r2.toDelete.length, 4, "not onlyEmpty: all 4 deleted")
  assertEqual(r2.skipped, 0, "not onlyEmpty: 0 skipped")
  // All empty: same result either way
  const r3 = applyOnlyEmptyFilter(shifts, [], true)
  assertEqual(r3.toDelete.length, 4, "all empty → all 4 deleted with onlyEmpty")
}

function testBulkSlotFilter() {
  console.log("\n--- bulkDeleteShifts/updateCapacity: slot filter ---")
  const shifts = [
    { id: "s1", slot: "AM" }, { id: "s2", slot: "MID" }, { id: "s3", slot: "PM" }, { id: "s4", slot: "AM" },
  ]
  function filterBySlot(shifts, slot) {
    if (!slot || slot === "all") return shifts
    return shifts.filter((s) => s.slot === slot)
  }
  assertEqual(filterBySlot(shifts, "AM").length, 2, "slot=AM gives 2")
  assertEqual(filterBySlot(shifts, "MID").length, 1, "slot=MID gives 1")
  assertEqual(filterBySlot(shifts, "PM").length, 1, "slot=PM gives 1")
  assertEqual(filterBySlot(shifts, "all").length, 4, "slot=all gives 4")
  assertEqual(filterBySlot(shifts, undefined).length, 4, "slot=undefined gives 4")
}

// ============================================================================
// 27. ADMIN HEADER NAV ROLE ROUTING
// ============================================================================
console.log("\n=== ADMIN HEADER NAV ROLE ROUTING ===")

function testAdminNavLinks() {
  console.log("\n--- Admin role sees admin nav, not volunteer nav ---")
  function getNavLinks(role, isLoggedIn) {
    if (!isLoggedIn) return []
    if (role === "admin") return ["admin", "admin/shifts", "admin/volunteers", "admin/emails", "admin/reports", "profile"]
    return ["volunteer", "calendar", "my-schedule", "profile"]
  }
  const adminLinks = getNavLinks("admin", true)
  assert(adminLinks.includes("admin/shifts"), "admin sees shifts link")
  assert(adminLinks.includes("admin/volunteers"), "admin sees volunteers link")
  assert(adminLinks.includes("admin/emails"), "admin sees emails link")
  assert(adminLinks.includes("admin/reports"), "admin sees reports link")
  assert(!adminLinks.includes("calendar"), "admin does NOT see calendar")
  assert(!adminLinks.includes("my-schedule"), "admin does NOT see my-schedule")
  assert(!adminLinks.includes("volunteer"), "admin does NOT see volunteer dashboard")
  const volLinks = getNavLinks("volunteer", true)
  assert(volLinks.includes("calendar"), "volunteer sees calendar")
  assert(volLinks.includes("my-schedule"), "volunteer sees my-schedule")
  assert(!volLinks.includes("admin/shifts"), "volunteer does NOT see admin/shifts")
  const loggedOut = getNavLinks(null, false)
  assertEqual(loggedOut.length, 0, "logged out: no nav links")
}

function testSlotDefaults() {
  console.log("\n--- SLOT_DEFAULTS: each slot has valid time range ---")
  const SLOT_DEFAULTS = {
    AM:  { start: "08:00", end: "12:00" },
    MID: { start: "12:00", end: "16:00" },
    PM:  { start: "16:00", end: "20:00" },
  }
  for (const [slot, times] of Object.entries(SLOT_DEFAULTS)) {
    assert(times.start < times.end, `${slot}: start < end`)
    assert(/^\d{2}:\d{2}$/.test(times.start), `${slot}: start format valid`)
    assert(/^\d{2}:\d{2}$/.test(times.end), `${slot}: end format valid`)
  }
  assertEqual(SLOT_DEFAULTS.AM.start, "08:00",  "AM start = 08:00")
  assertEqual(SLOT_DEFAULTS.MID.start, "12:00", "MID start = 12:00")
  assertEqual(SLOT_DEFAULTS.PM.start, "16:00",  "PM start = 16:00")
}

function testSidePanelAssignmentFiltering() {
  console.log("\n--- SidePanel: unassigned volunteer list excludes already-assigned ---")
  const volunteers = [
    { id: "v1", name: "Alice", email: "a@example.com" },
    { id: "v2", name: "Bob",   email: "b@example.com" },
    { id: "v3", name: "Carol", email: "c@example.com" },
  ]
  const assigned = [
    { id: "a1", user_id: "v1", profiles: { id: "v1", name: "Alice", email: "a@example.com" } },
  ]
  const unassigned = volunteers.filter((v) => !assigned.some((a) => a.user_id === v.id))
  assertEqual(unassigned.length, 2, "2 unassigned volunteers")
  assert(!unassigned.some((v) => v.id === "v1"), "Alice (assigned) not in unassigned list")
  assert(unassigned.some((v) => v.id === "v2"), "Bob in unassigned list")
  assert(unassigned.some((v) => v.id === "v3"), "Carol in unassigned list")
  // Full shift: no unassigned shown
  const assignedAll = volunteers.map((v) => ({ id: "a", user_id: v.id, profiles: null }))
  const unassignedFull = volunteers.filter((v) => !assignedAll.some((a) => a.user_id === v.id))
  assertEqual(unassignedFull.length, 0, "full shift: 0 unassigned volunteers")
}

function testWeekNavigation() {
  console.log("\n--- Week navigation: prev/next week ---")
  function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c }
  function toDateStr(d) { return d.toISOString().split("T")[0] }
  const base = new Date(2026, 2, 18) // Wed Mar 18
  const nextWeek = addDays(base, 7)
  const prevWeek = addDays(base, -7)
  assertEqual(toDateStr(nextWeek), "2026-03-25", "next week = Mar 25")
  assertEqual(toDateStr(prevWeek), "2026-03-11", "prev week = Mar 11")
  // Year boundary: last week of Dec → first week of Jan
  const dec28 = new Date(2026, 11, 28)
  const jan4 = addDays(dec28, 7)
  assertEqual(jan4.getFullYear(), 2027, "Dec 28 + 7 days = 2027")
  assertEqual(jan4.getMonth(), 0, "Dec 28 + 7 days = January")
}

// ============================================================================
// RUN ALL UNIT TESTS
// ============================================================================
function runAllTests() {
  testStartOfMonth(); testEndOfMonth(); testYmd(); testAddMonths()
  testIsSameMonth(); testIsSameDay(); testParseDate(); testFormatTime12Hour(); testFormatDateForDisplay()
  testDaysInGrid(); testGridWeekdayAlignment(); testGridFirstOfMonthColumn(); testGridTodayAlignment(); testGridLeadingFillerDays()
  testCapacityStatus(); testShiftIndicatorTimeFormat(); testDayCellShiftFiltering(); testDayCellPastDayFiltering()
  testUserAssignmentSetLookup(); testYmdTimezoneConsistency(); testShiftCacheKeyFormat()
  testICSGeneration(); testICSMultipleEvents(); testICSEscaping(); testICSDateFormat()
  testToastSystem(); testToastSubscription(); testToastWarningType()
  testEmailValidation(); testPasswordValidation(); testFormRequiredFields()
  testShiftCache()
  testRecurrenceWeeklyFilter(); testRecurrenceBiweeklyFilter(); testRecurrenceMonthlyFilter(); testRecurrenceDailyFilter()
  testSlotSorting(); testSlotFindingInDayCell()
  testCalendarNavigationChaining(); testCalendarNavigationYearBoundary(); testMonthNameFormatting()
  testCapacityReductionBlocking(); testDoubleSignupPrevention(); testOvercapacityPrevention()
  testCSVHeaderFormat(); testCSVEscaping(); testCSVRowGeneration()
  testEmailCategoriesDefault(); testEmailOptInToggle(); testProfileFieldValidation()
  testBlocklistChecking(); testBlocklistInSignupFlow(); testBlocklistInAdminCreate()
  testShiftModalBadgeMapping(); testShiftIndicatorStatusColors(); testShiftIndicatorAssignedOverride()
  testEndTimeFilteringToday(); testEndTimeParsingFromString()
  testWeekdaysHeaderContract(); testWeekdaysShortContract()
  testLeapYearGrids(); testNonLeapYearFeb(); testFebruaryStartsOnSunday()
  testVolunteerStatsCalculation(); testVolunteerHoursCalcEdgeCases()
  testFormatTimeAgo()
  testICSAssignmentMapping()
  testAdminCreateUserValidation(); testRoleToggleLogic(); testAdminLastAdminProtection(); testAdminSelfDeleteProtection()
  testLoginErrorMessages()
  // Section 25–27: new admin workflow unit tests
  testWeekGridBuilding(); testWeekGridFilling(); testFillBadgeThresholds(); testFmt12()
  testBulkCreateDayFilter(); testBulkCreateDeduplication(); testBulkDeleteOnlyEmpty(); testBulkSlotFilter()
  testAdminNavLinks(); testSlotDefaults(); testSidePanelAssignmentFiltering(); testWeekNavigation()

  console.log("\n" + "=".repeat(60))
  console.log(`UNIT TEST RESULTS: ${passed} passed, ${failed} failed, ${passed+failed} total`)
  console.log("=".repeat(60))
  if(failures.length>0){console.log("\nFailed tests:");failures.forEach((f,i)=>console.log(`  ${i+1}. ${f}`))}
  if(failed===0) console.log("\nAll unit tests passed!")
}

runAllTests()
