# Admin User Management - Test-Driven Development Plan

## Overview
Comprehensive test plan for Admin User Management features including:
- Creating new user accounts (volunteers and admins)
- Blocking and unblocking email addresses  
- Removing user accounts
- Assigning and revoking shifts for users

## Test Strategy
- **Approach**: Test-Driven Development (TDD) - Write tests first, implement to pass
- **Database**: Live Supabase connection (no mocks)
- **Security**: Validate admin-only access for all operations
- **Data Integrity**: Verify database state after each operation

---

## Test Suite 1: User Account Creation

### Test 1.1: Create Volunteer Account Successfully
**@test-scope: User account creation - success path for volunteer role**

**Prerequisites:**
- Admin user logged in (volunteer@vanderpumpdogs.org)
- Valid email not in blocklist
- Valid password meeting security requirements

**Test Steps:**
1. Navigate to `/admin/users`
2. Click "Create User" button
3. Fill in form:
   - Name: "Test Volunteer"
   - Email: "test.volunteer@example.com"
   - Phone: "+1-555-0100"
   - Password: "SecurePass123!"
   - Role: "volunteer"
4. Click "Create User" submit button

**Expected Results:**
- Success toast notification displayed
- New user appears in users table
- User can log in with provided credentials
- Profile record created with correct data

