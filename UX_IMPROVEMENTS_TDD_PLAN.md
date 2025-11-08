# Feature #4: User Experience Improvements - TDD Test Plan

## Overview
Comprehensive test-driven development plan for implementing user experience enhancements including email notifications, calendar export, PWA features, and profile customization.

**Test Coverage**: 36 test cases across 8 test suites
**Success Criteria**: 100% test pass rate for production deployment

---

## Test Suite 1: Email Notifications (Automated)

### TC-UX-001: Shift Confirmation Email on Signup
**Priority**: HIGH | **Type**: Integration

**Prerequisites**:
- Email service configured (SendGrid or Gmail)
- User registered with email_opt_in = true

**Test Steps**:
1. Volunteer signs up for a shift
2. System sends confirmation email immediately
3. Check email_logs table for record

**Expected Outcomes**:
- ✅ Email sent within 30 seconds
- ✅ Email contains shift details (date, time, location)
- ✅ Email includes calendar attachment (.ics file)
- ✅ email_logs record created with status = 'sent'

**Database Verification**:
\`\`\`sql
SELECT * FROM email_logs 
WHERE recipient_email = 'volunteer@test.com'
AND email_type = 'shift_confirmation'
AND status = 'sent'
ORDER BY sent_at DESC LIMIT 1;
\`\`\`

---

### TC-UX-002: 24-Hour Shift Reminder Email
**Priority**: HIGH | **Type**: Automated

**Test Steps**:
1. Create shift for tomorrow at 9am
2. Assign volunteer to shift
3. Wait for automated reminder (or trigger manually for testing)
4. Check email_logs

**Expected Outcomes**:
- ✅ Email sent 24 hours before shift
- ✅ Email contains reminder message
- ✅ Email includes shift details and directions

**Database Verification**:
\`\`\`sql
SELECT * FROM email_logs 
WHERE email_type = 'shift_reminder'
AND sent_at >= NOW() - INTERVAL '1 hour';
\`\`\`

---

### TC-UX-003: Shift Cancellation Notification
**Priority**: HIGH | **Type**: Integration

**Test Steps**:
1. Volunteer cancels their shift
2. System sends cancellation confirmation
3. Admin receives notification of cancellation

**Expected Outcomes**:
- ✅ Volunteer receives cancellation confirmation
- ✅ Admin receives notification with volunteer details
- ✅ Both emails logged in email_logs

---

### TC-UX-004: Email Preference Respect
**Priority**: CRITICAL | **Type**: Security

**Test Steps**:
1. User sets email_opt_in = false
2. Sign up for shift
3. Verify no email sent

**Expected Outcomes**:
- ✅ No email sent to opted-out users
- ✅ No email_logs entry created

**Database Verification**:
\`\`\`sql
SELECT COUNT(*) FROM email_logs 
WHERE recipient_email = 'optedout@test.com';
-- Expected: 0
\`\`\`

---

## Test Suite 2: Calendar Export (iCal)

### TC-UX-005: Export Single Shift to Calendar
**Priority**: HIGH | **Type**: Functional

**Test Steps**:
1. Navigate to My Schedule
2. Click "Add to Calendar" on a shift
3. Download .ics file
4. Open in calendar app

**Expected Outcomes**:
- ✅ .ics file downloads successfully
- ✅ File contains correct event details
- ✅ Event imports to Google Calendar/Outlook

**Technical Validation**:
\`\`\`
BEGIN:VEVENT
SUMMARY:Volunteer Shift - Morning
DTSTART:20250115T090000Z
DTEND:20250115T120000Z
LOCATION:Vanderpump Dogs
DESCRIPTION:Your volunteer shift at Vanderpump Dogs
END:VEVENT
\`\`\`

---

### TC-UX-006: Export All Shifts to Calendar
**Priority**: MEDIUM | **Type**: Functional

**Test Steps**:
1. Navigate to My Schedule
2. Click "Export All Shifts"
3. Download .ics file with all upcoming shifts

**Expected Outcomes**:
- ✅ Single .ics file with multiple events
- ✅ All assigned shifts included
- ✅ Past shifts excluded

---

### TC-UX-007: Calendar Sync URL
**Priority**: MEDIUM | **Type**: Integration

**Test Steps**:
1. Generate personal calendar sync URL
2. Add URL to calendar app
3. Verify shifts appear automatically

**Expected Outcomes**:
- ✅ Unique secure URL generated per user
- ✅ URL returns valid iCal feed
- ✅ Calendar app syncs shifts automatically

---

## Test Suite 3: PWA Features

### TC-UX-008: Install as Progressive Web App
**Priority**: MEDIUM | **Type**: Functional

**Test Steps**:
1. Open app in Chrome/Safari
2. Click "Install App" prompt or menu
3. Launch installed PWA

**Expected Outcomes**:
- ✅ Install prompt appears
- ✅ App installs to home screen
- ✅ PWA launches in standalone mode
- ✅ App icon displays correctly

**Technical Files**:
- manifest.json exists
- Service worker registered
- Icons provided (192x192, 512x512)

---

### TC-UX-009: Offline Calendar Viewing
**Priority**: MEDIUM | **Type**: Performance

**Test Steps**:
1. Load My Schedule while online
2. Disconnect internet
3. Navigate to My Schedule again

**Expected Outcomes**:
- ✅ Previously viewed shifts still visible
- ✅ Cached data displayed correctly
- ✅ "Offline mode" indicator shown

---

### TC-UX-010: Push Notifications (if enabled)
**Priority**: LOW | **Type**: Optional

**Test Steps**:
1. Grant notification permission
2. Receive shift reminder notification
3. Click notification to open app

**Expected Outcomes**:
- ✅ Browser push notification appears
- ✅ Notification opens relevant page
- ✅ User can disable in settings

---

## Test Suite 4: Profile Customization

### TC-UX-011: Edit Profile Information
**Priority**: HIGH | **Type**: Functional

**Test Steps**:
1. Navigate to Profile page
2. Edit name, phone, email preferences
3. Save changes
4. Verify updates persist

**Expected Outcomes**:
- ✅ All fields editable
- ✅ Changes saved to database
- ✅ Success notification shown
- ✅ Updates reflected in header

**Database Verification**:
\`\`\`sql
SELECT name, phone, email_opt_in, email_categories
FROM profiles
WHERE id = '<user_id>';
\`\`\`

---

### TC-UX-012: Upload Profile Photo
**Priority**: LOW | **Type**: Enhancement

**Test Steps**:
1. Navigate to Profile
2. Upload profile photo
3. Verify photo appears in header

**Expected Outcomes**:
- ✅ Photo uploads successfully
- ✅ Photo stored in Supabase Storage
- ✅ Photo URL saved to profiles table
- ✅ Photo displays in 48x48px avatar

---

### TC-UX-013: Manage Email Preferences
**Priority**: HIGH | **Type**: Functional

**Test Steps**:
1. Navigate to Profile > Email Preferences
2. Toggle specific email categories
3. Save preferences
4. Verify emails respect preferences

**Expected Outcomes**:
- ✅ All categories toggleable independently
- ✅ Changes persist across sessions
- ✅ System respects opt-outs

**Database Verification**:
\`\`\`sql
SELECT email_opt_in, email_categories
FROM profiles
WHERE id = '<user_id>';
\`\`\`

---

### TC-UX-014: Change Password
**Priority**: HIGH | **Type**: Security

**Test Steps**:
1. Navigate to Profile > Security
2. Enter current and new password
3. Save changes
4. Log out and log back in with new password

**Expected Outcomes**:
- ✅ Password changed successfully
- ✅ Must provide current password
- ✅ New password must meet requirements
- ✅ Can log in with new password

---

## Test Suite 5: Mobile Responsiveness

### TC-UX-015: Mobile Calendar View
**Priority**: HIGH | **Type**: Responsive

**Test Steps**:
1. Open calendar on mobile device
2. Navigate through months
3. Select date and view shifts

**Expected Outcomes**:
- ✅ Calendar grid readable on small screens
- ✅ Touch interactions work smoothly
- ✅ Shift details modal responsive

---

### TC-UX-016: Mobile My Schedule View
**Priority**: HIGH | **Type**: Responsive

**Test Steps**:
1. Open My Schedule on mobile
2. View upcoming shifts
3. Cancel a shift

**Expected Outcomes**:
- ✅ Shift cards stack vertically
- ✅ All information visible
- ✅ Actions easily tappable

---

### TC-UX-017: Mobile Profile Editing
**Priority**: MEDIUM | **Type**: Responsive

**Test Steps**:
1. Edit profile on mobile device
2. Change preferences
3. Save changes

**Expected Outcomes**:
- ✅ Form fields appropriately sized
- ✅ Keyboard doesn't obscure inputs
- ✅ Save button always accessible

---

## Test Suite 6: Loading States and Feedback

### TC-UX-018: Loading Indicators
**Priority**: HIGH | **Type**: UX

**Test Steps**:
1. Navigate to calendar (slow connection)
2. Sign up for shift
3. Save profile changes

**Expected Outcomes**:
- ✅ Loading spinners shown during async operations
- ✅ Buttons disabled while loading
- ✅ No jarring layout shifts

---

### TC-UX-019: Success Notifications
**Priority**: HIGH | **Type**: UX

**Test Steps**:
1. Sign up for shift
2. Cancel shift
3. Update profile

**Expected Outcomes**:
- ✅ Toast notification appears
- ✅ Message is clear and concise
- ✅ Auto-dismisses after 3 seconds
- ✅ Can manually dismiss

---

### TC-UX-020: Error Messages
**Priority**: CRITICAL | **Type**: UX

**Test Steps**:
1. Try to sign up for full shift
2. Try to edit profile with invalid data
3. Lose internet connection during action

**Expected Outcomes**:
- ✅ Clear error message displayed
- ✅ Actionable guidance provided
- ✅ User can retry action

---

## Test Suite 7: Accessibility

### TC-UX-021: Keyboard Navigation
**Priority**: HIGH | **Type**: A11y

**Test Steps**:
1. Navigate entire app using only keyboard
2. Tab through calendar
3. Submit forms with Enter key

**Expected Outcomes**:
- ✅ All interactive elements reachable
- ✅ Focus indicators visible
- ✅ Logical tab order
- ✅ Modals trappable with Tab

---

### TC-UX-022: Screen Reader Support
**Priority**: HIGH | **Type**: A11y

**Test Steps**:
1. Enable screen reader (NVDA/VoiceOver)
2. Navigate calendar
3. Sign up for shift

**Expected Outcomes**:
- ✅ All content announced correctly
- ✅ ARIA labels present
- ✅ Form errors announced
- ✅ Loading states announced

---

### TC-UX-023: Color Contrast
**Priority**: MEDIUM | **Type**: A11y

**Test Steps**:
1. Check all text elements with contrast checker
2. Test in high contrast mode
3. Verify shift status colors distinguishable

**Expected Outcomes**:
- ✅ All text meets WCAG AA (4.5:1 ratio)
- ✅ Interactive elements meet AA (3:1 ratio)
- ✅ Status indicators not color-only

---

## Test Suite 8: Performance

### TC-UX-024: Calendar Load Time
**Priority**: HIGH | **Type**: Performance

**Test Steps**:
1. Clear cache
2. Load calendar page
3. Measure time to interactive

**Expected Outcomes**:
- ✅ Initial load < 2 seconds
- ✅ Month navigation < 300ms
- ✅ Smooth animations (60fps)

---

### TC-UX-025: My Schedule Load Time
**Priority**: HIGH | **Type**: Performance

**Test Steps**:
1. Load My Schedule with 20+ shifts
2. Measure render time
3. Test scrolling performance

**Expected Outcomes**:
- ✅ Renders in < 1 second
- ✅ Smooth scrolling
- ✅ No memory leaks

---

### TC-UX-026: Image Optimization
**Priority**: MEDIUM | **Type**: Performance

**Test Steps**:
1. Upload profile photo
2. Check file size and format
3. Verify lazy loading

**Expected Outcomes**:
- ✅ Images compressed automatically
- ✅ WebP format served when supported
- ✅ Images lazy load below fold

---

## Integration Tests

### TC-UX-027: End-to-End Volunteer Flow
**Priority**: CRITICAL | **Type**: Integration

**Test Steps**:
1. Sign up as new volunteer
2. Browse calendar and sign up for shift
3. Receive confirmation email
4. View shift in My Schedule
5. Export to calendar
6. Receive 24-hour reminder
7. Cancel shift
8. Receive cancellation email

**Expected Outcomes**:
- ✅ All steps complete successfully
- ✅ Emails sent at appropriate times
- ✅ Data consistent across all views

---

### TC-UX-028: Email Notification Flow
**Priority**: HIGH | **Type**: Integration

**Test Steps**:
1. Configure email service
2. Sign up for multiple shifts
3. Verify all confirmation emails received
4. Wait for reminders (or simulate)
5. Cancel one shift
6. Verify cancellation email

**Expected Outcomes**:
- ✅ All emails delivered successfully
- ✅ Correct templates used
- ✅ Variables populated correctly
- ✅ email_logs updated accurately

---

## Security Tests

### TC-UX-029: Calendar URL Security
**Priority**: CRITICAL | **Type**: Security

**Test Steps**:
1. Generate personal calendar URL
2. Attempt to access another user's URL
3. Verify authorization required

**Expected Outcomes**:
- ✅ URLs use secure tokens
- ✅ Cannot guess other users' URLs
- ✅ Expired tokens rejected

---

### TC-UX-030: Profile Update Authorization
**Priority**: CRITICAL | **Type**: Security

**Test Steps**:
1. As User A, attempt to update User B's profile
2. Verify request blocked

**Expected Outcomes**:
- ✅ Can only update own profile
- ✅ Server-side validation enforced
- ✅ Error message appropriate

---

## Regression Integration

### TC-UX-031: Full Regression Suite
**Priority**: CRITICAL | **Type**: Regression

**Test Steps**:
1. Run all Feature #1, #2, #3 tests
2. Verify no regressions introduced
3. Check database migrations applied

**Expected Outcomes**:
- ✅ All previous tests still pass
- ✅ No performance degradation
- ✅ Database schema compatible

---

## Implementation Priority

### Phase 1 (Must Have - Deploy to Production)
1. ✅ Email notifications (confirmation, reminder, cancellation)
2. ✅ Calendar export (.ics download)
3. ✅ Profile editing
4. ✅ Mobile responsiveness
5. ✅ Loading states and error handling

### Phase 2 (Should Have - Next Sprint)
6. ⏳ PWA installation
7. ⏳ Calendar sync URL
8. ⏳ Push notifications
9. ⏳ Profile photos
10. ⏳ Advanced accessibility

### Phase 3 (Nice to Have - Future)
11. 📋 Offline mode
12. 📋 Advanced calendar views
13. 📋 Custom notification schedules

---

## Test Execution Tracking

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| TC-UX-001 | Shift confirmation email | ⏳ PENDING | Requires email service |
| TC-UX-002 | 24-hour reminder | ⏳ PENDING | Automated job needed |
| TC-UX-003 | Cancellation notification | ⏳ PENDING | Requires email service |
| TC-UX-004 | Email preference respect | ⏳ PENDING | Security critical |
| TC-UX-005 | Export single shift | ⏳ PENDING | iCal generation |
| TC-UX-006 | Export all shifts | ⏳ PENDING | Bulk export |
| TC-UX-007 | Calendar sync URL | ⏳ PENDING | Phase 2 |
| TC-UX-008 | PWA install | ⏳ PENDING | Phase 2 |
| TC-UX-009 | Offline viewing | ⏳ PENDING | Phase 3 |
| TC-UX-010 | Push notifications | ⏳ PENDING | Phase 3 |
| TC-UX-011 | Edit profile | ⏳ PENDING | Core feature |
| TC-UX-012 | Upload photo | ⏳ PENDING | Phase 2 |
| TC-UX-013 | Email preferences | ⏳ PENDING | Core feature |
| TC-UX-014 | Change password | ⏳ PENDING | Security |
| TC-UX-015-017 | Mobile responsiveness | ⏳ PENDING | Core feature |
| TC-UX-018-020 | UI feedback | ⏳ PENDING | Already implemented |
| TC-UX-021-023 | Accessibility | ⏳ PENDING | Compliance |
| TC-UX-024-026 | Performance | ⏳ PENDING | Optimization |
| TC-UX-027-028 | Integration tests | ⏳ PENDING | E2E validation |
| TC-UX-029-030 | Security tests | ⏳ PENDING | Critical |
| TC-UX-031 | Regression suite | ⏳ PENDING | Full validation |

---

## Success Metrics

**Feature Adoption**:
- 80%+ users enable email notifications
- 50%+ users export calendar
- 90%+ mobile usability score

**Performance**:
- < 2s page load time
- < 300ms interaction response
- 100/100 Lighthouse score

**Quality**:
- 100% test pass rate
- Zero critical bugs
- WCAG AA compliance

---

## Notes

- Email notifications require configured email service (SendGrid/Gmail)
- Calendar export uses standard iCal format for compatibility
- PWA features require HTTPS and service worker
- All features must maintain security and data privacy
- Mobile-first design approach mandatory
