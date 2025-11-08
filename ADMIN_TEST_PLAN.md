# Admin Workflow Comprehensive Test Plan

## Test Credentials
- **Admin Email**: volunteer@vanderpumpdogs.org
- **Password**: VolunteerAdmin2026

## Prerequisites Setup

### 1. Initial Database Setup
- [ ] Run `scripts/008_mock_data.sql` to generate 270+ shifts for testing
- [ ] Verify Supabase connection is active
- [ ] Ensure RLS policies are enabled

### 2. Create Test Admin Account
1. Navigate to `/auth/signup`
2. Create account with provided credentials
3. Manually update role in Supabase dashboard:
   \`\`\`sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'volunteer@vanderpumpdogs.org';
   \`\`\`

### 3. Create Test Volunteer Accounts
Create 5-8 volunteer accounts for comprehensive testing:
- volunteer1@test.com (Active volunteer)
- volunteer2@test.com (New volunteer)
- volunteer3@test.com (Occasional volunteer)
- volunteer4@test.com (Inactive volunteer)
- volunteer5@test.com (Heavy user - many shifts)

---

## Test Cases

## Category 1: Authentication & Access Control

### TC-001: Admin Login
**Priority**: Critical  
**Description**: Verify admin can log in with correct credentials

**Steps**:
1. Navigate to `/auth/login`
2. Enter: volunteer@vanderpumpdogs.org
3. Enter password: VolunteerAdmin2026
4. Click "Sign In"

**Expected Result**:
- Successful login
- Redirect to `/calendar`
- Header shows admin-specific navigation (Admin link visible)

**Status**: [ ] Pass [ ] Fail

---

### TC-002: Admin Access to Admin Page
**Priority**: Critical  
**Description**: Verify admin can access admin-only pages

**Steps**:
1. Login as admin
2. Click "Admin" link in header
3. Navigate to `/admin`

**Expected Result**:
- Admin page loads successfully
- Shows date picker
- Shows three shift cards (AM, MID, PM)
- Shows volunteer directory

**Status**: [ ] Pass [ ] Fail

---

### TC-003: Non-Admin Access Restriction
**Priority**: High  
**Description**: Verify regular volunteers cannot access admin features

**Steps**:
1. Login as regular volunteer
2. Check header navigation

**Expected Result**:
- "Admin" link NOT visible in header
- Direct navigation to `/admin` should show error or redirect

**Status**: [ ] Pass [ ] Fail

---

## Category 2: Volunteer Management

### TC-004: View All Volunteers
**Priority**: High  
**Description**: Admin can view complete volunteer directory

**Steps**:
1. Login as admin
2. Navigate to `/admin`
3. Observe DirectoryPicker in each shift card

**Expected Result**:
- All registered volunteers appear in directory
- Shows volunteer names and phone numbers
- List is searchable

**Status**: [ ] Pass [ ] Fail

---

### TC-005: Search Volunteers
**Priority**: Medium  
**Description**: Admin can search for specific volunteers

**Steps**:
1. Navigate to `/admin`
2. Click on DirectoryPicker search input
3. Type partial volunteer name (e.g., "vol")

**Expected Result**:
- Results filter in real-time
- Shows matching volunteers only
- Non-matching volunteers are hidden

**Status**: [ ] Pass [ ] Fail

---

### TC-006: View Volunteer Details
**Priority**: Medium  
**Description**: Admin can see volunteer contact information

**Steps**:
1. Navigate to `/admin`
2. Observe volunteer entries in DirectoryPicker

**Expected Result**:
- Each volunteer shows: Name, Phone number
- Information is properly formatted
- No missing or null data displays

**Status**: [ ] Pass [ ] Fail

---

## Category 3: Shift Assignment Management

### TC-007: Assign Volunteer to Empty Shift
**Priority**: Critical  
**Description**: Admin can assign volunteer to an available shift slot

**Steps**:
1. Login as admin
2. Navigate to `/admin`
3. Select a date with empty shifts
4. Click DirectoryPicker in AM shift
5. Click on a volunteer name

**Expected Result**:
- Volunteer is immediately assigned
- Volunteer name appears in shift card
- Capacity counter updates (e.g., 1/4)
- Success toast notification appears
- Database is updated

**Status**: [ ] Pass [ ] Fail

---

### TC-008: Assign Multiple Volunteers to Same Shift
**Priority**: High  
**Description**: Admin can assign multiple volunteers to same shift (up to capacity)

**Steps**:
1. Navigate to `/admin`
2. Select a shift with capacity > 1
3. Assign first volunteer
4. Assign second volunteer to same shift
5. Continue until capacity is reached

**Expected Result**:
- All volunteers are assigned successfully
- Names stack vertically in shift card
- Capacity counter updates correctly
- DirectoryPicker still accessible until full

**Status**: [ ] Pass [ ] Fail

---

### TC-009: Prevent Over-Assignment
**Priority**: Critical  
**Description**: Admin cannot assign more volunteers than shift capacity

**Steps**:
1. Navigate to `/admin`
2. Find shift with capacity 3
3. Assign 3 volunteers
4. Attempt to assign 4th volunteer

**Expected Result**:
- First 3 assignments succeed
- 4th assignment shows error message
- Error toast: "Shift is already full"
- Shift card shows "Full" indicator
- 4th volunteer NOT added to database

**Status**: [ ] Pass [ ] Fail

---

### TC-010: Remove Volunteer from Shift
**Priority**: High  
**Description**: Admin can remove assigned volunteer from shift

**Steps**:
1. Navigate to `/admin`
2. Find shift with assigned volunteer
3. Click "×" button next to volunteer name

**Expected Result**:
- Volunteer is removed from shift
- Name disappears from shift card
- Capacity counter decrements (e.g., 2/4 → 1/4)
- Success toast appears
- Database is updated

**Status**: [ ] Pass [ ] Fail

---

### TC-011: Assign Volunteer Across Multiple Shifts Same Day
**Priority**: Medium  
**Description**: Admin can assign same volunteer to multiple shifts on same day

**Steps**:
1. Navigate to `/admin`
2. Select a date
3. Assign same volunteer to AM shift
4. Assign same volunteer to MID shift
5. Assign same volunteer to PM shift

**Expected Result**:
- All three assignments succeed
- Volunteer appears in all three shift cards
- No conflict warning (current design allows this)
- All assignments persist in database

**Status**: [ ] Pass [ ] Fail

---

### TC-012: Bulk Assignment Workflow
**Priority**: Medium  
**Description**: Admin can efficiently assign multiple volunteers in sequence

**Steps**:
1. Navigate to `/admin`
2. Select a date with empty shifts
3. Rapidly assign 10 volunteers across different shifts
4. Verify all assignments

**Expected Result**:
- All assignments complete successfully
- No duplicate assignments
- Capacity counters accurate
- UI remains responsive
- No database conflicts

**Status**: [ ] Pass [ ] Fail

---

## Category 4: Calendar & Date Navigation

### TC-013: Navigate Between Dates
**Priority**: High  
**Description**: Admin can change dates to view different shifts

**Steps**:
1. Navigate to `/admin`
2. Current date is selected by default
3. Click date picker
4. Select different date (e.g., 5 days in future)

**Expected Result**:
- Shift cards reload with new date's shifts
- Any existing assignments for that date display
- Empty shifts show "No volunteers yet"
- Date picker shows selected date

**Status**: [ ] Pass [ ] Fail

---

### TC-014: View Past Shifts
**Priority**: Medium  
**Description**: Admin can view historical shift data

**Steps**:
1. Navigate to `/admin`
2. Select a past date (December 2024)
3. Observe shift cards

**Expected Result**:
- Past shifts are displayed
- Past assignments are visible
- Admin can still modify past shifts (if policy allows)
- Historical data is accurate

**Status**: [ ] Pass [ ] Fail

---

### TC-015: Navigate to Empty Date
**Priority**: Low  
**Description**: Admin selects date with no shifts created

**Steps**:
1. Navigate to `/admin`
2. Select a far future date (e.g., June 2025)

**Expected Result**:
- Shift cards show "No shift available" or similar
- No error occurs
- Admin can still interact with UI
- Option to create shifts (if feature exists)

**Status**: [ ] Pass [ ] Fail

---

## Category 5: Seed Month Feature

### TC-016: Seed Empty Month
**Priority**: High  
**Description**: Admin can seed an entire month with shifts

**Steps**:
1. Navigate to `/admin`
2. Navigate to a month with no shifts (e.g., April 2025)
3. Click "Seed This Month" button

**Expected Result**:
- All days in month get 3 shifts created (AM, MID, PM)
- Success message appears
- Calendar reloads with new shifts
- Shifts have default capacities
- Database contains 90+ new shift records

**Status**: [ ] Pass [ ] Fail

---

### TC-017: Seed Month with Existing Shifts
**Priority**: Medium  
**Description**: Verify behavior when seeding partially filled month

**Steps**:
1. Navigate to `/admin`
2. Navigate to month with some shifts already created
3. Click "Seed This Month"

**Expected Result**:
- Only missing shifts are created
- Existing shifts are NOT duplicated
- No data loss occurs
- Confirmation toast appears

**Status**: [ ] Pass [ ] Fail

---

## Category 6: Real-Time Data & Synchronization

### TC-018: Concurrent Admin Modifications
**Priority**: Medium  
**Description**: Test behavior when multiple admins modify same shift

**Steps**:
1. Open admin panel in two browser tabs (same admin)
2. In Tab 1: Assign volunteer to AM shift
3. In Tab 2: Refresh and observe

**Expected Result**:
- Tab 2 shows updated assignment after refresh
- No data conflicts
- Latest change persists
- (Note: Real-time sync requires additional implementation)

**Status**: [ ] Pass [ ] Fail

---

### TC-019: Volunteer Self-Enrollment During Admin Session
**Priority**: Medium  
**Description**: Volunteer signs up while admin viewing same shift

**Steps**:
1. Admin: Open `/admin` on specific date
2. Volunteer: Login and join shift on same date
3. Admin: Refresh page

**Expected Result**:
- Volunteer's self-enrollment appears in admin view
- Capacity counter reflects self-enrollment
- Admin can still remove volunteer if needed

**Status**: [ ] Pass [ ] Fail

---

## Category 7: Day Roster View

### TC-020: View Day Roster from Calendar
**Priority**: High  
**Description**: Admin can access detailed day roster

**Steps**:
1. Login as admin
2. Navigate to `/calendar`
3. Click "View roster" link on any day

**Expected Result**:
- Redirects to `/day/[date]` page
- Shows all three shifts (AM, MID, PM)
- Displays assigned volunteers with names
- Shows capacity for each shift
- Back navigation works

**Status**: [ ] Pass [ ] Fail

---

### TC-021: View Empty Roster
**Priority**: Low  
**Description**: Admin views roster for day with no assignments

**Steps**:
1. Navigate to calendar
2. Click "View roster" on empty day

**Expected Result**:
- Roster page loads
- Shows three shift cards
- Each shows "No volunteers yet"
- No errors occur

**Status**: [ ] Pass [ ] Fail

---

## Category 8: UI/UX & Responsiveness

### TC-022: Mobile Admin View
**Priority**: High  
**Description**: Admin interface works on mobile devices

**Steps**:
1. Open admin panel on mobile device (or mobile emulator)
2. Test all core functions

**Expected Result**:
- Layout adapts to mobile screen
- Shift cards stack vertically
- DirectoryPicker is usable
- Buttons are tap-friendly (min 44px)
- No horizontal scroll
- Date picker works on mobile

**Status**: [ ] Pass [ ] Fail

---

### TC-023: Tablet Admin View
**Priority**: Medium  
**Description**: Admin interface optimized for tablet screens

**Steps**:
1. Open admin panel on tablet (768px - 1024px)
2. Test layout and interactions

**Expected Result**:
- 2-column grid for shift cards
- Proper spacing and sizing
- Touch-friendly interactions
- Readable text sizes

**Status**: [ ] Pass [ ] Fail

---

### TC-024: Desktop Large Screen (19" Laptop)
**Priority**: High  
**Description**: Admin interface optimized for large desktop screens

**Steps**:
1. Open admin panel on 1440px+ screen
2. Verify layout utilization

**Expected Result**:
- 3-column grid for shift cards
- Content centered with header alignment
- Proper use of horizontal space
- No awkward stretching
- Max-width container maintains readability

**Status**: [ ] Pass [ ] Fail

---

## Category 9: Error Handling & Edge Cases

### TC-025: Handle Database Connection Error
**Priority**: High  
**Description**: Graceful handling when database is unavailable

**Steps**:
1. Simulate database error (disconnect Supabase temporarily)
2. Attempt to assign volunteer

**Expected Result**:
- Error toast appears with user-friendly message
- No application crash
- User can retry after connection restored
- Loading states clear properly

**Status**: [ ] Pass [ ] Fail

---

### TC-026: Handle Volunteer Without Phone Number
**Priority**: Low  
**Description**: Display volunteer who didn't provide phone

**Steps**:
1. Create volunteer account without phone number
2. View in admin DirectoryPicker

**Expected Result**:
- Volunteer still appears in list
- Shows name only
- No "undefined" or error text
- Assign function still works

**Status**: [ ] Pass [ ] Fail

---

### TC-027: Rapid Duplicate Assignment Prevention
**Priority**: Medium  
**Description**: Prevent double-assignment from rapid clicking

**Steps**:
1. Navigate to `/admin`
2. Click same volunteer twice rapidly in DirectoryPicker

**Expected Result**:
- Only one assignment is created
- Pending state prevents double-click
- No duplicate database entries
- Proper error handling

**Status**: [ ] Pass [ ] Fail

---

### TC-028: Very Long Volunteer Names
**Priority**: Low  
**Description**: Handle display of unusually long names

**Steps**:
1. Create volunteer with name: "Christopher Alexander Montgomery-Williams III"
2. Assign to shift
3. View in admin panel

**Expected Result**:
- Name truncates gracefully with ellipsis
- No layout breaking
- Full name visible on hover (tooltip)
- Shift card maintains proper width

**Status**: [ ] Pass [ ] Fail

---

## Category 10: Data Integrity & Security

### TC-029: RLS Policy Enforcement
**Priority**: Critical  
**Description**: Verify Row Level Security policies work correctly

**Steps**:
1. Check that admin can read all volunteers
2. Check that admin can modify shift assignments
3. Verify policies in Supabase dashboard

**Expected Result**:
- Admin role has proper permissions
- Regular users cannot access admin functions
- Database queries respect RLS
- Unauthorized actions are blocked

**Status**: [ ] Pass [ ] Fail

---

### TC-030: SQL Injection Prevention
**Priority**: Critical  
**Description**: Verify search inputs are sanitized

**Steps**:
1. Navigate to `/admin`
2. In DirectoryPicker search, enter: `'; DROP TABLE shifts; --`
3. Test other malicious inputs