**Database Verification:**
\`\`\`sql
-- Verify profile exists
SELECT id, name, email_opt_in, role, active 
FROM profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'test.volunteer@example.com');

-- Expected: 1 row with role='volunteer', active=true or null
\`\`\`

**Pass Criteria:**
- [ ] UI shows success message
- [ ] User appears in admin users list
- [ ] Database profile record created correctly
- [ ] User can authenticate

---

### Test 1.2: Create Admin Account Successfully
**@test-scope: User account creation - success path for admin role**

**Prerequisites:**
- Admin user logged in
- Valid unique email

**Test Steps:**
1. Navigate to `/admin/users`
2. Click "Create User" button
3. Fill in form with role="admin"
4. Submit form

**Expected Results:**
- Admin user created successfully
- User has admin privileges immediately
- Can access `/admin` routes

**Database Verification:**
\`\`\`sql
-- Verify admin role assigned
SELECT role FROM profiles WHERE email = 'test.admin@example.com';
-- Expected: 'admin'
\`\`\`

**Pass Criteria:**
- [ ] Admin role assigned correctly
- [ ] User can access admin dashboard
- [ ] Proper permissions granted

---

### Test 1.3: Prevent Creation with Blocked Email
**@test-scope: User account creation - blocked email validation**

**Prerequisites:**
- Email "blocked@example.com" exists in auth_blocklist

**Test Steps:**
1. Attempt to create user with blocked email
2. Submit form

**Expected Results:**
- Error message: "This email address is blocked"
- No user account created
- No profile record in database

**Database Verification:**
\`\`\`sql
-- Verify email is blocked
SELECT email, reason FROM auth_blocklist WHERE email = 'blocked@example.com';

-- Verify no user created
SELECT COUNT(*) FROM auth.users WHERE email = 'blocked@example.com';
-- Expected: 0
\`\`\`

**Pass Criteria:**
- [ ] Blocklist check performed before creation
- [ ] Clear error message shown
- [ ] No database records created

---

### Test 1.4: Validate Required Fields
**@test-scope: User account creation - form validation**

**Test Cases:**
- Empty name field → Error: "Name is required"
- Empty email field → Error: "Email is required"
- Invalid email format → Error: "Invalid email address"
- Weak password (< 8 chars) → Error: "Password must be at least 8 characters"
- Empty password → Error: "Password is required"

**Pass Criteria:**
- [ ] All required fields validated
- [ ] Clear error messages displayed
- [ ] Form submission blocked until valid

---

### Test 1.5: Prevent Duplicate Email Accounts
**@test-scope: User account creation - duplicate prevention**

**Prerequisites:**
- User "existing@example.com" already exists

**Test Steps:**
1. Attempt to create new user with email "existing@example.com"
2. Submit form

**Expected Results:**
- Error: "An account with this email already exists"
- No duplicate account created

**Pass Criteria:**
- [ ] Duplicate email check performed
- [ ] Appropriate error message shown

---

## Test Suite 2: Email Blocking/Unblocking

### Test 2.1: Block Email Address Successfully
**@test-scope: Email blocking - success path**

**Prerequisites:**
- Admin logged in
- Email not currently blocked

**Test Steps:**
1. Navigate to `/admin/users`
2. Click "Block Email" button
3. Enter email: "spam@example.com"
4. Enter reason: "Spam account"
5. Click "Block Email"

**Expected Results:**
- Success message displayed
- Email added to blocked list
- Cannot create user with this email

**Database Verification:**
\`\`\`sql
-- Verify blocklist entry
SELECT email, reason, blocked_by, blocked_at 
FROM auth_blocklist 
WHERE email = 'spam@example.com';

-- Expected: 1 row with admin user ID in blocked_by
\`\`\`

**Pass Criteria:**
- [ ] Blocklist record created
- [ ] Admin ID recorded as blocker
- [ ] Timestamp recorded
- [ ] Email appears in blocked list UI

---

### Test 2.2: Unblock Email Address Successfully
**@test-scope: Email unblocking - success path**

**Prerequisites:**
- Email "unblock@example.com" currently in blocklist

**Test Steps:**
1. Navigate to blocked emails section
2. Find "unblock@example.com"
3. Click "Unblock" button
4. Confirm action

**Expected Results:**
- Success message displayed
- Email removed from blocked list
- Can now create user with this email

**Database Verification:**
\`\`\`sql
-- Verify removal from blocklist
SELECT COUNT(*) FROM auth_blocklist WHERE email = 'unblock@example.com';
-- Expected: 0
\`\`\`

**Pass Criteria:**
- [ ] Record deleted from database
- [ ] Email no longer appears in UI
- [ ] Can register with previously blocked email

---

### Test 2.3: Block with Reason (Optional Field)
**@test-scope: Email blocking - optional reason field**

**Test Steps:**
1. Block email without providing reason
2. Submit form

**Expected Results:**
- Email blocked successfully
- Reason field stored as empty/null

**Pass Criteria:**
- [ ] Reason field is optional
- [ ] Blocking succeeds without reason

---

## Test Suite 3: User Account Removal

### Test 3.1: Delete User Account Successfully
**@test-scope: User removal - complete deletion**

**Prerequisites:**
- User "delete@example.com" exists with some shift assignments

**Test Steps:**
1. Navigate to `/admin/users`
2. Find user "delete@example.com"
3. Click delete button
4. Confirm deletion in dialog

**Expected Results:**
- User profile deleted
- All shift assignments removed
- Cannot log in with credentials
- Success message displayed

**Database Verification:**
\`\`\`sql
-- Verify profile deleted
SELECT COUNT(*) FROM profiles WHERE email = 'delete@example.com';
-- Expected: 0

-- Verify shift assignments removed
SELECT COUNT(*) FROM shift_assignments WHERE user_id = '<deleted_user_id>';
-- Expected: 0
\`\`\`

**Pass Criteria:**
- [ ] Profile record deleted
- [ ] Shift assignments cascade deleted
- [ ] User removed from UI
- [ ] Auth user record handled appropriately

---

### Test 3.2: Prevent Self-Deletion
**@test-scope: User removal - prevent admin self-deletion**

**Prerequisites:**
- Admin logged in as volunteer@vanderpumpdogs.org

**Test Steps:**
1. Attempt to delete own account
2. Try to confirm

**Expected Results:**
- Error: "Cannot delete your own account"
- Deletion prevented
- Account remains active

**Pass Criteria:**
- [ ] Self-deletion blocked
- [ ] Clear error message
- [ ] Account remains intact

---

### Test 3.3: Require Confirmation for Deletion
**@test-scope: User removal - confirmation dialog**

**Test Steps:**
1. Click delete button
2. Cancel confirmation dialog
3. Verify user not deleted

**Pass Criteria:**
- [ ] Confirmation dialog shown
- [ ] Cancel prevents deletion
- [ ] User remains in system

---

## Test Suite 4: Role Assignment

### Test 4.1: Change Volunteer to Admin
**@test-scope: Role management - promotion to admin**

**Prerequisites:**
- User exists with role="volunteer"

**Test Steps:**
1. Navigate to user profile
2. Change role to "admin"
3. Save changes

**Expected Results:**
- Role updated to admin
- User gains admin permissions
- Can access admin routes

**Database Verification:**
\`\`\`sql
-- Verify role change
SELECT role FROM profiles WHERE id = '<user_id>';
-- Expected: 'admin'
\`\`\`

**Pass Criteria:**
- [ ] Role updated in database
- [ ] Permissions immediately granted
- [ ] Success message shown

---

### Test 4.2: Change Admin to Volunteer (Demotion)
**@test-scope: Role management - demotion to volunteer**

**Prerequisites:**
- User with role="admin" (not current admin)

**Test Steps:**
1. Change admin role to volunteer
2. Save changes

**Expected Results:**
- Role downgraded to volunteer
- Admin permissions removed
- Cannot access admin routes

**Pass Criteria:**
- [ ] Role updated successfully
- [ ] Permissions revoked
- [ ] Access restricted appropriately

---

### Test 4.3: Prevent Last Admin Demotion
**@test-scope: Role management - protect last admin**

**Prerequisites:**
- Only one admin account exists

**Test Steps:**
1. Attempt to demote last admin to volunteer

**Expected Results:**
- Error: "Cannot remove last admin account"
- Role change prevented
- System maintains admin access

**Pass Criteria:**
- [ ] Last admin protection enforced
- [ ] Clear error message
- [ ] At least one admin always exists

---

## Test Suite 5: Shift Assignment by Admin

### Test 5.1: Assign User to Available Shift
**@test-scope: Shift assignment - admin assigns volunteer**

**Prerequisites:**
- Shift exists with available capacity
- Volunteer user selected

**Test Steps:**
1. Navigate to shift management or user profile
2. Select shift with open slots
3. Assign volunteer to shift
4. Save assignment

**Expected Results:**
- Shift assignment created
- Capacity decreases by 1
- Volunteer sees shift in their schedule
- Success message displayed

**Database Verification:**
\`\`\`sql
-- Verify assignment created
SELECT user_id, shift_id, created_at 
FROM shift_assignments 
WHERE user_id = '<volunteer_id>' AND shift_id = '<shift_id>';

-- Expected: 1 row

-- Verify capacity logic
SELECT 
  (SELECT capacity FROM shifts WHERE id = '<shift_id>') as total_capacity,
  COUNT(*) as assigned
FROM shift_assignments 
WHERE shift_id = '<shift_id>';
-- Expected: assigned < total_capacity
\`\`\`

**Pass Criteria:**
- [ ] Assignment record created
- [ ] User sees shift in schedule
- [ ] Capacity validation respected
- [ ] Timestamp recorded

---

### Test 5.2: Prevent Double Assignment
**@test-scope: Shift assignment - duplicate prevention**

**Prerequisites:**
- User already assigned to specific shift

**Test Steps:**
1. Attempt to assign same user to same shift again
2. Submit assignment

**Expected Results:**
- Error: "User already assigned to this shift"
- No duplicate assignment created

**Database Verification:**
\`\`\`sql
-- Verify single assignment
SELECT COUNT(*) FROM shift_assignments 
WHERE user_id = '<user_id>' AND shift_id = '<shift_id>';
-- Expected: 1 (not 2)
\`\`\`

**Pass Criteria:**
- [ ] Duplicate check performed
- [ ] Error message shown
- [ ] Single assignment maintained

---

### Test 5.3: Prevent Assignment to Full Shift
**@test-scope: Shift assignment - capacity enforcement**

**Prerequisites:**
- Shift at maximum capacity

**Test Steps:**
1. Attempt to assign volunteer to full shift
2. Submit assignment

**Expected Results:**
- Error: "Shift is at full capacity"
- No assignment created
- Capacity limit enforced

**Database Verification:**
\`\`\`sql
-- Verify capacity not exceeded
SELECT 
  s.capacity,
  COUNT(sa.id) as assigned
FROM shifts s
LEFT JOIN shift_assignments sa ON sa.shift_id = s.id
WHERE s.id = '<shift_id>'
GROUP BY s.capacity;
-- Expected: assigned <= capacity
\`\`\`

**Pass Criteria:**
- [ ] Capacity check enforced
- [ ] Clear error message
- [ ] Assignment prevented

---

### Test 5.4: Revoke Shift Assignment
**@test-scope: Shift revocation - admin removes volunteer**

**Prerequisites:**
- User assigned to shift

**Test Steps:**
1. Navigate to user's shift assignments
2. Select assignment to remove
3. Click "Remove from Shift"
4. Confirm action

**Expected Results:**
- Assignment deleted
- Capacity increases by 1
- User no longer sees shift
- Success message displayed

**Database Verification:**
\`\`\`sql
-- Verify assignment deleted
SELECT COUNT(*) FROM shift_assignments 
WHERE id = '<assignment_id>';
-- Expected: 0

-- Verify capacity freed
SELECT COUNT(*) FROM shift_assignments WHERE shift_id = '<shift_id>';
-- Expected: previous_count - 1
\`\`\`

**Pass Criteria:**
- [ ] Assignment record deleted
- [ ] Capacity updated correctly
- [ ] User schedule updated
- [ ] Success notification shown

---

### Test 5.5: Bulk Shift Assignment
**@test-scope: Shift assignment - assign multiple shifts to user**

**Prerequisites:**
- Multiple shifts available
- One volunteer selected

**Test Steps:**
1. Select volunteer
2. Choose multiple shifts (e.g., 5 shifts)
3. Bulk assign all shifts
4. Submit

**Expected Results:**
- All assignments created successfully
- User sees all shifts in schedule
- All shifts updated correctly

**Pass Criteria:**
- [ ] Multiple assignments created
- [ ] Transaction successful
- [ ] All shifts validated

---

## Test Suite 6: Permission & Security

### Test 6.1: Block Non-Admin Access to User Management
**@test-scope: Security - admin-only access enforcement**

**Prerequisites:**
- User logged in with role="volunteer"

**Test Steps:**
1. Navigate to `/admin/users`

**Expected Results:**
- Access denied
- Redirected to calendar or error page
- Message: "Admin privileges required"

**Pass Criteria:**
- [ ] Route protected
- [ ] Clear error message
- [ ] No unauthorized access

---

### Test 6.2: Validate Admin Role on All Actions
**@test-scope: Security - role verification for each operation**

**Test Cases:**
- Create user: Requires admin role
- Block email: Requires admin role
- Delete user: Requires admin role
- Assign shift: Requires admin role
- Change role: Requires admin role

**Pass Criteria:**
- [ ] All operations check admin role
- [ ] Unauthorized attempts blocked
- [ ] Security logged

---

### Test 6.3: Verify Audit Trail for Sensitive Actions
**@test-scope: Security - action logging**

**Sensitive Actions to Log:**
- User creation (who created, when, what role)
- User deletion (who deleted, when)
- Email blocking (who blocked, when, reason)
- Role changes (who changed, from what to what)

**Database Verification:**
\`\`\`sql
-- Check blocked_by field populated
SELECT blocked_by FROM auth_blocklist WHERE email = '<email>';
-- Expected: admin user ID

-- Future: Check audit log table if implemented
\`\`\`

**Pass Criteria:**
- [ ] Admin ID recorded for actions
- [ ] Timestamps captured
- [ ] Action trail maintained

---

## Test Suite 7: Edge Cases & Error Handling

### Test 7.1: Handle Database Connection Errors
**@test-scope: Error handling - database failures**

**Simulate:**
- Database timeout
- Connection lost during operation

**Expected Results:**
- User-friendly error message
- No partial data corruption
- Graceful degradation

**Pass Criteria:**
- [ ] Error caught and handled
- [ ] User informed appropriately
- [ ] Data integrity maintained

---

### Test 7.2: Handle Concurrent Modifications
**@test-scope: Data integrity - concurrent updates**

**Scenario:**
- Two admins edit same user simultaneously

**Expected Results:**
- Last write wins or optimistic locking
- No data loss
- Conflict resolution message

**Pass Criteria:**
- [ ] Concurrent updates handled
- [ ] No data corruption
- [ ] User notified if conflict

---

### Test 7.3: Validate Input Sanitization
**@test-scope: Security - SQL injection prevention**

**Test Inputs:**
- Name: `'; DROP TABLE profiles; --`
- Email: `<script>alert('xss')</script>@example.com`

