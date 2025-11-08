# Reporting & Analytics TDD Test Plan

## Overview

Test-driven development plan for comprehensive reporting and analytics features including volunteer attendance tracking, shift fill rates, export capabilities (CSV/PDF), and dashboard analytics.

## Test Execution Strategy

1. Write test cases first
2. Implement features to pass tests
3. Run all tests and document results
4. Fix any failures
5. Integrate into regression suite

---

## TEST SUITE 1: VOLUNTEER ATTENDANCE TRACKING

### Test Case 1.1: View Volunteer Attendance History
**Objective**: Verify admin can view complete attendance history for a volunteer

**Preconditions**:
- Admin logged in as volunteer@vanderpumpdogs.org
- Test volunteer exists with multiple shift assignments (past and future)

**Test Steps**:
1. Navigate to `/admin/reports/attendance`
2. Select a volunteer from dropdown
3. Set date range (e.g., last 30 days)
4. Click "View Attendance"

**Expected Results**:
- Table displays all shifts for selected volunteer in date range
- Shows: Date, Shift Time, Status (Completed/Upcoming/Cancelled)
- Total shifts count displayed
- Data sorted by date (newest first)

**Database Verification**:
\`\`\`sql
SELECT 
  s.shift_date,
  s.start_time,
  s.end_time,
  s.slot,
  sa.created_at as signed_up_at,
  CASE 
    WHEN s.shift_date < CURRENT_DATE THEN 'Completed'
    WHEN s.shift_date = CURRENT_DATE THEN 'Today'
    ELSE 'Upcoming'
  END as status
FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
WHERE sa.user_id = '[TEST_USER_ID]'
  AND s.shift_date BETWEEN '[START_DATE]' AND '[END_DATE]'
ORDER BY s.shift_date DESC, s.start_time DESC;
\`\`\`

---

### Test Case 1.2: Calculate Volunteer Hours
**Objective**: System correctly calculates total volunteer hours

**Test Steps**:
1. View attendance for volunteer with known shifts
2. Verify "Total Hours" calculation

**Expected Results**:
- Correctly sums hours from all completed shifts
- Only counts past shifts (not upcoming)
- Displays in format: "XX hours YY minutes"

**Calculation Logic**:
\`\`\`typescript
// 9am-12pm = 3 hours
// 12pm-3pm = 3 hours  
// 3pm-5pm = 2 hours
\`\`\`

---

### Test Case 1.3: Attendance Rate Calculation
**Objective**: Calculate attendance rate (signed up vs. capacity)

**Test Steps**:
1. View overall attendance statistics
2. Verify attendance rate calculation

**Expected Results**:
- Shows: "X% attendance rate"
- Formula: (Total Assignments / Total Available Slots) × 100
- Only includes past shifts

**Database Verification**:
\`\`\`sql
-- Total assignments (past shifts)
SELECT COUNT(*) FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
WHERE s.shift_date < CURRENT_DATE;

-- Total available slots (past shifts)
SELECT SUM(capacity) FROM shifts
WHERE shift_date < CURRENT_DATE;
\`\`\`

---

## TEST SUITE 2: SHIFT FILL RATES & STATISTICS

### Test Case 2.1: View Shift Fill Rate by Date Range
**Objective**: Display fill rates for all shifts in a date range

**Test Steps**:
1. Navigate to `/admin/reports/shift-analytics`
2. Select date range (e.g., last 7 days)
3. Click "Generate Report"

**Expected Results**:
- Table shows each shift with:
  - Date, Time Slot
  - Capacity
  - Filled Count
  - Fill Rate (%)
  - Status (Full/Partial/Empty)
- Summary statistics at top:
  - Average fill rate
  - Total shifts
  - Fully booked count

**Database Query**:
\`\`\`sql
SELECT 
  s.shift_date,
  s.slot,
  s.start_time,
  s.end_time,
  s.capacity,
  COUNT(sa.id) as filled,
  ROUND((COUNT(sa.id)::numeric / s.capacity) * 100, 1) as fill_rate_percent,
  CASE 
    WHEN COUNT(sa.id) = s.capacity THEN 'Full'
    WHEN COUNT(sa.id) > 0 THEN 'Partial'
    ELSE 'Empty'
  END as status
FROM shifts s
LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
WHERE s.shift_date BETWEEN '[START_DATE]' AND '[END_DATE]'
GROUP BY s.id, s.shift_date, s.slot, s.start_time, s.end_time, s.capacity
ORDER BY s.shift_date DESC, s.start_time;
\`\`\`

---

### Test Case 2.2: Identify Underbooked Shifts
**Objective**: Highlight shifts that need more volunteers

**Test Steps**:
1. View shift analytics report
2. Filter to show "Underbooked" shifts only (< 50% filled)

**Expected Results**:
- Only shows shifts with fill rate < 50%
- Highlights in warning color (yellow/orange)
- Shows how many more volunteers needed
- Only includes future shifts (actionable)

---

### Test Case 2.3: Most/Least Popular Time Slots
**Objective**: Identify which time slots are most popular

**Test Steps**:
1. Navigate to shift analytics
2. View "Popular Times" section

**Expected Results**:
- Shows ranking of time slots by average fill rate
- Data format:
  - 9am-12pm: 85% avg fill rate
  - 12pm-3pm: 78% avg fill rate
  - 3pm-5pm: 65% avg fill rate

**Database Query**:
\`\`\`sql
SELECT 
  slot,
  COUNT(*) as total_shifts,
  AVG((SELECT COUNT(*) FROM shift_assignments WHERE shift_id = s.id)::numeric / s.capacity * 100) as avg_fill_rate
FROM shifts s
GROUP BY slot
ORDER BY avg_fill_rate DESC;
\`\`\`

---

## TEST SUITE 3: CSV EXPORT FUNCTIONALITY

### Test Case 3.1: Export Volunteer List to CSV
**Objective**: Download volunteer roster as CSV file

**Test Steps**:
1. Navigate to `/admin/volunteers`
2. Click "Export CSV" button
3. Verify file downloads

**Expected Results**:
- CSV file downloads: `volunteers_YYYY-MM-DD.csv`
- Contains columns: Name, Email, Phone, Role, Status, Joined Date
- All active volunteers included
- Proper CSV formatting (escaped commas, quotes)

**CSV Format**:
\`\`\`csv
Name,Email,Phone,Role,Status,Joined Date
"John Doe","john@example.com","555-0100","volunteer","active","2025-01-01"
\`\`\`

---

### Test Case 3.2: Export Shift Report to CSV
**Objective**: Download shift data with assignments

**Test Steps**:
1. Navigate to `/admin/reports/shift-analytics`
2. Generate report for date range
3. Click "Export CSV"

**Expected Results**:
- CSV file: `shift_report_YYYY-MM-DD_to_YYYY-MM-DD.csv`
- Columns: Date, Time Slot, Capacity, Filled, Fill Rate, Volunteers (comma-separated names)
- Includes all shifts in date range

---

### Test Case 3.3: Export Attendance Report to CSV
**Objective**: Download attendance data for analysis

**Test Steps**:
1. View attendance report
2. Click "Export CSV"

**Expected Results**:
- CSV file: `attendance_report_YYYY-MM-DD.csv`
- Columns: Volunteer Name, Email, Shift Date, Time Slot, Status
- One row per shift assignment

---

## TEST SUITE 4: PDF EXPORT FUNCTIONALITY

### Test Case 4.1: Generate PDF Shift Roster
**Objective**: Create printable shift roster

**Test Steps**:
1. Navigate to shift analytics
2. Select specific date (e.g., tomorrow)
3. Click "Print Roster" or "Export PDF"

**Expected Results**:
- PDF opens in new tab or downloads
- Professional formatting with:
  - Header: "Vanderpump Dogs - Shift Roster"
  - Date
  - Each shift time slot with volunteer names
  - Contact info for each volunteer
- Print-friendly layout

---

### Test Case 4.2: Generate PDF Volunteer Hours Report
**Objective**: Create summary report of volunteer hours

**Test Steps**:
1. Navigate to attendance report
2. Select volunteer and date range
3. Click "Export PDF"

**Expected Results**:
- PDF document with:
  - Volunteer name and details
  - List of all shifts worked
  - Total hours calculation
  - Date generated
- Professional layout suitable for records

---

## TEST SUITE 5: DASHBOARD ANALYTICS

### Test Case 5.1: Admin Dashboard Statistics Display
**Objective**: Verify dashboard shows accurate real-time statistics

**Test Steps**:
1. Navigate to `/admin`
2. View dashboard statistics

**Expected Results**:
- Cards display:
  - Total Volunteers (count from profiles table)
  - Total Shifts (count from shifts table)
  - Total Assignments (count from shift_assignments)
  - Active Volunteers This Month (volunteers with assignments)
- All counts accurate and update in real-time

**Database Queries**:
\`\`\`sql
-- Total Volunteers
SELECT COUNT(*) FROM profiles WHERE role = 'volunteer';

-- Total Shifts (future and past)
SELECT COUNT(*) FROM shifts;

-- Total Assignments
SELECT COUNT(*) FROM shift_assignments;

-- Active This Month
SELECT COUNT(DISTINCT sa.user_id)
FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
WHERE s.shift_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND s.shift_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
\`\`\`

---

### Test Case 5.2: Upcoming Shifts Overview
**Objective**: Show next 7 days of shifts with fill status

**Test Steps**:
1. View admin dashboard
2. Scroll to "Upcoming Shifts" section

**Expected Results**:
- Shows next 7 days
- For each shift:
  - Date, Time slot
  - Fill status (X/Y filled)
  - Visual indicator (full/partial/empty)
- Click to view details

---

### Test Case 5.3: Recent Activity Feed
**Objective**: Display recent volunteer sign-ups and cancellations

**Test Steps**:
1. View admin dashboard
2. Check "Recent Activity" section

**Expected Results**:
- Shows last 10 activities:
  - "John Doe signed up for Jan 15, 9am-12pm"
  - "Jane Smith cancelled Jan 14, 12pm-3pm"
- Timestamp (e.g., "2 hours ago")
- Most recent first

---

### Test Case 5.4: Monthly Trends Chart
**Objective**: Visualize volunteer participation trends

**Test Steps**:
1. View dashboard analytics section
2. Check monthly trends chart

**Expected Results**:
- Line/bar chart showing:
  - X-axis: Last 6 months
  - Y-axis: Number of shift assignments
- Hover shows exact count
- Clear upward/downward trends visible

---

## TEST SUITE 6: AUTHORIZATION & SECURITY

### Test Case 6.1: Reports Restricted to Admins Only
**Objective**: Verify volunteers cannot access reports

**Test Steps**:
1. Login as volunteer (not admin)
2. Try to navigate to `/admin/reports`

**Expected Results**:
- Redirected to `/calendar` or access denied page
- 403 Forbidden if direct URL access
- Navigation links hidden in UI

**Middleware Check**:
\`\`\`typescript
// Should verify role === 'admin' in middleware
\`\`\`

---

### Test Case 6.2: Export Functions Require Admin Role
**Objective**: Server actions check authorization

**Test Steps**:
1. Attempt to call export functions without admin role
2. Verify rejection

**Expected Results**:
- Server action returns error: "Unauthorized"
- No data exported
- Error logged

---

## TEST SUITE 7: PERFORMANCE & DATA INTEGRITY

### Test Case 7.1: Large Dataset Performance
**Objective**: Reports load efficiently with 100+ volunteers

**Test Steps**:
1. Generate report with large dataset
2. Measure load time

**Expected Results**:
- Report generates in < 2 seconds
- CSV export completes in < 5 seconds
- No browser freezing
- Proper pagination if needed

---

### Test Case 7.2: Date Range Validation
**Objective**: Handle invalid date ranges gracefully

**Test Steps**:
1. Try to generate report with:
   - End date before start date
   - Future dates only
   - Extremely large range (> 1 year)

**Expected Results**:
- Error messages for invalid ranges
- Sensible defaults applied
- No crashes or errors

---

### Test Case 7.3: Empty Data Handling
**Objective**: Handle cases with no data

**Test Steps**:
1. Generate report for date range with no shifts
2. View volunteer with no assignments

**Expected Results**:
- Friendly message: "No data found for this period"
- Empty state UI (not blank page)
- Export buttons disabled or show empty file

---

## TEST SUITE 8: INTEGRATION TESTS

### Test Case 8.1: Real-Time Data Sync
**Objective**: Reports reflect latest data

**Test Steps**:
1. View dashboard statistics
2. Have another user sign up for shift
3. Refresh dashboard

**Expected Results**:
- Statistics update to reflect new assignment
- No caching issues
- Data always current

---

### Test Case 8.2: Cross-Feature Consistency
**Objective**: Reports match source data

**Test Steps**:
1. Count volunteers in volunteers page
2. Check count in dashboard statistics
3. Export CSV and count rows

**Expected Results**:
- All three sources show same count
- No discrepancies
- Data integrity maintained

---

## TEST EXECUTION CHECKLIST

- [ ] All 28 test cases documented
- [ ] Database schema supports reporting queries
- [ ] Server actions implemented with authorization
- [ ] UI components created for reports
- [ ] CSV export functions implemented
- [ ] PDF export functions implemented
- [ ] Dashboard analytics charts implemented
- [ ] All tests executed and documented
- [ ] Failures fixed and retested
- [ ] Integration with regression suite complete

---

## SUCCESS CRITERIA

- 100% test pass rate (28/28 tests)
- All reports load in < 2 seconds
- Export functions work for CSV and PDF
- Admin-only authorization enforced
- Data accuracy verified across all reports
- Integration tests confirm cross-feature consistency

---

## REGRESSION SUITE INTEGRATION

After all tests pass, add to regression suite:
- Update COMPLETE_TEST_EXECUTION_REPORT_FINAL.md
- Add 28 new test cases (total: 119 + 28 = 147)
- Document Feature #3 completion
- Ready to proceed to Feature #4

---

**Test Plan Created**: January 2025  
**Feature**: Enhanced Reporting & Analytics  
**Status**: Ready for Implementation