**Expected Result**:
- No database modification occurs
- Search treats input as literal string
- No errors thrown
- Application remains secure

**Status**: [ ] Pass [ ] Fail

---

## Category 11: Performance & Load Testing

### TC-031: Load 100+ Volunteers
**Priority**: Medium  
**Description**: Test performance with large volunteer base

**Steps**:
1. Create 100+ volunteer accounts
2. Navigate to `/admin`
3. Open DirectoryPicker
4. Test search functionality

**Expected Result**:
- List renders without lag (< 2 seconds)
- Search is responsive
- Scrolling is smooth
- No memory leaks
- UI remains usable

**Status**: [ ] Pass [ ] Fail

---

### TC-032: View Month with 90+ Shifts
**Priority**: Medium  
**Description**: Test calendar performance with full month

**Steps**:
1. Seed entire month (90+ shifts)
2. Navigate to `/calendar` for that month
3. Scroll through days

**Expected Result**:
- Calendar loads within 3 seconds
- Smooth rendering of all days
- Capacity counters are accurate
- No UI freezing
- Responsive interactions

**Status**: [ ] Pass [ ] Fail

---

## Missing Features & Enhancement Opportunities

### Feature Analysis: Items to Add or Enhance

#### 1. **Bulk Operations**
**Current State**: Admin must assign volunteers one-by-one  
**Recommended Enhancement**:
- Add "Bulk Assign" mode
- Multi-select volunteers
- Assign selected group to shift
- Clear all assignments button

