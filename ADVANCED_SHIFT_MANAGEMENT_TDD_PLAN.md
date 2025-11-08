# Feature #5: Advanced Shift Management - Test-Driven Development Plan

**Feature**: Advanced Shift Management  
**Version**: v1.1  
**Test Coverage**: 40 test cases across 10 test suites  
**Database Integration**: Live Supabase with RLS policies

---

## Feature Overview

Enhance shift management with advanced features:
1. **Recurring Shift Templates** - Save and apply shift patterns weekly/monthly
2. **Waitlist System** - Allow volunteers to join waitlist when shifts are full
3. **Shift Swapping** - Enable volunteers to swap shifts with approval
4. **Emergency Coverage** - Request immediate coverage for unfilled shifts

---

## Database Schema Requirements

\`\`\`sql
-- New tables needed:

shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slot TEXT CHECK (slot IN ('AM', 'MID', 'PM')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER DEFAULT 5,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('weekly', 'monthly', 'custom')),
  days_of_week INTEGER[], -- [0-6] for Sunday-Saturday
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

shift_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  UNIQUE(shift_id, user_id)
);

shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE CASCADE,
  requesting_user_id UUID REFERENCES profiles(id),
  target_user_id UUID REFERENCES profiles(id),
  shift_id UUID REFERENCES shifts(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  admin_approved BOOLEAN DEFAULT false,
  admin_approved_by UUID REFERENCES profiles(id),
  admin_approved_at TIMESTAMPTZ
);

emergency_coverage_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id),
  reason TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled')),
  filled_by UUID REFERENCES profiles(id),
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
\`\`\`

---

## Test Suite 1: Recurring Shift Templates

### Test Case 1.1: Create Shift Template

**Test ID**: RST-1.1  
**Priority**: High  
**Prerequisites**: Admin logged in

**Steps:**
1. Navigate to /admin/shift-templates
2. Click "Create Template"
3. Enter name: "Weekend Morning Shift"
4. Select slot: "AM"
5. Set time: 09:00 - 12:00
6. Set capacity: 5
7. Select recurrence: "Weekly"
8. Select days: Saturday, Sunday
9. Save template

**Expected Results:**
- Template created successfully
- Shows in templates list
- All fields saved correctly

**Database Verification:**
\`\`\`sql
-- Check template created
SELECT * FROM shift_templates
WHERE name = 'Weekend Morning Shift';

-- Verify recurrence pattern
SELECT name, recurrence_pattern, days_of_week, active
FROM shift_templates
WHERE name = 'Weekend Morning Shift';
\`\`\`

**Pass Criteria:**
- ✅ Template exists in database
- ✅ Days of week: [0, 6] (Sunday, Saturday)
- ✅ Active = true

---

### Test Case 1.2: Apply Template to Generate Shifts

**Test ID**: RST-1.2  
**Priority**: High  
**Prerequisites**: Template exists from Test 1.1

**Steps:**
1. Navigate to /admin/shift-templates
2. Select "Weekend Morning Shift" template
3. Click "Apply Template"
4. Select date range: Next 4 weeks
5. Preview generated shifts
6. Confirm application

**Expected Results:**
- 8 shifts generated (2 per week × 4 weeks)
- All shifts have correct time and capacity
- No duplicate shifts created

**Database Verification:**
\`\`\`sql
-- Check shifts generated
SELECT shift_date, slot, start_time, end_time, capacity
FROM shifts
WHERE shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '28 days'
  AND slot = 'AM'
  AND start_time = '09:00'
ORDER BY shift_date;

-- Count should be 8
SELECT COUNT(*) FROM shifts
WHERE shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '28 days'
  AND slot = 'AM'
  AND start_time = '09:00';
\`\`\`

**Pass Criteria:**
- ✅ Exactly 8 shifts created
- ✅ All on weekends (Saturday/Sunday)
- ✅ All have capacity = 5

---

### Test Case 1.3: Edit and Deactivate Template

**Test ID**: RST-1.3  
**Priority**: Medium

**Steps:**
1. Navigate to /admin/shift-templates
2. Edit "Weekend Morning Shift"
3. Change capacity to 6
4. Update days to only Sunday
5. Deactivate template
6. Save changes

**Expected Results:**
- Template updated successfully
- Future applications use new settings
- Template marked inactive

**Database Verification:**
\`\`\`sql
SELECT name, capacity, days_of_week, active
FROM shift_templates
WHERE name = 'Weekend Morning Shift';
\`\`\`

**Pass Criteria:**
- ✅ capacity = 6
- ✅ days_of_week = [0]
- ✅ active = false

---

## Test Suite 2: Shift Waitlist System

### Test Case 2.1: Join Waitlist for Full Shift

**Test ID**: SWL-2.1  
**Priority**: High  
**Prerequisites**: Volunteer logged in, full shift exists

**Steps:**
1. Navigate to /calendar
2. Select a date with a full shift
3. Click on full shift
4. Click "Join Waitlist"
5. Confirm waitlist signup

**Expected Results:**
- Added to waitlist successfully
- Position number displayed
- Notification preferences confirmed

**Database Verification:**
\`\`\`sql
-- Check waitlist entry
SELECT * FROM shift_waitlist
WHERE user_id = '[test_user_id]'
  AND shift_id = '[test_shift_id]';

-- Verify position
SELECT position, status
FROM shift_waitlist
WHERE shift_id = '[test_shift_id]'
ORDER BY position;
\`\`\`

**Pass Criteria:**
- ✅ Waitlist entry exists
- ✅ Position assigned correctly
- ✅ Status = 'waiting'

---

### Test Case 2.2: Automatic Waitlist Notification

**Test ID**: SWL-2.2  
**Priority**: High  
**Prerequisites**: User on waitlist, spot opens

**Steps:**
1. Admin removes a volunteer from full shift
2. System checks waitlist
3. Notification sent to first person on waitlist
4. User receives email/push notification

**Expected Results:**
- First waitlist user notified
- Notification logged
- Status updated to 'notified'

**Database Verification:**
\`\`\`sql
-- Check notification sent
SELECT w.position, w.status, w.notified_at, n.notification_type
FROM shift_waitlist w
LEFT JOIN notification_queue n ON n.user_id = w.user_id
  AND n.shift_id = w.shift_id
WHERE w.shift_id = '[test_shift_id]'
  AND w.position = 1;
\`\`\`

**Pass Criteria:**
- ✅ Status = 'notified'
- ✅ notified_at is set
- ✅ Notification queued

---

### Test Case 2.3: Convert Waitlist to Assignment

**Test ID**: SWL-2.3  
**Priority**: High

**Steps:**
1. User receives waitlist notification
2. User clicks "Accept Spot"
3. System converts waitlist entry to assignment
4. Remaining waitlist positions updated

**Expected Results:**
- Assignment created
- Waitlist entry status = 'converted'
- Other waitlist positions decremented

**Database Verification:**
\`\`\`sql
-- Check assignment created
SELECT * FROM shift_assignments
WHERE user_id = '[test_user_id]'
  AND shift_id = '[test_shift_id]';

-- Check waitlist status
SELECT status FROM shift_waitlist
WHERE user_id = '[test_user_id]'
  AND shift_id = '[test_shift_id]';

-- Verify positions updated
SELECT user_id, position
FROM shift_waitlist
WHERE shift_id = '[test_shift_id]'
  AND status = 'waiting'
ORDER BY position;
\`\`\`

**Pass Criteria:**
- ✅ Assignment exists
- ✅ Waitlist status = 'converted'
- ✅ Positions renumbered correctly

---

### Test Case 2.4: Leave Waitlist

**Test ID**: SWL-2.4  
**Priority**: Medium

**Steps:**
1. User on waitlist
2. Navigate to My Schedule
3. View waitlist entries
4. Click "Leave Waitlist"
5. Confirm removal

**Expected Results:**
- Removed from waitlist
- Remaining positions updated
- Next person notified if applicable

**Database Verification:**
\`\`\`sql
-- Check waitlist entry removed
SELECT * FROM shift_waitlist
WHERE user_id = '[test_user_id]'
  AND shift_id = '[test_shift_id]';

-- Verify positions updated
SELECT position FROM shift_waitlist
WHERE shift_id = '[test_shift_id]'
ORDER BY position;
\`\`\`

**Pass Criteria:**
- ✅ Waitlist entry deleted or status updated
- ✅ Positions are sequential

---

## Test Suite 3: Shift Swapping

### Test Case 3.1: Request Shift Swap

**Test ID**: SSW-3.1  
**Priority**: High  
**Prerequisites**: Volunteer has assigned shift

**Steps:**
1. Navigate to /my-schedule
2. Select assigned shift
3. Click "Request Swap"
4. Select target volunteer or open to all
5. Enter swap message
6. Submit request

**Expected Results:**
- Swap request created
- Target volunteer notified
- Admin notified if required

**Database Verification:**
\`\`\`sql
-- Check swap request created
SELECT * FROM shift_swap_requests
WHERE original_assignment_id = '[assignment_id]';

-- Verify notification sent
SELECT * FROM notification_queue
WHERE user_id = '[target_user_id]'
  AND notification_type = 'shift_swap_request';
\`\`\`

**Pass Criteria:**
- ✅ Swap request status = 'pending'
- ✅ Notification queued
- ✅ All fields populated

---

### Test Case 3.2: Accept Shift Swap

**Test ID**: SSW-3.2  
**Priority**: High

**Steps:**
1. Target volunteer receives swap notification
2. Navigate to notification or My Schedule
3. View swap request details
4. Click "Accept Swap"
5. Confirm acceptance

**Expected Results:**
- Swap request status = 'accepted'
- Admin approval required (if policy enabled)
- Both volunteers notified

**Database Verification:**
\`\`\`sql
-- Check swap status
SELECT status, responded_at, admin_approved
FROM shift_swap_requests
WHERE id = '[swap_request_id]';
\`\`\`

**Pass Criteria:**
- ✅ status = 'accepted'
- ✅ responded_at is set
- ✅ admin_approved = null (pending)

---

### Test Case 3.3: Admin Approve Swap

**Test ID**: SSW-3.3  
**Priority**: High

**Steps:**
1. Admin navigates to /admin/swap-requests
2. View pending swap request
3. Review both volunteers' schedules
4. Approve swap
5. System executes swap

**Expected Results:**
- Assignments swapped
- Swap request marked approved
- Both volunteers notified
- Audit trail created

**Database Verification:**
\`\`\`sql
-- Check swap approved
SELECT admin_approved, admin_approved_by, admin_approved_at
FROM shift_swap_requests
WHERE id = '[swap_request_id]';

-- Verify assignments swapped
SELECT sa.user_id, s.shift_date, s.slot
FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
WHERE sa.user_id IN ('[user1_id]', '[user2_id]')
  AND s.shift_date = '[swap_date]';
\`\`\`

**Pass Criteria:**
- ✅ admin_approved = true
- ✅ Assignments correctly swapped
- ✅ Notifications sent

---

### Test Case 3.4: Decline Swap Request

**Test ID**: SSW-3.4  
**Priority**: Medium

**Steps:**
1. Target volunteer receives swap request
2. View swap details
3. Click "Decline"
4. Optionally enter reason
5. Confirm decline

**Expected Results:**
- Swap status = 'declined'
- Requesting volunteer notified
- Original assignments unchanged

**Database Verification:**
\`\`\`sql
SELECT status, responded_at
FROM shift_swap_requests
WHERE id = '[swap_request_id]';
\`\`\`

**Pass Criteria:**
- ✅ status = 'declined'
- ✅ responded_at is set

---

### Test Case 3.5: Cancel Swap Request

**Test ID**: SSW-3.5  
**Priority**: Medium

**Steps:**
1. Requesting volunteer views their swap requests
2. Select pending request
3. Click "Cancel Request"
4. Confirm cancellation

**Expected Results:**
- Swap status = 'cancelled'
- Target volunteer notified of cancellation

**Database Verification:**
\`\`\`sql
SELECT status FROM shift_swap_requests
WHERE id = '[swap_request_id]';
\`\`\`

**Pass Criteria:**
- ✅ status = 'cancelled'

---

## Test Suite 4: Emergency Coverage Requests

### Test Case 4.1: Create Emergency Coverage Request

**Test ID**: ECR-4.1  
**Priority**: Critical  
**Prerequisites**: Admin logged in, shift needs coverage

**Steps:**
1. Navigate to /admin/shifts
2. Identify shift needing coverage
3. Click "Request Emergency Coverage"
4. Select urgency level: "High"
5. Enter reason: "Volunteer called in sick"
6. Set expiration: 24 hours
7. Submit request

**Expected Results:**
- Coverage request created
- All eligible volunteers notified
- Request shows in dashboard

**Database Verification:**
\`\`\`sql
-- Check coverage request
SELECT * FROM emergency_coverage_requests
WHERE shift_id = '[shift_id]';

-- Verify notifications sent
SELECT COUNT(*) FROM notification_queue
WHERE notification_type = 'emergency_coverage'
  AND shift_id = '[shift_id]';
\`\`\`

**Pass Criteria:**
- ✅ Request status = 'open'
- ✅ urgency = 'high'
- ✅ Notifications sent to all eligible volunteers

---

### Test Case 4.2: Volunteer Claims Coverage

**Test ID**: ECR-4.2  
**Priority**: Critical

**Steps:**
1. Volunteer receives emergency coverage notification
2. Navigate to notification or calendar
3. View coverage request details
4. Click "I Can Help"
5. Confirm commitment

**Expected Results:**
- Assignment created
- Coverage request status = 'filled'
- All parties notified
- Other volunteers' notifications withdrawn

**Database Verification:**
\`\`\`sql
-- Check assignment created
SELECT * FROM shift_assignments
WHERE shift_id = '[shift_id]'
  AND user_id = '[volunteer_id]';

-- Check coverage status
SELECT status, filled_by, filled_at
FROM emergency_coverage_requests
WHERE id = '[request_id]';

-- Verify notifications updated
SELECT status FROM notification_queue
WHERE notification_type = 'emergency_coverage'
  AND shift_id = '[shift_id]';
\`\`\`

**Pass Criteria:**
- ✅ Assignment created
- ✅ Coverage status = 'filled'
- ✅ filled_by and filled_at set correctly

---

### Test Case 4.3: Cancel Coverage Request

**Test ID**: ECR-4.3  
**Priority**: Medium

**Steps:**
1. Admin navigates to coverage requests
2. Select open coverage request
3. Click "Cancel Request"
4. Enter reason
5. Confirm cancellation

**Expected Results:**
- Coverage status = 'cancelled'
- Volunteers notified of cancellation

**Database Verification:**
\`\`\`sql
SELECT status FROM emergency_coverage_requests
WHERE id = '[request_id]';
\`\`\`

**Pass Criteria:**
- ✅ status = 'cancelled'

---

### Test Case 4.4: Coverage Request Expiration

**Test ID**: ECR-4.4  
**Priority**: Medium

**Steps:**
1. Create coverage request with 1 hour expiration
2. Wait for expiration time
3. System automatically updates status
4. Admin notified of unfilled request

**Expected Results:**
- Status updated to 'expired' (or remains 'open')
- Admin receives notification
- Request marked as overdue in dashboard

**Database Verification:**
\`\`\`sql
-- Check expired requests
SELECT id, status, expires_at
FROM emergency_coverage_requests
WHERE expires_at < NOW()
  AND status = 'open';
\`\`\`

**Pass Criteria:**
- ✅ Expired requests identified
- ✅ Admin notified

---

## Test Suite 5: Template-Based Scheduling

### Test Case 5.1: Generate Monthly Schedule from Templates

**Test ID**: TBS-5.1  
**Priority**: High

**Steps:**
1. Admin creates multiple templates (AM, MID, PM)
2. Navigate to /admin/schedule-generator
3. Select month: Next month
4. Select templates to apply
5. Preview generated schedule
6. Confirm generation

**Expected Results:**
- All days populated with shifts
- Templates applied correctly
- No duplicate shifts
- Capacity set per template

**Database Verification:**
\`\`\`sql
-- Check shifts generated
SELECT shift_date, slot, COUNT(*) as shift_count
FROM shifts
WHERE shift_date BETWEEN '[first_of_month]' AND '[last_of_month]'
GROUP BY shift_date, slot
ORDER BY shift_date, slot;
\`\`\`

**Pass Criteria:**
- ✅ All days have shifts
- ✅ Correct slots per template
- ✅ No duplicates

---

### Test Case 5.2: Template Override for Holidays

**Test ID**: TBS-5.2  
**Priority**: Medium

**Steps:**
1. Generate schedule from templates
2. Mark specific date as holiday
3. Override with different capacity or no shifts
4. Save changes

**Expected Results:**
- Holiday dates use override settings
- Regular templates unaffected

**Database Verification:**
\`\`\`sql
SELECT shift_date, capacity
FROM shifts
WHERE shift_date = '[holiday_date]';
\`\`\`

**Pass Criteria:**
- ✅ Holiday capacity different from template

---

## Test Suite 6: Waitlist Edge Cases

### Test Case 6.1: Multiple Waitlist Notifications

**Test ID**: WEC-6.1  
**Priority**: Medium

**Steps:**
1. Shift with 3 people on waitlist
2. Admin increases capacity by 2
3. System notifies first 2 on waitlist

**Expected Results:**
- First 2 notified
- Third person remains waiting
- Positions updated correctly

**Database Verification:**
\`\`\`sql
SELECT user_id, position, status
FROM shift_waitlist
WHERE shift_id = '[shift_id]'
ORDER BY position;
\`\`\`

**Pass Criteria:**
- ✅ First 2 status = 'notified'
- ✅ Third status = 'waiting'

---

### Test Case 6.2: Waitlist Expiration

**Test ID**: WEC-6.2  
**Priority**: Medium

**Steps:**
1. User notified from waitlist
2. 48 hours pass without response
3. System expires notification
4. Next person notified

**Expected Results:**
- First user status = 'expired'
- Next user status = 'notified'

**Database Verification:**
\`\`\`sql
SELECT user_id, status, notified_at
FROM shift_waitlist
WHERE shift_id = '[shift_id]'
ORDER BY position;
\`\`\`

**Pass Criteria:**
- ✅ Expired entry handled
- ✅ Next person notified

---

## Test Suite 7: Swap Edge Cases

### Test Case 7.1: Conflicting Swap Requests

**Test ID**: SEC-7.1  
**Priority**: Medium

**Steps:**
1. Volunteer A requests swap with Volunteer B
2. Volunteer B simultaneously requests different swap
3. System detects conflict
4. Admin notified

**Expected Results:**
- Both requests visible
- Conflict flagged
- Admin resolves manually

**Database Verification:**
\`\`\`sql
-- Check for conflicting swaps
SELECT sr1.id, sr1.requesting_user_id, sr2.id, sr2.requesting_user_id
FROM shift_swap_requests sr1
JOIN shift_swap_requests sr2 ON sr1.target_user_id = sr2.requesting_user_id
WHERE sr1.status = 'pending' AND sr2.status = 'pending';
\`\`\`

**Pass Criteria:**
- ✅ Both requests exist
- ✅ Admin can view conflicts

---

### Test Case 7.2: Swap with Schedule Conflict

**Test ID**: SEC-7.2  
**Priority**: High

**Steps:**
1. Volunteer A requests swap for Shift X
2. Volunteer B (target) already has Shift Y at same time
3. System detects conflict
4. Swap prevented or warning shown

**Expected Results:**
- Conflict detected
- Swap blocked or requires override

**Database Verification:**
\`\`\`sql
-- Check for time conflicts
SELECT sa.user_id, s.shift_date, s.start_time, s.end_time
FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
WHERE sa.user_id = '[target_user_id]'
  AND s.shift_date = '[swap_date]'
  AND s.start_time < '[swap_end_time]'
  AND s.end_time > '[swap_start_time]';
\`\`\`

**Pass Criteria:**
- ✅ Conflict identified
- ✅ Swap handled appropriately

---

## Test Suite 8: Integration Tests

### Test Case 8.1: Waitlist to Coverage Request

**Test ID**: INT-8.1  
**Priority**: Medium

**Steps:**
1. Shift is full with waitlist
2. Assigned volunteer cancels last minute
3. System checks waitlist first
4. If waitlist empty, creates emergency coverage

**Expected Results:**
- Waitlist processed first
- Coverage only if no waitlist

**Database Verification:**
\`\`\`sql
-- Check waitlist processed
SELECT COUNT(*) FROM shift_waitlist
WHERE shift_id = '[shift_id]' AND status = 'notified';

-- Check coverage request
SELECT * FROM emergency_coverage_requests
WHERE shift_id = '[shift_id]' AND status = 'open';
\`\`\`

**Pass Criteria:**
- ✅ Correct priority logic

---

### Test Case 8.2: Template Generation with Existing Swaps

**Test ID**: INT-8.2  
**Priority**: Medium

**Steps:**
1. Generate schedule from template
2. Volunteers sign up
3. Some swaps pending
4. Regenerate or modify template
5. Ensure swaps preserved

**Expected Results:**
- Existing swaps maintained
- New template applied where no conflicts

**Pass Criteria:**
- ✅ No swap data lost

---

## Test Suite 9: Admin Dashboard Integration

### Test Case 9.1: Coverage Request Dashboard

**Test ID**: ADI-9.1  
**Priority**: High

**Steps:**
1. Admin navigates to dashboard
2. View "Emergency Coverage" section
3. See all open requests by urgency
4. Click to view details

**Expected Results:**
- All open requests visible
- Sorted by urgency
- Quick actions available

**Database Verification:**
\`\`\`sql
SELECT urgency, COUNT(*) as count
FROM emergency_coverage_requests
WHERE status = 'open'
GROUP BY urgency;
\`\`\`

**Pass Criteria:**
- ✅ Correct count displayed
- ✅ UI matches database

---

### Test Case 9.2: Swap Requests Dashboard

**Test ID**: ADI-9.2  
**Priority**: High

**Steps:**
1. Admin views pending swap requests
2. Filter by date range
3. Approve/deny in bulk
4. View swap history

**Expected Results:**
- All pending swaps listed
- Bulk actions work
- History accessible

**Database Verification:**
\`\`\`sql
SELECT status, COUNT(*) as count
FROM shift_swap_requests
WHERE status IN ('pending', 'accepted')
GROUP BY status;
\`\`\`

**Pass Criteria:**
- ✅ Dashboard accurate
- ✅ Actions functional

---

### Test Case 9.3: Waitlist Management Dashboard

**Test ID**: ADI-9.3  
**Priority**: Medium

**Steps:**
1. Admin views waitlist overview
2. See all shifts with waitlists
3. Manually process waitlist
4. View waitlist statistics

**Expected Results:**
- All waitlist data visible
- Admin can intervene
- Statistics accurate

**Database Verification:**
\`\`\`sql
SELECT s.shift_date, s.slot, COUNT(w.id) as waitlist_count
FROM shifts s
JOIN shift_waitlist w ON s.id = w.shift_id
WHERE w.status = 'waiting'
GROUP BY s.shift_date, s.slot
ORDER BY waitlist_count DESC;
\`\`\`

**Pass Criteria:**
- ✅ Counts match database

---

## Test Suite 10: Security & Permissions

### Test Case 10.1: Volunteer Cannot Access Admin Features

**Test ID**: SEC-10.1  
**Priority**: Critical

**Steps:**
1. Log in as volunteer (non-admin)
2. Attempt to access /admin/shift-templates
3. Attempt to access /admin/swap-requests
4. Attempt to create emergency coverage

**Expected Results:**
- All admin routes blocked
- Redirected to authorized page
- Error message shown

**Database Verification:**
\`\`\`sql
-- Verify user is not admin
SELECT role FROM profiles WHERE id = '[test_user_id]';
\`\`\`

**Pass Criteria:**
- ✅ Access denied
- ✅ No unauthorized actions possible

---

### Test Case 10.2: RLS Policies Enforce Permissions

**Test ID**: SEC-10.2  
**Priority**: Critical

**Steps:**
1. As volunteer, query shift_templates
2. Attempt to insert into emergency_coverage_requests
3. Try to update other user's swap_requests

**Expected Results:**
- Read-only access where appropriate
- Write operations blocked
- RLS prevents data leaks

**Database Verification:**
\`\`\`sql
-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('shift_templates', 'shift_waitlist', 'shift_swap_requests', 'emergency_coverage_requests');

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_templates', 'shift_waitlist', 'shift_swap_requests', 'emergency_coverage_requests');
\`\`\`

**Pass Criteria:**
- ✅ RLS enabled on all tables
- ✅ Policies correctly restrict access

---

## Regression Test Integration

After implementing Feature #5, run all previous test suites:
- ✅ Feature #1: Admin User Management (29 tests)
- ✅ Feature #2: Email Communication System (32 tests)
- ✅ Feature #3: Enhanced Reporting & Analytics (28 tests)
- ✅ Feature #4: User Experience Improvements (36 tests)
- ✅ Feature #5: Advanced Shift Management (40 tests)

**Total Regression Suite**: 165 tests

---

## Test Execution Checklist

- [ ] Database schema created
- [ ] RLS policies enabled
- [ ] Server actions implemented
- [ ] Admin UI created
- [ ] Volunteer UI updated
- [ ] Notification system integrated
- [ ] Test Suite 1: Templates (3 tests)
- [ ] Test Suite 2: Waitlist (4 tests)
- [ ] Test Suite 3: Swapping (5 tests)
- [ ] Test Suite 4: Emergency Coverage (4 tests)
- [ ] Test Suite 5: Template Scheduling (2 tests)
- [ ] Test Suite 6: Waitlist Edge Cases (2 tests)
- [ ] Test Suite 7: Swap Edge Cases (2 tests)
- [ ] Test Suite 8: Integration Tests (2 tests)
- [ ] Test Suite 9: Admin Dashboard (3 tests)
- [ ] Test Suite 10: Security (2 tests)
- [ ] All regression tests passing
- [ ] Production deployment approved

---

## Success Criteria

✅ **Feature Complete** when:
- All 40 test cases pass
- All edge cases handled
- Security verified
- Regression tests pass
- Performance acceptable
- Documentation complete

**Target**: 100% pass rate before production deployment
