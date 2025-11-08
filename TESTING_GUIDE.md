# Testing Guide for Volunteer Connect

## Mock Data Overview

The application includes comprehensive mock data to test volunteer and admin workflows. The mock data script (`scripts/008_comprehensive_mock_data.sql`) creates:

- **270+ shifts** spanning January 2025 - March 2025 (future shifts)
- **84 historical shifts** from 2024 (past shifts for reporting)
- **Variable capacities**: 4-8 volunteers per shift based on day/time
- **Different shift types**: AM (7am-12pm), MID (12pm-5pm), PM (5pm-9pm)

## Creating Test Users

Since Supabase Auth manages user authentication, you need to create test users through the signup flow:

### Test User Accounts to Create

#### 1. Admin Users (create 2)
\`\`\`
Admin 1:
- Name: Sarah Martinez
- Email: admin1@volunteerconnect.test
- Phone: (555) 101-2001
- Password: Admin123!
- Role: After signup, manually set role to 'admin' in Supabase dashboard

Admin 2:
- Name: Michael Chen
- Email: admin2@volunteerconnect.test
- Phone: (555) 101-2002
- Password: Admin123!
- Role: Manually set to 'admin'
\`\`\`

#### 2. Active Volunteers (create 5-8)
\`\`\`
Volunteer 1:
- Name: Emma Johnson
- Email: emma.j@test.com
- Phone: (555) 201-3001
- Password: Test123!

Volunteer 2:
- Name: James Wilson
- Email: james.w@test.com
- Phone: (555) 201-3002
- Password: Test123!

Volunteer 3:
- Name: Sofia Rodriguez
- Email: sofia.r@test.com
- Phone: (555) 201-3003
- Password: Test123!

(Continue with more as needed)
\`\`\`

#### 3. New Volunteers (create 2-3)
For testing the new user experience:
\`\`\`
New Volunteer 1:
- Name: Alex Thompson
- Email: alex.t@test.com
- Phone: (555) 301-4001
- Password: Test123!
\`\`\`

## Manual Role Assignment

After creating test users through signup:

1. Go to Supabase Dashboard → Table Editor → `profiles` table
2. Find the user profiles you want to make admins
3. Edit the `role` field from `volunteer` to `admin`
4. Save changes

## Testing Workflows

### Volunteer Workflows

#### 1. New Volunteer Onboarding
- Sign up with a new account
- Verify email confirmation (check Supabase Auth logs)
- Log in to the calendar
- Browse available shifts
- Sign up for first shift

#### 2. Shift Management
- View monthly calendar
- Sign up for available shifts (green when enrolled)
- View "My Schedule" page
- Leave/cancel shifts
- Try to join full shifts (should be blocked)

#### 3. Team Coordination
- View day roster to see who else is volunteering
- Check multiple shifts on same day
- Test capacity limits

### Admin Workflows

#### 1. Shift Creation & Management
- Navigate to Admin page
- Use "Seed Month" button to create shifts for new months
- Select specific dates
- View volunteer assignments for each shift
- Use DirectoryPicker to assign volunteers manually

#### 2. Volunteer Management
- View all volunteers in directory picker
- Search volunteers by name or phone
- Assign volunteers to specific shifts
- Remove volunteer assignments
- Monitor shift capacity

#### 3. Reporting & Oversight
- View day rosters for specific dates
- Check volunteer participation across shifts
- Monitor shift fill rates
- Review historical data

## Edge Cases to Test

### Capacity Testing
1. Fill a shift to capacity as volunteer
2. Try to join full shift (should show gray/disabled)
3. Admin can still assign to full shifts
4. Leave shift and verify spot opens up

### Concurrent Operations
1. Multiple volunteers joining same shift simultaneously
2. Admin assigning while volunteer is signing up
3. Last spot being taken by two users at once

### Date/Time Scenarios
1. Past shifts (should be viewable but not editable)
2. Current day shifts
3. Future shifts (next 3 months)
4. Month boundaries (end of month → start of next)

### Authentication & Permissions
1. Unauthenticated user trying to access calendar (should redirect)
2. Regular volunteer trying to access admin page (should redirect or show error)
3. Admin accessing all features
4. Session expiration and re-authentication

### Mobile Responsiveness
1. Test calendar grid on mobile (2-column layout)
2. Hamburger menu on mobile
3. Touch targets for shift buttons
4. Admin page stacked layout on small screens

## Data Scenarios Covered

The mock data provides:

- **Empty shifts**: No volunteers signed up (most shifts initially)
- **Partially filled**: 1-2 volunteers (after manual testing)
- **Nearly full**: Capacity - 1 (test "almost full" state)
- **Full shifts**: At capacity (test blocking new signups)
- **Weekend vs weekday**: Different capacities
- **Multiple months**: Test month navigation
- **Historical data**: Past shifts for reporting

## Cleanup & Reset

To reset test data:

\`\`\`sql
-- Clear all assignments
TRUNCATE shift_assignments CASCADE;

-- Clear future shifts only (keep structure)
DELETE FROM shifts WHERE shift_date >= CURRENT_DATE;

-- Re-run the seed script
-- Execute scripts/008_comprehensive_mock_data.sql
\`\`\`

To remove test users:
1. Go to Supabase Dashboard → Authentication → Users
2. Delete test user accounts
3. Profiles will be automatically cleaned up via cascade delete

## Performance Testing

With the mock data, you can test:
- Calendar loading with 90 shifts per month
- Filtering and sorting large volunteer lists
- Real-time updates when multiple users interact
- Database query performance with JOIN operations
- RLS policy enforcement with multiple users