**Priority**: High  
**Implementation Effort**: Medium

---

#### 2. **Volunteer Activity Dashboard**
**Current State**: No visibility into volunteer statistics  
**Recommended Enhancement**:
- Add `/admin/volunteers` page
- Show volunteer metrics:
  - Total shifts completed
  - Upcoming shifts
  - Last active date
  - Reliability score (completion rate)
- Export volunteer data to CSV

**Priority**: High  
**Implementation Effort**: High

---

#### 3. **Shift Template System**
**Current State**: Seeding creates basic shifts only  
**Recommended Enhancement**:
- Admin can create shift templates
- Define custom shift times
- Set different capacities by day of week
- Apply templates when seeding

**Priority**: Medium  
**Implementation Effort**: High

---

#### 4. **Notification System**
**Current State**: No communication system  
**Recommended Enhancement**:
- Email notifications for:
  - Shift assignments by admin
  - Shift reminders (24 hours before)
  - Shift cancellations
- SMS notifications (optional)
- In-app notification center

**Priority**: High  
**Implementation Effort**: High

---

#### 5. **Admin Activity Log**
**Current State**: No audit trail  
**Recommended Enhancement**:
- Track all admin actions:
  - Who assigned/removed volunteers
  - When shifts were modified
  - Bulk operations performed
