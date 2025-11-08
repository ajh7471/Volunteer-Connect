# Production Setup Guide

## Overview
This guide ensures the production environment is correctly configured with:
- Admin user: volunteer@vanderpumpdogs.org
- Production shift schedule: 9am-12pm, 12pm-3pm, 3pm-5pm
- Real Supabase data (no mock/test data)

## Prerequisites Checklist

### 1. Admin User Setup
The admin user **volunteer@vanderpumpdogs.org** must be created through Supabase Auth:

**Option A: Manual Setup (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add User" > "Create new user"
4. Enter:
   - Email: `volunteer@vanderpumpdogs.org`
   - Password: `VolunteerAdmin2026`
   - Email Confirm: ✅ (mark as confirmed)
5. After creation, note the user's UUID
6. Update the `profiles` table:
   \`\`\`sql
   INSERT INTO profiles (id, name, phone, role, active)
   VALUES (
     '[USER_UUID_FROM_AUTH]',
     'Vanderpump Dogs Admin',
     '555-0100',
     'admin',
     true
   );
   \`\`\`

**Option B: SQL Script (If Supabase Admin API available)**
Run `scripts/012_production_admin_setup.sql` which will:
- Check if admin exists
- Create profile with admin role
- Set up proper permissions

### 2. Shift Schedule Configuration

**IMPORTANT**: The production shift schedule is:
- **Morning**: 9:00 AM - 12:00 PM
- **Midday**: 12:00 PM - 3:00 PM  
- **Afternoon**: 3:00 PM - 5:00 PM

The current mock data uses 8am-12pm, 12pm-4pm, 4pm-8pm. These need to be updated for production.

### 3. Database State Verification

Before deploying to production, verify:

**Check Admin User Exists:**
\`\`\`sql
SELECT p.id, p.name, p.role, p.active, au.email, au.email_confirmed_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'volunteer@vanderpumpdogs.org';
\`\`\`

Expected result:
- Role: `admin`
- Active: `true`
- Email confirmed: Not null

**Check Shift Schedule Function:**
\`\`\`sql
-- Verify the seed_shifts_range function uses correct times
SELECT prosrc FROM pg_proc WHERE proname = 'seed_shifts_range';
\`\`\`

Should show: 09:00:00, 12:00:00, 15:00:00, 17:00:00

**Check Existing Shifts:**
\`\`\`sql
SELECT shift_date, slot, start_time, end_time, capacity
FROM shifts
WHERE shift_date >= CURRENT_DATE
ORDER BY shift_date, slot
LIMIT 10;
\`\`\`

If shifts exist with wrong times (8am-12pm, 12pm-4pm, 4pm-8pm):
\`\`\`sql
-- Clear future shifts with incorrect times
DELETE FROM shifts WHERE shift_date >= CURRENT_DATE;
\`\`\`

## Production Deployment Steps

### Step 1: Run Production Setup Script
\`\`\`bash
# This updates shift times and verifies admin setup
npm run db:setup-production
\`\`\`

Or manually run: `scripts/012_production_admin_setup.sql`

### Step 2: Verify Environment Variables
Ensure these are set in Vercel/production:
- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` (for dev redirects)

### Step 3: Deploy Application
\`\`\`bash
# Deploy to Vercel
vercel --prod
\`\`\`

### Step 4: Post-Deployment Verification

**Test Admin Login:**
1. Navigate to `/auth/login`
2. Enter: volunteer@vanderpumpdogs.org / VolunteerAdmin2026
3. Verify redirect to `/admin` dashboard
4. Check dashboard shows correct statistics

**Test Shift Creation:**
1. Navigate to `/admin/shifts`
2. Select today's date
3. Click "Seed This Month"
4. Verify shifts show:
   - Morning: 9:00 AM - 12:00 PM
   - Midday: 12:00 PM - 3:00 PM
   - Afternoon: 3:00 PM - 5:00 PM

**Test Volunteer Workflow:**
1. Create a test volunteer account at `/auth/signup`
2. Login and navigate to `/calendar`
3. Verify shifts display with correct times
4. Test sign-up for a shift
5. Verify capacity updates correctly

### Step 5: Clean Up Test Data

**IMPORTANT**: Remove any test/mock data before going live:

\`\`\`sql
-- Remove test volunteer accounts (keep only admin)
DELETE FROM profiles 
WHERE role != 'admin' 
AND email NOT LIKE '%@vanderpumpdogs.org';

-- Remove old shift assignments
DELETE FROM shift_assignments 
WHERE shift_id IN (
  SELECT id FROM shifts WHERE shift_date < CURRENT_DATE
);

-- Optional: Remove very old historical shifts (keep last 30 days)
DELETE FROM shifts 
WHERE shift_date < CURRENT_DATE - INTERVAL '30 days';
\`\`\`

## Production Monitoring

### Key Metrics to Watch

1. **User Sign-ups**: Monitor new volunteer registrations
2. **Shift Fill Rate**: Track how quickly shifts reach capacity
3. **Active Users**: Weekly active volunteers
4. **Error Rates**: Monitor Vercel logs for errors

### Recommended Tools

- **Vercel Analytics**: Built-in performance monitoring
- **Sentry**: Error tracking (optional)
- **Supabase Dashboard**: Database performance and query monitoring

## Troubleshooting

### Admin Can't Login
- Verify email is confirmed in Supabase Auth
- Check password hasn't been changed
- Verify profile exists with role='admin'
- Check RLS policies allow admin access

### Shifts Show Wrong Times
- Run `SELECT * FROM shifts LIMIT 5` to verify times
- Re-run production setup script
- Clear existing shifts and re-seed

### Volunteers Can't Sign Up
- Check RLS policies on shift_assignments table
- Verify shift capacity hasn't been exceeded
- Check volunteer profile is active

## Support

For production issues:
1. Check Vercel deployment logs
2. Review Supabase logs for database errors
3. Verify all environment variables are set correctly
4. Contact support at: volunteer@vanderpumpdogs.org

---

**Last Updated**: 2025-01-08
**Production Ready**: ✅ Yes (after running setup scripts)