**Expected Results:**
- Input sanitized or rejected
- No SQL injection
- No XSS vulnerability

**Pass Criteria:**
- [ ] Malicious input blocked
- [ ] Data safely stored
- [ ] No security vulnerabilities

---

## Test Suite 8: User Experience & Validation

### Test 8.1: Show Real-Time Feedback
**@test-scope: UX - loading states and feedback**

**Test Cases:**
- Show loading spinner during user creation
- Disable submit button while processing
- Toast notifications for success/error

**Pass Criteria:**
- [ ] Loading states clear
- [ ] User knows action in progress
- [ ] Feedback immediate and clear

---

### Test 8.2: Form Validation Before Submission
**@test-scope: UX - client-side validation**

**Test Cases:**
- Email format validated client-side
- Required fields marked with asterisk
- Password strength indicator shown

**Pass Criteria:**
- [ ] Validation immediate
- [ ] Clear field requirements
- [ ] Prevent invalid submissions

---

## Test Suite 9: Integration Tests

### Test 9.1: End-to-End User Lifecycle
**@test-scope: Integration - complete workflow**

**Steps:**
1. Admin creates new volunteer account
2. Volunteer logs in and views calendar
3. Admin assigns volunteer to 3 shifts
4. Volunteer sees shifts in schedule
5. Admin revokes 1 shift
6. Admin promotes volunteer to admin
7. New admin accesses admin dashboard
8. Original admin demotes user back to volunteer
9. Admin deactivates volunteer account
10. Volunteer cannot log in