- View activity log in admin panel
- Filter by date, admin, action type

**Priority**: Medium  
**Implementation Effort**: Medium

---

#### 6. **Conflict Detection**
**Current State**: System allows volunteer to be assigned to overlapping shifts  
**Recommended Enhancement**:
- Warn admin if assigning volunteer to overlapping shift
- Show volunteer's existing assignments for selected date
- Prevent double-booking (optional setting)

**Priority**: Medium  
**Implementation Effort**: Low

---

#### 7. **Advanced Search & Filters**
**Current State**: Basic name search only  
**Recommended Enhancement**:
- Filter volunteers by:
  - Availability
  - Number of shifts this month
  - Role/skills (if added to profile)
  - Last active date
- Save favorite volunteers (quick access)

**Priority**: Low  
**Implementation Effort**: Medium

---

#### 8. **Print/Export Roster**
**Current State**: No export functionality  
**Recommended Enhancement**:
- Print-friendly day roster view
- Export to PDF
- Export to Excel/CSV
- Email roster to team

**Priority**: Medium  
**Implementation Effort**: Low

---

#### 9. **Shift Notes/Comments**
**Current State**: No way to add context to shifts  
**Recommended Enhancement**:
- Add notes field to shifts
- Admin can add special instructions
- Notes visible to assigned volunteers
- Example: "Bring warm clothes" or "Event setup required"

