# Volunteer Connect - Comprehensive Volunteer Workflow Test Plan
## Test-Driven Development (TDD) Framework

**Version**: 2.0  
**Last Updated**: January 2025  
**Test Environment**: Production-Ready with Live Supabase Database  
**Admin Credentials**: volunteer@vanderpumpdogs.org / VolunteerAdmin2026

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Test Environment Setup](#test-environment-setup)
3. [TDD Principles & Workflow](#tdd-principles--workflow)
4. [Test Suites Overview](#test-suites-overview)
5. [Detailed Test Cases](#detailed-test-cases)
6. [Regression Testing Procedures](#regression-testing-procedures)
7. [Test Execution Reports](#test-execution-reports)

---

## EXECUTIVE SUMMARY

This comprehensive test plan validates the complete volunteer workflow using test-driven development principles. All tests use **live Supabase database connections** with no mock data in production.

### Core Workflows Tested
1. **Volunteer Registration** - Account creation with email preferences
2. **Volunteer Authentication** - Login/logout functionality
3. **Shift Discovery** - Calendar navigation and shift browsing
4. **Shift Sign-Up** - Booking shifts during defined time slots
5. **Shift Management** - Viewing and cancelling personal shifts
6. **Admin Verification** - Admin oversight and management capabilities

### Shift Time Slots (Production)
- **Morning**: 9:00 AM - 12:00 PM
- **Midday**: 12:00 PM - 3:00 PM
- **Afternoon**: 3:00 PM - 5:00 PM

---

## TEST ENVIRONMENT SETUP

### Prerequisites Checklist
- [ ] Live Supabase database connection verified
- [ ] Environment variables configured in production
- [ ] Admin user exists: volunteer@vanderpumpdogs.org
- [ ] Shifts seeded for next 90 days with production times
- [ ] Test volunteer accounts created (minimum 3)
- [ ] Database RLS policies active and tested

### Database Configuration Verification

\`\`\`sql
-- Run these queries to verify production setup
-- Query 1: Verify admin user exists and has correct role
SELECT id, email, name, role, active 
FROM profiles 
WHERE email = 'volunteer@vanderpumpdogs.org';
-- Expected: 1 row, role = 'admin', active = true

-- Query 2: Verify shifts exist with correct times
SELECT shift_date, slot, start_time, end_time, capacity
FROM shifts
WHERE shift_date >= CURRENT_DATE
ORDER BY shift_date, slot
LIMIT 10;
-- Expected: Shifts with times 09:00-12:00, 12:00-15:00, 15:00-17:00

-- Query 3: Verify RLS policies are enabled
SELECT schemaname, tablename, policyname, permissive, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: Multiple policies for profiles, shifts, shift_assignments
\`\`\`

### Test Data Setup Script

\`\`\`sql
-- Create test volunteers (run once)
-- NOTE: These should be created via signup UI in production
-- This script is for initial test environment setup only

-- Test Volunteer 1: Active volunteer
INSERT INTO profiles (id, name, email, phone, role, active)
VALUES (
  'test-vol-001',
  'Jane Volunteer',
  'jane.volunteer@example.com',
  '(555) 111-1111',
  'volunteer',
  true
);

-- Test Volunteer 2: New volunteer (just signed up)
INSERT INTO profiles (id, name, email, phone, role, active)
VALUES (
  'test-vol-002',
  'John Newbie',
  'john.newbie@example.com',
  '(555) 222-2222',
  'volunteer',
  true
);

-- Test Volunteer 3: Inactive volunteer
INSERT INTO profiles (id, name, email, phone, role, active)
VALUES (
  'test-vol-003',
  'Mike Inactive',
  'mike.inactive@example.com',
  '(555) 333-3333',
  'volunteer',
  false
);
\`\`\`

---

## TDD PRINCIPLES & WORKFLOW

### Test-Driven Development Cycle

\`\`\`
1. WRITE TEST FIRST (RED)
   ├─> Define expected behavior
   ├─> Write test case that will fail initially
   └─> Document expected vs actual results

2. IMPLEMENT FEATURE (GREEN)
   ├─> Write minimum code to pass test
   ├─> Verify test passes with live database
   └─> Document actual results

3. REFACTOR (REFACTOR)
   ├─> Improve code quality
   ├─> Optimize database queries
   └─> Maintain passing tests

4. REGRESSION TEST (VERIFY)
   ├─> Re-run all previous tests
   ├─> Ensure no functionality broken
   └─> Update test status
\`\`\`

### TDD Rules for This Project

1. **Database-First Testing**
   - All tests MUST use live Supabase connection
   - No mocking of database responses in production
   - Verify RLS policies work correctly
   - Test database constraints and validations

2. **User-Centric Test Cases**
   - Write tests from volunteer perspective
   - Test complete user journeys (signup → shift booking → management)
   - Validate UI feedback (toast notifications, loading states)
   - Ensure error messages are clear and actionable

3. **Edge Case Coverage**
   - Test capacity limits (full shifts, overbooking prevention)
   - Test concurrent access (multiple volunteers, race conditions)
   - Test invalid inputs (bad dates, invalid emails)
   - Test permission boundaries (volunteer vs admin access)

4. **Regression Testing After Every Change**
   - Run full test suite after each feature implementation
   - Document pass/fail status in test execution report
   - Fix failures immediately before proceeding
   - Maintain 100% pass rate before production deployment

---

## TEST SUITES OVERVIEW

### Test Suite Breakdown

| Suite ID | Suite Name | Test Count | Priority | Status |
|----------|-----------|------------|----------|--------|
| TS-VR | Volunteer Registration | 8 tests | Critical | READY |
| TS-VA | Volunteer Authentication | 6 tests | Critical | READY |
| TS-VC | Calendar & Shift Discovery | 7 tests | High | READY |
| TS-VS | Shift Sign-Up & Management | 10 tests | Critical | READY |
| TS-VE | Edge Cases & Validation | 8 tests | High | READY |
| TS-AR | Admin Role Verification | 5 tests | Critical | READY |
| TS-RG | Responsive Design | 4 tests | Medium | READY |
| TS-SEC | Security & Permissions | 6 tests | Critical | READY |
| TS-PERF | Performance & Load | 4 tests | Medium | READY |

**Total Test Cases**: 58  
**Estimated Execution Time**: 2-3 hours (full suite)  
**Automation Potential**: 70% (manual UI testing required for 30%)

---

## DETAILED TEST CASES

---

## TEST SUITE TS-VR: VOLUNTEER REGISTRATION

### Purpose
Validate complete volunteer registration process including account creation, email preferences, and blocklist checking.

---

### TC-VR-001: Successful Volunteer Registration
**Priority**: P0 (Critical)  
**Test Type**: Integration  
**Database Operations**: INSERT into auth.users, INSERT into profiles

**Preconditions**:
- User is not logged in
- Email address not in database
- Email not on blocklist

**Test Steps**:
1. Navigate to `/auth/signup`
2. Fill in registration form:
   - Full Name: "Test Volunteer Alpha"
   - Email: "test.volunteer.alpha@example.com"
   - Phone: "(555) 987-6543"
   - Password: "SecurePass123!"
3. Check "Email Communications" checkbox
4. Select email preferences:
   - [x] Shift reminders
   - [x] Booking confirmations
   - [ ] Promotional messages
   - [x] Urgent notifications
5. Click "Create Account" button
6. Wait for processing

**Expected Results**:
- ✅ Form submission succeeds
- ✅ User account created in auth.users table
- ✅ Profile created in profiles table with:
  - `role = 'volunteer'`
  - `active = true`
  - `email_opt_in = true`
  - `email_categories = {"reminders": true, "confirmations": true, "promotional": false, "urgent": true}`
- ✅ Success toast notification shown: "Account created! Please check your email..."
- ✅ User redirected to `/calendar` page
- ✅ Verification email sent to user's email address

**Database Verification**:
\`\`\`sql
-- Verify user was created correctly
SELECT 
  p.id,
  p.name,
  p.email,
  p.phone,
  p.role,
  p.active,
  p.email_opt_in,
  p.email_categories
FROM profiles p
WHERE p.email = 'test.volunteer.alpha@example.com';

-- Expected output:
-- id: <uuid>
-- name: Test Volunteer Alpha
-- email: test.volunteer.alpha@example.com
-- phone: (555) 987-6543
-- role: volunteer
-- active: true
-- email_opt_in: true
-- email_categories: {"reminders": true, "confirmations": true, "promotional": false, "urgent": true}
\`\`\`

**Actual Results**: _To be filled during execution_

**Pass/Fail**: ☐ PASS ☐ FAIL

**Notes**: _Any deviations or observations_

---

### TC-VR-002: Registration with Email Opt-Out
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Preconditions**:
- User is not logged in
- Valid email address

**Test Steps**:
1. Navigate to `/auth/signup`
2. Fill in required fields (name, email, phone, password)
3. **Leave "Email Communications" checkbox UNCHECKED**
4. Click "Create Account"

**Expected Results**:
- ✅ Account created successfully
- ✅ `email_opt_in = false` in database
- ✅ `email_categories = null` (no granular preferences saved)
- ✅ User will not receive any promotional emails

**Database Verification**:
\`\`\`sql
SELECT email_opt_in, email_categories
FROM profiles
WHERE email = 'test.no.email@example.com';

-- Expected:
-- email_opt_in: false
-- email_categories: null
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VR-003: Registration with Blocked Email
**Priority**: P0 (Critical)  
**Test Type**: Integration  
**Database Operations**: SELECT from auth_blocklist

**Preconditions**:
- Email exists in `auth_blocklist` table

**Test Data Setup**:
\`\`\`sql
-- Add test blocked email
INSERT INTO auth_blocklist (email)
VALUES ('blocked.user@example.com');
\`\`\`

**Test Steps**:
1. Navigate to `/auth/signup`
2. Enter blocked email: "blocked.user@example.com"
3. Fill in other required fields
4. Click "Create Account"

**Expected Results**:
- ❌ Account creation FAILS
- ✅ Error message displayed: "This email address is not permitted to register."
- ✅ User remains on signup page
- ✅ No database entries created
- ✅ Form fields retain values (except password cleared for security)

**Database Verification**:
\`\`\`sql
-- Verify no account was created
SELECT COUNT(*) FROM profiles WHERE email = 'blocked.user@example.com';
-- Expected: 0
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VR-004: Registration with Duplicate Email
**Priority**: P1 (High)  
**Test Type**: Integration

**Preconditions**:
- Email already exists in system

**Test Steps**:
1. Attempt to register with existing email
2. Fill in all required fields
3. Submit form

**Expected Results**:
- ❌ Registration FAILS
- ✅ Error message: "User already registered" or similar
- ✅ Database unique constraint prevents duplicate
- ✅ User advised to use password reset if account exists

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VR-005: Required Field Validation
**Priority**: P1 (High)  
**Test Type**: UI/Validation

**Test Steps**:
1. Navigate to signup page
2. Leave name field empty
3. Attempt to submit

**Expected Results**:
- ✅ Browser validation prevents submission
- ✅ "Please fill out this field" message shown
- ✅ No API call made

**Test Variations**:
- Empty email field
- Empty phone field
- Empty password field
- Password < 6 characters

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VR-006: Invalid Email Format
**Priority**: P1 (High)  
**Test Type**: Validation

**Test Steps**:
1. Enter invalid email formats:
   - "notanemail"
   - "missing@domain"
   - "@nodomain.com"
   - "spaces in@email.com"
2. Attempt submission

**Expected Results**:
- ✅ Browser email validation triggers
- ✅ "Please include '@' in the email address" or similar
- ✅ No API call until valid format entered

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VR-007: Phone Number Validation
**Priority**: P2 (Medium)  
**Test Type**: Validation

**Test Steps**:
1. Test various phone formats:
   - Valid: "(555) 123-4567"
   - Valid: "555-123-4567"
   - Valid: "5551234567"
   - Valid: "+1 555 123 4567"
   - Invalid: "abc-def-ghij"
   - Invalid: "123" (too short)

**Expected Results**:
- ✅ Valid formats accepted and saved
- ✅ Invalid formats rejected with helpful error message
- ✅ Phone format guidance shown in placeholder or help text

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VR-008: Weak Password Rejection
**Priority**: P1 (High)  
**Test Type**: Security

**Test Steps**:
1. Attempt registration with weak passwords:
   - "12345" (too short)
   - "abc" (too short)
   - "password" (common)
2. Submit form

**Expected Results**:
- ✅ Supabase rejects password < 6 characters
- ✅ Error message shown
- ✅ User prompted to create stronger password

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## TEST SUITE TS-VA: VOLUNTEER AUTHENTICATION

### Purpose
Validate login, logout, and session management for volunteers.

---

### TC-VA-001: Successful Volunteer Login
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Preconditions**:
- Test volunteer account exists
- User is not currently logged in

**Test Steps**:
1. Navigate to `/auth/login`
2. Enter credentials:
   - Email: "test.volunteer.alpha@example.com"
   - Password: "SecurePass123!"
3. Click "Sign In"

**Expected Results**:
- ✅ Authentication succeeds
- ✅ Session created in Supabase Auth
- ✅ User redirected to `/calendar` page
- ✅ Header shows user name and profile link
- ✅ "Volunteer" role recognized (no admin menu visible)

**Database Verification**:
\`\`\`sql
-- Verify session was created (check Supabase Auth logs)
-- In application, check:
SELECT * FROM auth.sessions WHERE user_id = <test_user_id>;
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VA-002: Login with Invalid Password
**Priority**: P0 (Critical)  
**Test Type**: Security

**Test Steps**:
1. Navigate to login page
2. Enter valid email but wrong password
3. Click "Sign In"

**Expected Results**:
- ❌ Login FAILS
- ✅ Error message: "Invalid login credentials"
- ✅ User remains on login page
- ✅ No session created
- ✅ Password field cleared for security

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VA-003: Login with Non-Existent Email
**Priority**: P1 (High)  
**Test Type**: Security

**Test Steps**:
1. Attempt login with email not in database
2. Enter any password
3. Submit

**Expected Results**:
- ❌ Login FAILS
- ✅ Generic error message (don't reveal if email exists)
- ✅ "Invalid login credentials" shown
- ✅ No information leakage about user existence

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VA-004: Successful Logout
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Preconditions**:
- User is logged in

**Test Steps**:
1. Click "Sign Out" button in header
2. Observe application behavior

**Expected Results**:
- ✅ Session terminated in Supabase
- ✅ User redirected to `/auth/login`
- ✅ Header shows login/signup options (user menu hidden)
- ✅ Cannot access protected routes without re-authentication

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VA-005: Session Persistence Across Page Refresh
**Priority**: P1 (High)  
**Test Type**: Integration

**Preconditions**:
- User is logged in

**Test Steps**:
1. Log in successfully
2. Navigate to any page (e.g., /calendar)
3. Refresh browser (F5 or Cmd+R)
4. Observe session state

**Expected Results**:
- ✅ User remains logged in after refresh
- ✅ Session restored from localStorage/cookie
- ✅ User data (name, role) displayed correctly
- ✅ No re-authentication required

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VA-006: Session Timeout (Extended Session)
**Priority**: P2 (Medium)  
**Test Type**: Integration

**Preconditions**:
- User logged in

**Test Steps**:
1. Log in
2. Leave browser idle for extended period (1+ hour)
3. Attempt to perform action (e.g., sign up for shift)

**Expected Results**:
- ✅ Supabase refreshes token automatically (if within refresh window)
- ✅ OR prompts re-authentication if session expired
- ✅ User not signed up for shift if session expired
- ✅ Clear error message if re-auth needed

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## TEST SUITE TS-VC: CALENDAR & SHIFT DISCOVERY

### Purpose
Validate volunteer ability to browse shifts, navigate calendar, and discover available opportunities.

---

### TC-VC-001: Load Calendar View
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Preconditions**:
- User logged in as volunteer
- Shifts exist in database for current month

**Test Steps**:
1. Navigate to `/calendar`
2. Wait for page load

**Expected Results**:
- ✅ Calendar grid displays current month
- ✅ All days of month visible in grid layout
- ✅ Days with shifts show visual indicators
- ✅ Previous/Next month navigation buttons visible
- ✅ Month name and year displayed
- ✅ Loading state shown while fetching data
- ✅ Shift data loaded from live Supabase database

**Database Query Used**:
\`\`\`sql
-- Application should execute:
SELECT 
  s.id,
  s.shift_date,
  s.slot,
  s.start_time,
  s.end_time,
  s.capacity,
  COUNT(sa.id) as assignments_count
FROM shifts s
LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
WHERE s.shift_date >= '2025-01-01'
  AND s.shift_date < '2025-02-01'
GROUP BY s.id
ORDER BY s.shift_date, s.slot;
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VC-002: Navigate to Previous Month
**Priority**: P0 (Critical)  
**Test Type**: UI/Integration

**Test Steps**:
1. On calendar page, note current month
2. Click "Previous Month" button (left arrow)
3. Observe calendar update

**Expected Results**:
- ✅ Calendar grid updates to show previous month
- ✅ Month header changes (e.g., "January 2025" → "December 2024")
- ✅ Shift data loads for new month from database
- ✅ Loading indicator shown during fetch
- ✅ Smooth transition (no page flash)

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VC-003: Navigate to Next Month
**Priority**: P0 (Critical)  
**Test Type**: UI/Integration

**Test Steps**:
1. Click "Next Month" button (right arrow)
2. Observe calendar behavior

**Expected Results**:
- ✅ Calendar advances to next month
- ✅ Shifts loaded for new month
- ✅ Visual indicators update correctly
- ✅ Can navigate multiple months forward

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VC-004: View Shift Capacity Indicators
**Priority**: P1 (High)  
**Test Type**: UI

**Preconditions**:
- Shifts exist with varying capacity levels

**Test Steps**:
1. View calendar with different shift statuses:
   - Available shift (< 70% full)
   - Nearly full shift (70-99% full)
   - Full shift (100% capacity)
2. Observe color coding

**Expected Results**:
- ✅ **Available shifts**: Green indicator
- ✅ **Nearly full shifts**: Orange indicator
- ✅ **Full shifts**: Red indicator
- ✅ Days with no shifts: Gray/neutral
- ✅ Legend displayed explaining color scheme
- ✅ Capacity numbers shown (e.g., "2/3" means 2 of 3 slots filled)

**Visual Reference**:
\`\`\`
Day 15: [GREEN]  Morning 2/4  Midday 1/3  Afternoon 0/3
Day 16: [ORANGE] Morning 3/4  Midday 2/3  Afternoon 3/3
Day 17: [RED]    Morning 4/4  Midday 3/3  Afternoon 3/3
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VC-005: Click Day to View Shift Details
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Test Steps**:
1. Click on a day that has shifts
2. Observe detail panel

**Expected Results**:
- ✅ Detail panel opens showing all shifts for that day
- ✅ Each shift shows:
  - Shift name (Morning/Midday/Afternoon)
  - Time range (9:00 AM - 12:00 PM, etc.)
  - Current capacity (X/Y filled)
  - Sign-up button (if space available)
- ✅ Shifts sorted by time (Morning, Midday, Afternoon)
- ✅ Past shifts show "This shift has passed" instead of sign-up button

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VC-006: View Empty Day (No Shifts Scheduled)
**Priority**: P2 (Medium)  
**Test Type**: UI

**Test Steps**:
1. Click on a day with no shifts
2. View detail panel

**Expected Results**:
- ✅ Message displayed: "No shifts scheduled for this date"
- ✅ No sign-up buttons shown
- ✅ Suggestion to check other dates or contact admin
- ✅ Can close panel and select another day

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VC-007: Calendar Loads Shifts for Next 90 Days
**Priority**: P1 (High)  
**Test Type**: Integration

**Preconditions**:
- Shifts seeded for 90 days in database

**Test Steps**:
1. Navigate through 3 months forward
2. Verify shifts appear in each month

**Expected Results**:
- ✅ All months show shift data
- ✅ Production shift times (9am-12pm, 12pm-3pm, 3pm-5pm) visible
- ✅ No errors when navigating far into future
- ✅ Database queries optimized (only fetch month being viewed)

**Database Verification**:
\`\`\`sql
-- Verify 90 days of shifts exist
SELECT 
  COUNT(*) as total_shifts,
  MIN(shift_date) as earliest,
  MAX(shift_date) as latest
FROM shifts
WHERE shift_date >= CURRENT_DATE;

-- Expected: 
-- total_shifts: ~270 (90 days × 3 shifts per day)
-- earliest: today's date
-- latest: ~90 days from now
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## TEST SUITE TS-VS: SHIFT SIGN-UP & MANAGEMENT

### Purpose
Validate complete volunteer shift sign-up workflow and personal schedule management.

---

### TC-VS-001: Sign Up for Available Shift
**Priority**: P0 (Critical)  
**Test Type**: Integration  
**Database Operations**: INSERT into shift_assignments

**Preconditions**:
- User logged in as volunteer
- Shift exists with available capacity

**Test Steps**:
1. Navigate to calendar
2. Click on a future date with available shifts
3. Select shift with green "available" indicator
4. Click "Sign Up" button
5. Wait for confirmation

**Expected Results**:
- ✅ Sign-up button shows loading state ("Signing up...")
- ✅ Assignment inserted into `shift_assignments` table
- ✅ Success toast notification: "Successfully signed up for shift!"
- ✅ Shift capacity updates (e.g., "2/3" becomes "3/3")
- ✅ Sign-up button changes to "Cancel Signup"
- ✅ Shift appears in user's "My Schedule" page
- ✅ Cannot sign up for same shift twice (validation)

**Database Verification**:
\`\`\`sql
-- Verify assignment was created
SELECT 
  sa.id,
  sa.shift_id,
  sa.user_id,
  sa.created_at,
  s.shift_date,
  s.slot,
  s.start_time,
  s.end_time
FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
WHERE sa.user_id = '<test_user_id>'
  AND s.shift_date = '2025-01-20'
  AND s.slot = 'AM';

-- Expected: 1 row with current timestamp
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-002: Cancel Shift Sign-Up
**Priority**: P0 (Critical)  
**Test Type**: Integration  
**Database Operations**: DELETE from shift_assignments

**Preconditions**:
- User already signed up for a future shift

**Test Steps**:
1. View shift detail panel for shift user is signed up for
2. Click "Cancel Signup" button
3. Confirm cancellation in dialog

**Expected Results**:
- ✅ Confirmation dialog appears: "Cancel your signup for this shift?"
- ✅ On confirm, assignment deleted from database
- ✅ Success toast: "Signup cancelled successfully"
- ✅ Capacity decrements (e.g., "3/3" becomes "2/3")
- ✅ Button changes back to "Sign Up"
- ✅ Shift removed from "My Schedule" page

**Database Verification**:
\`\`\`sql
-- Verify assignment was deleted
SELECT COUNT(*) 
FROM shift_assignments
WHERE user_id = '<test_user_id>'
  AND shift_id = '<cancelled_shift_id>';

-- Expected: 0 (assignment deleted)
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-003: Attempt to Sign Up for Full Shift
**Priority**: P0 (Critical)  
**Test Type**: Validation

**Preconditions**:
- Shift exists at full capacity (assignments = capacity)

**Test Steps**:
1. View shift detail panel for full shift
2. Observe sign-up button state

**Expected Results**:
- ✅ "Sign Up" button is DISABLED
- ✅ Button shows "Shift Full" text
- ✅ Red capacity indicator visible
- ✅ Capacity shows "3/3" or similar (full)
- ✅ Cannot click button to attempt signup
- ✅ No error if somehow bypassed (database constraint prevents)

**Database Constraint Verification**:
\`\`\`sql
-- If someone tries to bypass UI validation, database should reject:
-- This should FAIL due to capacity validation in RLS or application logic
INSERT INTO shift_assignments (shift_id, user_id)
VALUES ('<full_shift_id>', '<test_user_id>');

-- Expected: Error or rejection
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-004: View My Schedule Page
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Preconditions**:
- User logged in
- User has signed up for multiple shifts

**Test Steps**:
1. Navigate to `/my-schedule`
2. View list of upcoming shifts

**Expected Results**:
- ✅ All future shifts user is signed up for are displayed
- ✅ Shifts sorted chronologically (nearest first)
- ✅ Each shift card shows:
  - Day of week
  - Date (Month Day)
  - Time range
  - Shift type badge (Morning/Midday/Afternoon)
  - "Cancel Shift" button
- ✅ Past shifts NOT shown
- ✅ If no shifts, friendly empty state with "Sign up for shifts" button

**Database Query**:
\`\`\`sql
-- Application should execute:
SELECT 
  sa.id,
  s.shift_date,
  s.slot,
  s.start_time,
  s.end_time
FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
WHERE sa.user_id = '<current_user_id>'
  AND s.shift_date >= CURRENT_DATE
ORDER BY s.shift_date, s.slot;
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-005: Cancel Shift from My Schedule
**Priority**: P1 (High)  
**Test Type**: Integration

**Test Steps**:
1. From "My Schedule" page
2. Click "Cancel Shift" button on a shift card
3. Confirm cancellation

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ On confirm, shift removed from schedule
- ✅ Success toast shown
- ✅ List updates immediately (shift card removed)
- ✅ If last shift removed, empty state shown

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-006: Prevent Duplicate Sign-Up
**Priority**: P0 (Critical)  
**Test Type**: Validation

**Preconditions**:
- User already signed up for a specific shift

**Test Steps**:
1. Navigate to calendar
2. View day with shift user is already signed up for
3. Observe button state

**Expected Results**:
- ✅ "Sign Up" button replaced with "Cancel Signup"
- ✅ Cannot sign up twice for same shift
- ✅ Database unique constraint on (shift_id, user_id) enforced
- ✅ If somehow bypassed, error: "You are already signed up for this shift"

**Database Constraint**:
\`\`\`sql
-- Verify unique constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'shift_assignments'::regclass
  AND contype = 'u';

-- Expected: unique_shift_assignment or similar constraint
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-007: Sign Up for Multiple Shifts Same Day
**Priority**: P1 (High)  
**Test Type**: Integration

**Test Steps**:
1. Sign up for Morning shift on a specific date
2. Sign up for Midday shift on same date
3. Attempt to sign up for Afternoon shift on same date

**Expected Results**:
- ✅ All three sign-ups succeed (no restriction on same-day bookings)
- ✅ OR: Application shows warning if business rules limit same-day shifts
- ✅ Each assignment tracked separately in database
- ✅ All three shifts appear in "My Schedule"

**Design Decision**: Clarify with stakeholders if volunteers should be allowed multiple shifts per day

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-008: Attempt to Sign Up for Past Shift
**Priority**: P1 (High)  
**Test Type**: Validation

**Test Steps**:
1. Navigate to a date in the past
2. View shift details

**Expected Results**:
- ✅ "Sign Up" button hidden or disabled
- ✅ Message: "This shift has passed"
- ✅ Cannot book shift in the past
- ✅ Database constraint prevents backdated assignments if UI bypassed

**Database Constraint**:
\`\`\`sql
-- Verify shifts table has constraint or trigger preventing past assignments
-- Example validation:
SELECT * FROM shifts 
WHERE shift_date < CURRENT_DATE;

-- Past shifts should not allow new assignments
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-009: Shift Sign-Up with Inactive Account
**Priority**: P2 (Medium)  
**Test Type**: Security

**Preconditions**:
- User account exists but `active = false`

**Test Steps**:
1. Log in with inactive account (if allowed)
2. Attempt to sign up for shift

**Expected Results**:
- ✅ Inactive users cannot sign up for shifts
- ✅ Error message: "Your account is inactive. Please contact an administrator."
- ✅ Database RLS policy prevents inactive users from inserting assignments
- ✅ OR: Inactive users cannot log in at all

**Database RLS Policy Check**:
\`\`\`sql
-- Verify RLS policy restricts inactive users
SELECT * FROM pg_policies 
WHERE tablename = 'shift_assignments'
  AND policyname LIKE '%active%';

-- Expected: Policy that checks profiles.active = true
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VS-010: Load My Schedule with No Upcoming Shifts
**Priority**: P2 (Medium)  
**Test Type**: UI

**Preconditions**:
- User has no future shifts assigned

**Test Steps**:
1. Navigate to `/my-schedule`

**Expected Results**:
- ✅ Empty state displayed with calendar icon
- ✅ Message: "No upcoming shifts"
- ✅ Helpful subtext: "Sign up for shifts on the calendar to see them here"
- ✅ Button: "View Calendar" linking to /calendar
- ✅ No loading spinner stuck indefinitely

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## TEST SUITE TS-VE: EDGE CASES & VALIDATION

### Purpose
Test boundary conditions, error handling, and data validation.

---

### TC-VE-001: Concurrent Sign-Up Race Condition
**Priority**: P0 (Critical)  
**Test Type**: Concurrency

**Setup**:
- Shift with 1 remaining slot (2/3 filled)
- Two volunteers attempt signup simultaneously

**Test Steps**:
1. Open two browser sessions with different volunteer accounts
2. Both navigate to same shift
3. Both click "Sign Up" at nearly same time
4. Observe results

**Expected Results**:
- ✅ First request succeeds, second fails
- ✅ Second volunteer sees error: "Shift is already at full capacity"
- ✅ Database transaction handling prevents overbooking
- ✅ Final capacity: 3/3 (not 4/3)
- ✅ Only one assignment created

**Database Verification**:
\`\`\`sql
-- Verify no overbooking occurred
SELECT 
  s.capacity,
  COUNT(sa.id) as assignments_count
FROM shifts s
LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
WHERE s.id = '<test_shift_id>'
GROUP BY s.id, s.capacity;

-- Expected: assignments_count <= capacity
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VE-002: Database Connection Loss During Sign-Up
**Priority**: P1 (High)  
**Test Type**: Error Handling

**Simulation**:
- Pause database connection during sign-up request

**Test Steps**:
1. Initiate sign-up for shift
2. Simulate network/database error
3. Observe error handling

**Expected Results**:
- ✅ Error toast displayed with retry option
- ✅ Loading state clears
- ✅ No partial data written to database
- ✅ User can retry operation
- ✅ No UI crash or infinite loading

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VE-003: Navigate to Invalid Shift ID
**Priority**: P2 (Medium)  
**Test Type**: Error Handling

**Test Steps**:
1. Manually navigate to URL with non-existent shift ID
2. Example: `/admin/shifts/invalid-uuid`

**Expected Results**:
- ✅ 404 or "Shift not found" error page
- ✅ No application crash
- ✅ User can navigate back to calendar
- ✅ Helpful error message

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VE-004: Extreme Date Navigation (Year in Future)
**Priority**: P3 (Low)  
**Test Type**: Edge Case

**Test Steps**:
1. Navigate calendar forward 12+ months
2. View dates far in future

**Expected Results**:
- ✅ Calendar continues to work
- ✅ If no shifts seeded that far, shows empty state
- ✅ No performance degradation
- ✅ Can navigate back to current month easily

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VE-005: Sign Up with Expired Session
**Priority**: P1 (High)  
**Test Type**: Security

**Test Steps**:
1. Log in, then manually clear session storage
2. Attempt to sign up for shift

**Expected Results**:
- ✅ Request fails with 401 Unauthorized
- ✅ User redirected to login page
- ✅ Message: "Your session has expired. Please log in again."
- ✅ After re-login, can complete sign-up

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VE-006: Rapidly Click Sign Up Button
**Priority**: P2 (Medium)  
**Test Type**: UI Protection

**Test Steps**:
1. Click "Sign Up" button multiple times rapidly
2. Observe behavior

**Expected Results**:
- ✅ Button disabled after first click
- ✅ Only one API request sent
- ✅ No duplicate assignments created
- ✅ Loading state prevents multiple submissions

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VE-007: Sign Up While Admin Deletes Shift
**Priority**: P3 (Low)  
**Test Type**: Edge Case

**Scenario**:
- Volunteer viewing shift detail
- Admin deletes shift before volunteer clicks sign-up

**Expected Results**:
- ✅ Sign-up fails gracefully
- ✅ Error: "This shift is no longer available"
- ✅ Volunteer redirected or shown updated calendar
- ✅ No orphaned assignment in database

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-VE-008: Timezone Handling (if multi-timezone)
**Priority**: P2 (Medium)  
**Test Type**: Data Integrity

**Test Steps**:
1. Verify all times stored in database use consistent timezone
2. Check shift times display correctly for local timezone

**Expected Results**:
- ✅ All timestamps in UTC in database
- ✅ Times converted to local timezone for display
- ✅ Shift cutoff logic (9am, 12pm, 3pm, 5pm) works correctly regardless of user timezone
- ✅ No ambiguous time displays

**Database Verification**:
\`\`\`sql
-- Verify timestamp column types
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'shifts' 
  AND column_name IN ('created_at', 'start_time', 'end_time');

-- Expected: timestamp with time zone or proper time type
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## TEST SUITE TS-AR: ADMIN ROLE VERIFICATION

### Purpose
Verify admin can oversee volunteer activities and maintain system health.

---

### TC-AR-001: Admin Login
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Test Steps**:
1. Navigate to `/auth/login`
2. Enter admin credentials:
   - Email: volunteer@vanderpumpdogs.org
   - Password: VolunteerAdmin2026
3. Click "Sign In"

**Expected Results**:
- ✅ Authentication succeeds
- ✅ Admin role recognized from database
- ✅ Header shows "Admin" navigation link
- ✅ Can access admin-only routes (/admin)

**Database Verification**:
\`\`\`sql
-- Verify admin user exists with correct role
SELECT id, email, name, role, active
FROM profiles
WHERE email = 'volunteer@vanderpumpdogs.org';

-- Expected:
-- role: admin
-- active: true
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-AR-002: Admin View All Volunteers
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Preconditions**:
- Logged in as admin

**Test Steps**:
1. Navigate to `/admin/volunteers`
2. View volunteer directory

**Expected Results**:
- ✅ List of all volunteers displayed
- ✅ Shows: Name, Email, Phone, Role, Status, Join Date
- ✅ Search/filter functionality works
- ✅ Can click volunteer to view profile
- ✅ Active/Inactive filter shows correct counts

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-AR-003: Admin View Individual Volunteer's Shifts
**Priority**: P1 (High)  
**Test Type**: Integration

**Test Steps**:
1. From volunteer directory, click on test volunteer
2. View their profile and shift history

**Expected Results**:
- ✅ All upcoming shifts shown
- ✅ Historical shift data available
- ✅ Total hours/shifts calculated
- ✅ Admin can see contact info
- ✅ Admin has edit permissions

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-AR-004: Admin Assign Volunteer to Shift
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Test Steps**:
1. Navigate to `/admin/shifts`
2. Select a date with available shifts
3. Click "Add Volunteer" for a shift
4. Search and select volunteer from DirectoryPicker
5. Confirm assignment

**Expected Results**:
- ✅ Volunteer added to shift
- ✅ Assignment created in database
- ✅ Capacity updates correctly
- ✅ Success toast shown
- ✅ Volunteer can see shift in their "My Schedule"

**Database Verification**:
\`\`\`sql
-- Verify admin-created assignment
SELECT sa.*, p.name, s.shift_date, s.slot
FROM shift_assignments sa
JOIN profiles p ON sa.user_id = p.id
JOIN shifts s ON sa.shift_id = s.id
WHERE sa.created_at > NOW() - INTERVAL '1 minute'
ORDER BY sa.created_at DESC
LIMIT 1;

-- Verify this is the assignment just created by admin
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-AR-005: Admin Remove Volunteer from Shift
**Priority**: P0 (Critical)  
**Test Type**: Integration

**Test Steps**:
1. From admin shift management page
2. Find assigned volunteer
3. Click remove/trash icon
4. Confirm removal

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Assignment deleted from database
- ✅ Capacity decrements
- ✅ Volunteer notified (if notification system exists)
- ✅ Removed shift no longer in volunteer's schedule

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## TEST SUITE TS-RG: RESPONSIVE DESIGN

### Purpose
Ensure volunteer workflow accessible on all device sizes.

---

### TC-RG-001: Mobile Phone (375px width)
**Priority**: P0 (Critical)  
**Test Type**: UI/Responsive

**Test Steps**:
1. Resize browser to 375px width (iPhone SE size)
2. Test complete volunteer workflow:
   - Sign up
   - Login
   - View calendar
   - Sign up for shift
   - View my schedule

**Expected Results**:
- ✅ All features accessible
- ✅ No horizontal scroll
- ✅ Touch targets minimum 44px
- ✅ Forms stack vertically
- ✅ Calendar grid adapts to small screen
- ✅ Readable font sizes (minimum 16px for inputs)

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-RG-002: Tablet (768px width)
**Priority**: P1 (High)  
**Test Type**: UI/Responsive

**Test Steps**:
1. Resize to tablet dimensions
2. Test calendar navigation and shift booking

**Expected Results**:
- ✅ Calendar grid shows more days
- ✅ 2-column layouts where appropriate
- ✅ Shift detail panel side-by-side with calendar (on larger tablets)
- ✅ Smooth touch interactions

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-RG-003: Laptop (1440px width)
**Priority**: P1 (High)  
**Test Type**: UI/Responsive

**Test Steps**:
1. View on standard laptop screen
2. Verify optimal layout

**Expected Results**:
- ✅ Calendar and detail panel side-by-side
- ✅ Content centered with appropriate max-width
- ✅ Readable line lengths
- ✅ Professional appearance

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-RG-004: Desktop (1920px+ width)
**Priority**: P2 (Medium)  
**Test Type**: UI/Responsive

**Test Steps**:
1. View on large desktop monitor
2. Check layout scaling

**Expected Results**:
- ✅ Content doesn't stretch awkwardly
- ✅ Appropriate use of whitespace
- ✅ Elements remain centered
- ✅ Font sizes scale appropriately

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## TEST SUITE TS-SEC: SECURITY & PERMISSIONS

### Purpose
Validate security boundaries and prevent unauthorized access.

---

### TC-SEC-001: Unauthenticated User Cannot Access Protected Routes
**Priority**: P0 (Critical)  
**Test Type**: Security

**Test Steps**:
1. Log out (or use incognito mode)
2. Attempt to access:
   - `/calendar`
   - `/my-schedule`
   - `/admin`

**Expected Results**:
- ✅ All protected routes redirect to `/auth/login`
- ✅ After login, redirect to originally requested page
- ✅ No sensitive data visible before authentication

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-SEC-002: Volunteer Cannot Access Admin Routes
**Priority**: P0 (Critical)  
**Test Type**: Security

**Test Steps**:
1. Log in as regular volunteer (not admin)
2. Attempt to navigate to `/admin`
3. Attempt to navigate to `/admin/volunteers`
4. Attempt to navigate to `/admin/shifts`

**Expected Results**:
- ✅ Access denied
- ✅ "Access Denied" message or redirect to appropriate page
- ✅ No admin functionality visible
- ✅ No admin API endpoints accessible

**Database RLS Test**:
\`\`\`sql
-- As volunteer user, attempt admin query
-- This should be restricted by RLS
SET ROLE volunteer_user;

SELECT * FROM profiles WHERE role = 'admin';

-- Expected: Empty result or access denied
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-SEC-003: Volunteer Cannot View Other Users' Personal Data
**Priority**: P0 (Critical)  
**Test Type**: Security/RLS

**Test Steps**:
1. Log in as Volunteer A
2. Attempt to view Volunteer B's profile
3. Attempt to access Volunteer B's schedule

**Expected Results**:
- ✅ Cannot access other users' personal information
- ✅ Cannot see other volunteers' shift assignments
- ✅ Database RLS policies enforce isolation
- ✅ API endpoints check user ownership

**Database RLS Verification**:
\`\`\`sql
-- Verify RLS policy exists for profiles
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname LIKE '%update%';

-- Expected: Policy that restricts UPDATE to own profile only
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-SEC-004: SQL Injection Protection
**Priority**: P0 (Critical)  
**Test Type**: Security

**Test Steps**:
1. Attempt SQL injection in search field:
   - `'; DROP TABLE profiles; --`
   - `1' OR '1'='1`
2. Attempt in email field during signup
3. Attempt in phone field

**Expected Results**:
- ✅ All inputs sanitized via parameterized queries
- ✅ Supabase client prevents SQL injection
- ✅ No database manipulation possible
- ✅ Invalid inputs handled gracefully

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-SEC-005: XSS Protection
**Priority**: P0 (Critical)  
**Test Type**: Security

**Test Steps**:
1. Attempt to enter script tags in name field:
   - `<script>alert('XSS')</script>`
   - `<img src=x onerror=alert('XSS')>`
2. Save and view profile

**Expected Results**:
- ✅ React escapes all user input automatically
- ✅ No script execution
- ✅ Text displayed as plain string, not executed
- ✅ HTML entities encoded

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-SEC-006: CSRF Protection
**Priority**: P1 (High)  
**Test Type**: Security

**Test Steps**:
1. Verify Supabase session tokens used
2. Check API requests include authentication headers
3. Attempt request without proper authentication

**Expected Results**:
- ✅ All state-changing requests authenticated
- ✅ Supabase JWT tokens validated
- ✅ Cannot perform actions without valid session
- ✅ Tokens expire appropriately

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## TEST SUITE TS-PERF: PERFORMANCE & LOAD

### Purpose
Ensure application performs well under normal and stress conditions.

---

### TC-PERF-001: Calendar Load Time
**Priority**: P1 (High)  
**Test Type**: Performance

**Test Steps**:
1. Clear browser cache
2. Navigate to `/calendar`
3. Measure time to interactive

**Expected Results**:
- ✅ Initial page load < 2 seconds
- ✅ Calendar data loaded < 1 second
- ✅ Smooth rendering, no jank
- ✅ Loading indicators shown during fetch

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-PERF-002: Large Shift Dataset Rendering
**Priority**: P2 (Medium)  
**Test Type**: Performance

**Test Steps**:
1. Navigate calendar to month with maximum shifts
2. Measure rendering performance

**Expected Results**:
- ✅ Calendar renders smoothly even with 90+ shifts in month
- ✅ No lag when clicking between days
- ✅ Virtualization or pagination used if needed
- ✅ Database query optimized with proper indexes

**Database Query Optimization**:
\`\`\`sql
-- Verify index exists on shift_date
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'shifts'
  AND indexdef LIKE '%shift_date%';

-- Expected: Index on shift_date column
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-PERF-003: Concurrent User Load
**Priority**: P2 (Medium)  
**Test Type**: Load

**Test Steps**:
1. Simulate 50+ volunteers accessing calendar simultaneously
2. Monitor database connection pool
3. Observe response times

**Expected Results**:
- ✅ All users receive timely responses
- ✅ No database connection exhaustion
- ✅ Supabase connection pooling handles load
- ✅ No significant degradation in response time

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### TC-PERF-004: Database Query Efficiency
**Priority**: P1 (High)  
**Test Type**: Performance

**Test Steps**:
1. Enable query logging
2. Perform typical volunteer workflow
3. Analyze query patterns

**Expected Results**:
- ✅ No N+1 query problems
- ✅ Proper use of JOINs instead of multiple queries
- ✅ Indexes used for common queries
- ✅ Query execution time < 100ms for most queries

**Sample Optimized Query**:
\`\`\`sql
-- Good: Single query with JOIN
SELECT 
  s.*,
  COUNT(sa.id) as assignments_count
FROM shifts s
LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
WHERE s.shift_date BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY s.id;

-- Bad: Multiple round-trips
-- SELECT * FROM shifts; (then loop)
-- SELECT COUNT(*) FROM shift_assignments WHERE shift_id = ?; (for each shift)
\`\`\`

**Actual Results**: _To be filled_

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## REGRESSION TESTING PROCEDURES

### When to Run Regression Tests

Run the **full test suite** in these scenarios:

1. **After Every Feature Implementation**
   - Before marking feature as "done"
   - Verify no existing functionality broken
   - Update test status in execution report

2. **Before Production Deployment**
   - Complete pass required for go-live
   - Document all test results
   - Sign-off from product owner

3. **After Bug Fixes**
   - Re-test failed case
   - Run related test cases
   - Verify fix doesn't introduce new issues

4. **Weekly Scheduled Regression** (recommended)
   - Run automated subset of critical tests
   - Catch any environmental drift
   - Maintain test suite health

---

### Regression Test Execution Process

#### Step 1: Preparation (30 minutes)

\`\`\`bash
# 1. Verify test environment
- [ ] Live Supabase connection verified
- [ ] Admin user login confirmed
- [ ] Test volunteer accounts available
- [ ] Shifts seeded for next 90 days
- [ ] Browser cache cleared
- [ ] Test report template copied

# 2. Document environment
- Test Date: ___________
- Tester Name: ___________
- Build Version: ___________
- Browser: ___________
- Database State: ___________
\`\`\`

#### Step 2: Execute Test Suites (2-3 hours)

Execute in priority order:

1. **Critical (P0) Tests First** - 45 minutes
   - Authentication
   - Shift sign-up
   - Admin verification
   - Security tests

2. **High Priority (P1) Tests** - 45 minutes
   - Calendar navigation
   - Shift management
   - Data validation

3. **Medium Priority (P2) Tests** - 30 minutes
   - Responsive design
   - Edge cases
   - Performance tests

4. **Low Priority (P3) Tests** - 15 minutes
   - Nice-to-have features
   - Future enhancements

#### Step 3: Document Results (30 minutes)

For each test case:
\`\`\`markdown
### TC-XXX-000: Test Name
**Actual Result**: <detailed description>
**Pass/Fail**: ☑ PASS / ☐ FAIL
**Execution Time**: X minutes
**Notes**: <any observations>
**Screenshots**: <if applicable>
\`\`\`

#### Step 4: Analyze Failures (as needed)

For each failed test:
\`\`\`markdown
### Failure Analysis: TC-XXX-000

**Root Cause**: <technical explanation>

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Expected vs Actual

**Priority**: P0 / P1 / P2 / P3

**Assigned To**: <developer>

**Estimated Fix Time**: <hours/days>

**Proposed Solution**: <brief description>
\`\`\`

#### Step 5: Generate Test Report (15 minutes)

\`\`\`markdown
## Regression Test Summary Report
**Date**: YYYY-MM-DD
**Tester**: Name
**Build**: Version X.X

### Overall Statistics
- Total Tests: 58
- Executed: XX
- Passed: XX (XX%)
- Failed: XX (XX%)
- Blocked: XX
- Skipped: XX

### Pass Rate by Suite
- TS-VR (Registration): XX/8 (XX%)
- TS-VA (Authentication): XX/6 (XX%)
- TS-VC (Calendar): XX/7 (XX%)
- TS-VS (Shift Management): XX/10 (XX%)
- TS-VE (Edge Cases): XX/8 (XX%)
- TS-AR (Admin): XX/5 (XX%)
- TS-RG (Responsive): XX/4 (XX%)
- TS-SEC (Security): XX/6 (XX%)
- TS-PERF (Performance): XX/4 (XX%)

### Critical Failures (P0)
1. TC-XXX: Description
2. TC-YYY: Description

### Blockers
1. Issue description

### Recommendations
1. Action item 1
2. Action item 2

### Production Readiness: READY / NOT READY
\`\`\`

---

### Automated Regression Testing (Future)

#### Test Automation Candidates

**High Automation Value** (70% of tests):
- Authentication flows (TS-VA)
- Sign-up/cancel workflows (TS-VS)
- Database validation queries
- API endpoint tests
- Security boundary tests

**Manual Testing Required** (30% of tests):
- Visual design verification
- Responsive layout on real devices
- UX flow validation
- Accessibility testing
- Complex user journeys

#### Automation Tools Recommendation

\`\`\`javascript
// Example: Playwright test for shift sign-up
import { test, expect } from '@playwright/test';

test('volunteer can sign up for shift', async ({ page }) => {
  // Login
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:text("Sign In")');
  
  // Navigate to calendar
  await expect(page).toHaveURL('/calendar');
  
  // Select date with available shift
  await page.click('[data-date="2025-01-15"]');
  
  // Sign up for morning shift
  await page.click('button:text("Sign Up"):has-text("Morning")');
  
  // Verify success
  await expect(page.locator('text=Successfully signed up')).toBeVisible();
  
  // Verify in database
  // (Add Supabase query check)
});
\`\`\`

---

## TEST EXECUTION REPORTS

### Report Template

Create a new dated report for each test execution:

**Filename**: `TEST_EXECUTION_REPORT_YYYY-MM-DD.md`

\`\`\`markdown
# Test Execution Report
**Date**: January 15, 2025
**Tester**: John Doe
**Build Version**: v1.2.0
**Environment**: Production-Ready Test Environment

## Executive Summary
Brief overview of test execution and overall status.

## Test Results by Suite
[Detailed results for each test suite]

## Failed Tests
[List of all failures with analysis]

## Blockers
[Any issues preventing test execution]

## Sign-Off
- Tester: _______________
- Date: _______________
- Status: APPROVED / REJECTED / CONDITIONAL
\`\`\`

---

## APPENDIX

### A. Database Schema Reference

\`\`\`sql
-- profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'volunteer',
  active BOOLEAN DEFAULT true,
  email_opt_in BOOLEAN DEFAULT false,
  email_categories JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shifts table
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_date DATE NOT NULL,
  slot TEXT NOT NULL, -- 'AM', 'MID', 'PM'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_date, slot)
);

-- shift_assignments table
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id, user_id)
);

-- auth_blocklist table
CREATE TABLE auth_blocklist (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### B. Test Data Scripts

Located in `/scripts/`:
- `012_production_admin_setup.sql` - Production shift seeding
- Test volunteer creation scripts (see Test Environment Setup)

### C. Contact & Support

**Test Coordinator**: [Name]  
**Development Team**: [Contact]  
**Supabase Support**: [If issues with database]  
**Bug Tracking**: [Issue tracker URL]

---

**Document Version**: 2.0  
**Last Updated**: January 2025  
**Next Review**: After calendar implementation complete  
**Maintained By**: QA Team

---

## QUICK REFERENCE: TEST EXECUTION CHECKLIST

\`\`\`
☐ Environment verified (live Supabase connection)
☐ Admin login confirmed (volunteer@vanderpumpdogs.org)
☐ Test volunteer accounts created
☐ Shifts seeded (90 days, production times)
☐ Browser cache cleared
☐ Test report template ready

☐ TS-VR: Volunteer Registration (8 tests)
☐ TS-VA: Volunteer Authentication (6 tests)
☐ TS-VC: Calendar & Shift Discovery (7 tests)
☐ TS-VS: Shift Sign-Up & Management (10 tests)
☐ TS-VE: Edge Cases & Validation (8 tests)
☐ TS-AR: Admin Role Verification (5 tests)
☐ TS-RG: Responsive Design (4 tests)
☐ TS-SEC: Security & Permissions (6 tests)
☐ TS-PERF: Performance & Load (4 tests)

☐ Test report completed
☐ Failures analyzed
☐ Recommendations documented
☐ Production readiness assessed
☐ Sign-off obtained
\`\`\`

---

*This test plan is a living document. Update after each major feature implementation or when test cases need refinement based on real-world usage.*