**Pass Criteria:**
- [ ] All steps complete successfully
- [ ] Data consistent throughout
- [ ] Permissions updated correctly
- [ ] No orphaned records

---

### Test 9.2: Block-Create-Unblock Workflow
**@test-scope: Integration - email blocking flow**

**Steps:**
1. Block email "test@example.com"
2. Attempt to create user with blocked email (fails)
3. Unblock email
4. Create user successfully with same email

**Pass Criteria:**
- [ ] Blocklist enforced
- [ ] Unblocking works correctly
- [ ] Workflow smooth and logical

---

## Test Execution Order

### Phase 1: Foundation (Run First)
1. Permission & Security tests (Suite 6)
2. Form validation tests (Suite 1, tests 1.4)

### Phase 2: Core Features (Run Second)
3. User creation tests (Suite 1, tests 1.1-1.3, 1.5)
4. Email blocking tests (Suite 2)
5. User deletion tests (Suite 3)
6. Role assignment tests (Suite 4)

### Phase 3: Advanced Features (Run Third)
7. Shift assignment tests (Suite 5)

### Phase 4: Robustness (Run Fourth)
8. Edge cases & error handling (Suite 7)
9. UX validation (Suite 8)

### Phase 5: Complete Workflow (Run Last)
10. Integration tests (Suite 9)