**Priority**: Low  
**Implementation Effort**: Low

---

#### 10. **Real-Time Collaboration**
**Current State**: Changes only visible on refresh  
**Recommended Enhancement**:
- Implement Supabase Realtime subscriptions
- Live updates when other admins make changes
- Show "Someone else is editing" indicator
- Prevent conflicting simultaneous edits

**Priority**: Low  
**Implementation Effort**: High

---

## Test Execution Plan

### Phase 1: Critical Path (Day 1)
- Run TC-001 through TC-010 (Auth & Core Assignment)
- Fix any blocking issues immediately
- Verify database integrity

### Phase 2: Core Features (Day 2)
- Run TC-011 through TC-021 (Shift Management & Roster)
- Test on multiple devices
- Document all issues

### Phase 3: Edge Cases (Day 3)
- Run TC-022 through TC-030 (UI, Errors, Security)
- Stress test with large datasets
- Verify performance

### Phase 4: Enhancement Review (Day 4)
- Review missing features list
- Prioritize top 3 enhancements
- Create implementation plan

### Phase 5: Regression Testing (Day 5)
- Rerun failed tests
- Verify all fixes
- Generate final report

---

## Test Report Template

### Test Execution Summary
- **Date**: [Insert Date]
- **Tester**: [Your Name]
- **Environment**: [Production/Staging]
- **Database**: Supabase Connected

### Results Overview
- **Total Test Cases**: 32
- **Passed**: X
- **Failed**: Y
- **Blocked**: Z
- **Pass Rate**: X%

### Critical Issues Found
1. [Issue Title]
   - Test Case: TC-XXX
   - Severity: Critical/High/Medium/Low
   - Description: [Details]
   - Root Cause: [Analysis]
   - Fix Applied: [Yes/No]

### Feature Gaps Identified
1. [Feature Name]
   - Priority: High/Medium/Low
   - Impact: [Description]
   - Recommendation: [Action]

### Recommendations
1. [Top Priority Fix/Enhancement]
2. [Second Priority]
3. [Third Priority]

### Sign-off
- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Enhancement roadmap created
- [ ] Ready for production use

---

## Quick Start Testing

To begin testing immediately:

1. **Run the mock data script** (fixes SQL syntax error)
2. **Create admin account** with provided credentials
3. **Update role to admin** in Supabase
4. **Create 3-5 test volunteers**
5. **Start with TC-001** and proceed sequentially

Each failed test should be documented with:
- Screenshot of error
- Browser console logs
- Expected vs actual behavior
- Proposed fix
