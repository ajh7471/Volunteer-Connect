# Email Communication System - TDD Test Plan

**Feature #2: Email Communication System**  
**Created:** 2025-11-08  
**Status:** Ready for Implementation

## Overview

This document defines comprehensive test cases for the Email Communication System using Test-Driven Development principles. All tests must pass before moving to Feature #3.

---

## Test Philosophy

1. **Write Tests First** - Define expected behavior before implementation
2. **Live Database Testing** - All tests use real Supabase connections
3. **Security First** - Verify admin-only access and data protection
4. **Edge Cases** - Test boundary conditions and error scenarios
5. **Integration Testing** - Verify email system works with user management

---

## Database Schema Requirements

\`\`\`sql
-- Required tables (already exist)
email_logs (
  id uuid PRIMARY KEY,
  sent_by uuid REFERENCES profiles(id),
  recipient_id uuid REFERENCES profiles(id),
  recipient_email email,
  email_type text,
  subject text,
  status email_status, -- 'pending', 'sent', 'failed'
  sent_at timestamp,
  error_message text
)

-- New table needed for email templates
email_templates (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  category text, -- 'reminder', 'confirmation', 'promotional', 'urgent'
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb, -- {firstName}, {shiftDate}, etc.
  created_by uuid REFERENCES profiles(id),
  created_at timestamp,
  updated_at timestamp,
  active boolean DEFAULT true
)

-- New table needed for scheduled emails
scheduled_emails (
  id uuid PRIMARY KEY,
  template_id uuid REFERENCES email_templates(id),
  recipients jsonb, -- array of user ids or 'all'
  filter_criteria jsonb, -- email categories, roles, etc.
  scheduled_for timestamp,
  status text, -- 'pending', 'sent', 'cancelled'
  created_by uuid REFERENCES profiles(id),
  created_at timestamp,
  sent_at timestamp
)
\`\`\`

---

## Test Suite 1: Send Individual Email

### Test Case 1.1: Admin Can Send Email to Single Volunteer
**Priority:** HIGH  
**Prerequisites:** Admin logged in, volunteer exists with email_opt_in=true

**Test Steps:**
1. Login as admin (volunteer@vanderpumpdogs.org)
2. Navigate to /admin/emails
3. Click "Compose Email"
4. Select email type: "reminder"
5. Enter subject: "Upcoming Shift Reminder"
6. Enter message: "Don't forget your shift tomorrow!"
7. Select one volunteer recipient
8. Click "Send Email"

**Expected Results:**
- Success message displayed
- Email log entry created in database
- Status = 'pending' initially
- Recipient email matches selected volunteer
- sent_by = admin user ID

**Database Verification:**
\`\`\`sql
-- Check email was logged
SELECT * FROM email_logs 
WHERE recipient_id = '[VOLUNTEER_ID]'
  AND subject = 'Upcoming Shift Reminder'
  AND email_type = 'reminder'
  AND status IN ('pending', 'sent');

-- Check sent_by is admin
SELECT el.*, p.email 
FROM email_logs el
JOIN profiles p ON el.sent_by = p.id
WHERE el.recipient_id = '[VOLUNTEER_ID]'
  AND p.email = 'volunteer@vanderpumpdogs.org';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 1.2: Volunteer Cannot Send Emails
**Priority:** HIGH  
**Prerequisites:** Volunteer user logged in

**Test Steps:**
1. Login as volunteer user
2. Attempt to navigate to /admin/emails
3. Try to access email sending functionality

**Expected Results:**
- Redirect to /calendar or access denied
- No email compose UI visible
- No email_logs entries created by non-admin

**Database Verification:**
\`\`\`sql
-- Verify no emails sent by volunteers
SELECT * FROM email_logs el
JOIN profiles p ON el.sent_by = p.id
WHERE p.role = 'volunteer';
-- Should return 0 rows
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 1.3: Cannot Send to Volunteer with email_opt_in=false
**Priority:** HIGH  
**Prerequisites:** Volunteer exists with email_opt_in=false

**Test Steps:**
1. Login as admin
2. Navigate to /admin/emails
3. Open compose modal
4. Verify opted-out volunteer NOT in recipient list

**Expected Results:**
- Volunteer with email_opt_in=false not shown
- Cannot select opted-out volunteers
- Only opted-in volunteers appear

**Database Verification:**
\`\`\`sql
-- Get count of opted-in volunteers
SELECT COUNT(*) as opted_in_count 
FROM profiles 
WHERE email_opt_in = true;

-- Verify no emails sent to opted-out users
SELECT * FROM email_logs el
JOIN profiles p ON el.recipient_id = p.id
WHERE p.email_opt_in = false;
-- Should return 0 rows
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 2: Mass Email Campaigns

### Test Case 2.1: Send Email to Multiple Recipients
**Priority:** HIGH  
**Prerequisites:** Multiple volunteers with email_opt_in=true

**Test Steps:**
1. Login as admin
2. Navigate to /admin/emails
3. Compose new email
4. Select multiple volunteers (at least 3)
5. Enter subject and message
6. Send email

**Expected Results:**
- Success message shows correct count (e.g., "3 recipients")
- One email_log entry per recipient
- All entries have same subject and email_type
- All sent_by = admin user ID

**Database Verification:**
\`\`\`sql
-- Check multiple entries created
SELECT recipient_email, subject, email_type, sent_at 
FROM email_logs 
WHERE subject = '[TEST_SUBJECT]'
  AND sent_at > NOW() - INTERVAL '1 minute'
ORDER BY sent_at DESC;
-- Should return multiple rows

-- Verify count matches
SELECT COUNT(*) as email_count 
FROM email_logs 
WHERE subject = '[TEST_SUBJECT]';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 2.2: Filter Recipients by Email Category
**Priority:** MEDIUM  
**Prerequisites:** Volunteers with different email_categories preferences

**Test Steps:**
1. Login as admin
2. Navigate to /admin/emails
3. Open compose modal
4. Select filter: "Reminders Only"
5. Verify only volunteers with reminders=true shown
6. Switch filter to "Promotional Only"
7. Verify different set of volunteers shown

**Expected Results:**
- Filter correctly shows volunteers based on email_categories
- Category preferences respected
- Volunteer count changes based on filter

**Database Verification:**
\`\`\`sql
-- Check reminders category volunteers
SELECT id, name, email_categories 
FROM profiles 
WHERE email_opt_in = true
  AND email_categories->>'reminders' = 'true';

-- Check promotional category volunteers
SELECT id, name, email_categories 
FROM profiles 
WHERE email_opt_in = true
  AND email_categories->>'promotional' = 'true';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 2.3: Select All / Deselect All Functionality
**Priority:** MEDIUM

**Test Steps:**
1. Login as admin
2. Open compose modal
3. Click "Select All"
4. Verify all filtered volunteers selected
5. Click "Deselect All"
6. Verify no volunteers selected

**Expected Results:**
- Select All adds all visible volunteers
- Deselect All clears selection
- Selection count updates correctly

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 3: Email Templates

### Test Case 3.1: Create Email Template
**Priority:** HIGH  
**Prerequisites:** Admin logged in

**Test Steps:**
1. Navigate to /admin/emails/templates (new page)
2. Click "Create Template"
3. Enter name: "Shift Reminder Template"
4. Select category: "reminder"
5. Enter subject: "Your shift on {shiftDate}"
6. Enter body with variables: "Hi {firstName}, reminder about your shift..."
7. Save template

**Expected Results:**
- Template saved successfully
- Shows in templates list
- Variables properly marked

**Database Verification:**
\`\`\`sql
-- Check template created
SELECT * FROM email_templates 
WHERE name = 'Shift Reminder Template'
  AND active = true;

-- Verify variables stored
SELECT name, variables 
FROM email_templates 
WHERE name = 'Shift Reminder Template';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 3.2: Use Template for Email
**Priority:** HIGH  
**Prerequisites:** Email template exists

**Test Steps:**
1. Compose new email
2. Select "Use Template" dropdown
3. Choose template
4. Verify subject and body populated
5. Variables replaced with actual values
6. Send email

**Expected Results:**
- Template loads correctly
- Variables replaced (e.g., {firstName} → "John")
- Subject and body pre-filled
- Can modify before sending

**Database Verification:**
\`\`\`sql
-- Check email sent with template content
SELECT subject, el.* 
FROM email_logs el
WHERE subject LIKE '%shift on%';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 3.3: Edit and Deactivate Template
**Priority:** MEDIUM

**Test Steps:**
1. Navigate to templates list
2. Click edit on template
3. Modify subject
4. Save changes
5. Deactivate template

**Expected Results:**
- Changes saved successfully
- Deactivated template not shown in compose dropdown
- Still visible in templates list with "Inactive" badge

**Database Verification:**
\`\`\`sql
-- Check template updated
SELECT * FROM email_templates 
WHERE name = 'Shift Reminder Template';

-- Verify active status
SELECT name, active, updated_at 
FROM email_templates 
ORDER BY updated_at DESC;
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 4: Email Scheduling

### Test Case 4.1: Schedule Email for Future Delivery
**Priority:** HIGH  
**Prerequisites:** Admin logged in, volunteers exist

**Test Steps:**
1. Compose email
2. Check "Schedule for later"
3. Select date/time (tomorrow at 9am)
4. Select recipients
5. Click "Schedule"

**Expected Results:**
- Scheduled email entry created
- Status = 'pending'
- scheduled_for = selected date/time
- Email NOT sent immediately

**Database Verification:**
\`\`\`sql
-- Check scheduled email created
SELECT * FROM scheduled_emails 
WHERE status = 'pending'
  AND scheduled_for > NOW();

-- Verify NOT in email_logs yet
SELECT * FROM email_logs 
WHERE sent_at > NOW() - INTERVAL '1 minute';
-- Should not contain this email
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 4.2: View Scheduled Emails
**Priority:** MEDIUM

**Test Steps:**
1. Navigate to /admin/emails
2. Click "Scheduled" tab
3. Verify upcoming scheduled emails shown
4. Check date, recipients, subject displayed

**Expected Results:**
- List shows pending scheduled emails
- Date/time clearly displayed
- Recipient count shown
- Can see email preview

**Database Verification:**
\`\`\`sql
-- Get all scheduled emails
SELECT se.*, et.subject, et.body
FROM scheduled_emails se
LEFT JOIN email_templates et ON se.template_id = et.id
WHERE se.status = 'pending'
ORDER BY se.scheduled_for ASC;
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 4.3: Cancel Scheduled Email
**Priority:** MEDIUM

**Test Steps:**
1. View scheduled emails
2. Click "Cancel" on scheduled email
3. Confirm cancellation

**Expected Results:**
- Status updated to 'cancelled'
- Email not sent at scheduled time
- Still visible in scheduled list with cancelled status

**Database Verification:**
\`\`\`sql
-- Check status updated
SELECT * FROM scheduled_emails 
WHERE id = '[SCHEDULED_EMAIL_ID]'
  AND status = 'cancelled';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 5: Email Integration with volunteer@vanderpumpdogs.org

### Test Case 5.1: Verify From Address
**Priority:** HIGH

**Test Steps:**
1. Send test email
2. Check email headers/from address
3. Verify shows volunteer@vanderpumpdogs.org

**Expected Results:**
- From address = volunteer@vanderpumpdogs.org
- Reply-to properly configured
- Domain authentication passes (SPF/DKIM)

**Database Verification:**
\`\`\`sql
-- All emails should show from organization
SELECT DISTINCT 'volunteer@vanderpumpdogs.org' as from_address
FROM email_logs;
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 5.2: Email Service Integration (Resend/SendGrid)
**Priority:** HIGH  
**Prerequisites:** Email service API configured

**Test Steps:**
1. Send email via admin interface
2. Verify email service API called
3. Check email actually delivered
4. Verify status updated to 'sent'

**Expected Results:**
- API request successful
- Email delivered to inbox
- Status changes from 'pending' to 'sent'
- sent_at timestamp updated

**Database Verification:**
\`\`\`sql
-- Check status progression
SELECT recipient_email, status, sent_at, error_message
FROM email_logs 
WHERE id = '[EMAIL_LOG_ID]';
-- Should show status='sent' after delivery
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 6: Email History and Tracking

### Test Case 6.1: View Email History
**Priority:** MEDIUM

**Test Steps:**
1. Navigate to /admin/emails
2. View "Recent Emails" section
3. Verify shows last 50 emails
4. Check columns: date, recipient, type, subject, status

**Expected Results:**
- Shows most recent emails first
- All required columns visible
- Status badges color-coded
- Can filter by type

**Database Verification:**
\`\`\`sql
-- Get recent emails
SELECT * FROM email_logs 
ORDER BY sent_at DESC 
LIMIT 50;
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 6.2: Search Email History
**Priority:** LOW  
**Prerequisites:** Multiple emails sent

**Test Steps:**
1. View email history
2. Search by recipient email
3. Search by subject
4. Filter by email type
5. Filter by date range

**Expected Results:**
- Search results accurate
- Multiple filters can combine
- Results update in real-time

**Database Verification:**
\`\`\`sql
-- Search by recipient
SELECT * FROM email_logs 
WHERE recipient_email ILIKE '%test%';

-- Filter by type and date
SELECT * FROM email_logs 
WHERE email_type = 'reminder'
  AND sent_at >= '2025-01-01';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 7: Email Type Categories

### Test Case 7.1: Send Shift Reminder
**Priority:** HIGH

**Test Steps:**
1. Compose email with type "Shift Reminder"
2. Send to volunteers with upcoming shifts
3. Verify correct volunteers targeted

**Expected Results:**
- Email type = 'reminder'
- Only sent to volunteers with shifts in next 24-48 hours
- Subject/content appropriate for reminder

**Database Verification:**
\`\`\`sql
-- Check reminders sent
SELECT el.*, sa.shift_id, s.shift_date
FROM email_logs el
JOIN profiles p ON el.recipient_id = p.id
LEFT JOIN shift_assignments sa ON sa.user_id = p.id
LEFT JOIN shifts s ON sa.shift_id = s.id
WHERE el.email_type = 'reminder'
  AND s.shift_date BETWEEN NOW() AND NOW() + INTERVAL '2 days';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 7.2: Send Booking Confirmation
**Priority:** HIGH

**Test Steps:**
1. Volunteer books shift
2. Automatic confirmation email triggered
3. Verify email sent with type "confirmation"

**Expected Results:**
- Email automatically sent after booking
- Type = 'confirmation'
- Includes shift details
- Sent only if user has confirmations enabled

**Database Verification:**
\`\`\`sql
-- Check confirmation sent after booking
SELECT el.*, sa.created_at as booking_time
FROM email_logs el
JOIN shift_assignments sa ON el.recipient_id = sa.user_id
WHERE el.email_type = 'confirmation'
  AND el.sent_at >= sa.created_at
  AND el.sent_at <= sa.created_at + INTERVAL '5 minutes';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 7.3: Send Promotional Email
**Priority:** MEDIUM

**Test Steps:**
1. Compose promotional email
2. Filter recipients by promotional category
3. Send to opted-in users only

**Expected Results:**
- Only sent to users with promotional=true
- Type = 'promotional'
- Respects email preferences

**Database Verification:**
\`\`\`sql
-- Verify only promotional opt-ins received
SELECT el.recipient_id, p.email_categories
FROM email_logs el
JOIN profiles p ON el.recipient_id = p.id
WHERE el.email_type = 'promotional';
-- All should have email_categories->>'promotional' = 'true'
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 7.4: Send Urgent Notification
**Priority:** HIGH

**Test Steps:**
1. Compose urgent notification
2. Send to all opted-in volunteers
3. Verify high priority indicators

**Expected Results:**
- Type = 'urgent'
- Sent to all regardless of sub-categories
- Subject line prefixed with "URGENT:"
- Higher priority in email queue

**Database Verification:**
\`\`\`sql
-- Check urgent emails
SELECT * FROM email_logs 
WHERE email_type = 'urgent'
  AND subject LIKE 'URGENT:%';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 8: Error Handling

### Test Case 8.1: Handle Email Service Failure
**Priority:** HIGH

**Test Steps:**
1. Send email when service unavailable
2. Verify graceful error handling
3. Check error logged

**Expected Results:**
- User sees error message
- Email status = 'failed'
- error_message populated
- Can retry sending

**Database Verification:**
\`\`\`sql
-- Check failed emails
SELECT recipient_email, status, error_message, sent_at
FROM email_logs 
WHERE status = 'failed'
ORDER BY sent_at DESC;
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 8.2: Invalid Recipient Email
**Priority:** MEDIUM

**Test Steps:**
1. Attempt to send to invalid email
2. Verify validation catches issue

**Expected Results:**
- Email validation prevents sending
- Error message shown
- No email_log entry created for invalid email

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 8.3: Empty Subject or Message
**Priority:** MEDIUM

**Test Steps:**
1. Try to send email with empty subject
2. Try to send with empty message
3. Verify validation prevents sending

**Expected Results:**
- Cannot submit with empty required fields
- Error messages displayed
- Send button disabled until valid

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 9: Security and Permissions

### Test Case 9.1: Non-Admin Cannot Access Email Features
**Priority:** CRITICAL

**Test Steps:**
1. Login as volunteer
2. Attempt to access /admin/emails
3. Try direct API calls to email endpoints

**Expected Results:**
- 403 Forbidden or redirect
- No email UI visible
- API calls rejected

**Database Verification:**
\`\`\`sql
-- Verify no emails sent by non-admins
SELECT el.*, p.role 
FROM email_logs el
JOIN profiles p ON el.sent_by = p.id
WHERE p.role != 'admin';
-- Should return 0 rows
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 9.2: SQL Injection Protection
**Priority:** CRITICAL

**Test Steps:**
1. Attempt SQL injection in subject field
2. Try malicious input in message body
3. Test email search filters

**Expected Results:**
- All inputs properly sanitized
- No SQL injection possible
- Parameterized queries used

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 9.3: Rate Limiting
**Priority:** MEDIUM

**Test Steps:**
1. Send multiple emails in quick succession
2. Verify rate limiting applied
3. Check reasonable limits enforced

**Expected Results:**
- Cannot send unlimited emails
- Rate limit message shown
- Prevents spam/abuse

**Database Verification:**
\`\`\`sql
-- Check email sending frequency
SELECT sent_by, COUNT(*) as email_count, 
       MIN(sent_at) as first_email, 
       MAX(sent_at) as last_email
FROM email_logs 
WHERE sent_at > NOW() - INTERVAL '1 hour'
GROUP BY sent_by;
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 10: Integration Tests

### Test Case 10.1: Email After User Creation
**Priority:** MEDIUM

**Test Steps:**
1. Admin creates new volunteer account
2. Welcome email automatically sent
3. Verify email delivered

**Expected Results:**
- Welcome email sent automatically
- Type = 'confirmation'
- Contains login instructions
- User receives email

**Database Verification:**
\`\`\`sql
-- Check welcome email sent after user creation
SELECT p.created_at, el.sent_at, el.subject
FROM profiles p
LEFT JOIN email_logs el ON el.recipient_id = p.id AND el.email_type = 'welcome'
WHERE p.created_at > NOW() - INTERVAL '1 hour'
ORDER BY p.created_at DESC;
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

### Test Case 10.2: Email After Shift Assignment
**Priority:** HIGH

**Test Steps:**
1. Admin assigns shift to volunteer
2. Confirmation email sent if enabled
3. Verify email content has shift details

**Expected Results:**
- Email sent if confirmations enabled
- Includes shift date, time, location
- Type = 'confirmation'

**Database Verification:**
\`\`\`sql
-- Check confirmation after assignment
SELECT sa.created_at, el.sent_at, s.shift_date, s.start_time
FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
LEFT JOIN email_logs el ON el.recipient_id = sa.user_id 
  AND el.email_type = 'confirmation'
  AND el.sent_at >= sa.created_at
WHERE sa.created_at > NOW() - INTERVAL '1 hour';
\`\`\`

**Actual Result:** ___________  
**Status:** [ ] PASS [ ] FAIL

---

## Test Execution Summary

**Total Test Cases:** 32  
**Passed:** _____  
**Failed:** _____  
**Blocked:** _____  
**Pass Rate:** _____%

### Critical Blockers
1. ___________
2. ___________

### Known Issues
1. ___________
2. ___________

### Fixes Applied
1. ___________
2. ___________

---

## Regression Suite Integration

Once all tests pass, add to master regression suite:

\`\`\`markdown
## Email Communication System Tests (Feature #2)
- 32 test cases covering send, templates, scheduling, integration
- All tests use live Supabase database
- Security verified for admin-only access
- Email service integration confirmed
- Status: ✅ 100% PASS
\`\`\`

---

## Production Readiness Checklist

- [ ] All 32 test cases passing
- [ ] Email service API key configured
- [ ] volunteer@vanderpumpdogs.org verified
- [ ] Email templates created
- [ ] Rate limiting implemented
- [ ] Error handling comprehensive
- [ ] Security audit completed
- [ ] Admin training completed

---

## Next Steps

1. Execute all 32 test cases systematically
2. Fix any failures identified
3. Rerun regression suite
4. Update master test report
5. Move to Feature #3: Enhanced Reporting & Analytics

**Status:** Ready for test execution