---

## Test Environment Setup

### Database State Before Tests
\`\`\`sql
-- Ensure admin user exists
SELECT * FROM profiles WHERE email = 'volunteer@vanderpumpdogs.org';

-- Clear test data from previous runs
DELETE FROM shift_assignments WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@example.com'
);
DELETE FROM profiles WHERE email LIKE '%@example.com';
DELETE FROM auth_blocklist WHERE email LIKE '%@example.com';

-- Create test shifts if needed
-- (Use production shift creation process)
\`\`\`

### Test Data Cleanup After Suite
\`\`\`sql
-- Remove all test users
DELETE FROM shift_assignments WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE 'test.%@example.com'
);
DELETE FROM profiles WHERE email LIKE 'test.%@example.com';

-- Remove test blocked emails
DELETE FROM auth_blocklist WHERE email LIKE 'test.%@example.com';
\`\`\`

---

## Success Criteria Summary

### All Tests Must Pass:
- ✅ 100% of security tests passing
- ✅ 100% of permission tests passing
- ✅ 95%+ of functional tests passing
- ✅ 90%+ of edge case tests passing

### Code Quality Requirements:
- All database operations use RLS policies
- All operations validate admin role
- No SQL injection vulnerabilities
- Proper error handling throughout
- User-friendly error messages
- Loading states for async operations
- Transaction safety for critical operations

### Documentation Requirements:
- Comprehensive inline code comments explaining:
  - What each function does
  - Why security checks exist
  - How RLS policies protect data
  - Edge cases handled
- README with setup instructions
- API documentation for server actions

---

## Implementation Checklist

### Before Implementation:
- [ ] Review all test cases
- [ ] Understand security requirements
- [ ] Plan database structure
- [ ] Design UI/UX flow

### During Implementation:
- [ ] Write one test at a time
- [ ] Implement feature to pass test
- [ ] Add comprehensive comments
- [ ] Verify database state after each operation
- [ ] Test security restrictions

### After Implementation:
- [ ] Run complete test suite
- [ ] Verify all tests pass
- [ ] Review code comments for clarity
- [ ] Test with real admin account
- [ ] Document any known limitations

---

## Test Execution Log Template

\`\`\`markdown
### Test Execution: [Date]
**Tester:** [Name]
**Environment:** Production Supabase Database

#### Test Results:
- Suite 1 (User Creation): ✅ PASS (5/5 tests)
- Suite 2 (Email Blocking): ✅ PASS (3/3 tests)
- Suite 3 (User Removal): ✅ PASS (3/3 tests)
- Suite 4 (Role Assignment): ⚠️ PARTIAL (2/3 tests) - Test 4.3 needs fix
- Suite 5 (Shift Assignment): ✅ PASS (5/5 tests)
- Suite 6 (Security): ✅ PASS (3/3 tests)
- Suite 7 (Edge Cases): ✅ PASS (3/3 tests)
- Suite 8 (UX): ✅ PASS (2/2 tests)
- Suite 9 (Integration): ✅ PASS (2/2 tests)

**Total:** 28/29 tests passing (96.6%)

#### Issues Found:
1. Test 4.3 - Last admin protection not enforced yet

#### Next Steps:
1. Implement last admin protection check
2. Rerun Suite 4
3. Verify all tests pass
\`\`\`

---

## Notes for Developers

### Server Actions Required
The following operations require Next.js Server Actions (not client-side):
1. **User Creation** - Requires `supabase.auth.admin.createUser()`
2. **User Deletion** - May require admin API depending on implementation

### RLS Policy Dependencies
Ensure these policies exist before testing:
- `profiles`: INSERT/UPDATE/SELECT policies for authenticated users
- `auth_blocklist`: Admin-only access policy
- `shift_assignments`: CRUD policies with proper user checks
- `shifts`: Admin write, public read policies

### Environment Variables
Required for tests:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

---

**Test Plan Version:** 1.0  
**Last Updated:** 2025-01-08  
**Status:** Ready for Implementation
