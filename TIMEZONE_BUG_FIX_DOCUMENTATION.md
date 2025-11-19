# Timezone Bug Fix Documentation

## Issue Summary

The application was experiencing date discrepancies between different UI components (Calendar, My Schedule, Dashboard) where shifts would appear on different dates depending on the page. For example, a shift scheduled for Friday, Nov 14 AM would appear as Saturday, Nov 15 AM in some views.

## Root Cause

The bug was caused by JavaScript's handling of date strings when creating `Date` objects:

1. **Database Storage**: The `shift_date` column uses PostgreSQL's `date` type (not timestamp), storing dates as "YYYY-MM-DD" strings
2. **Timezone Interpretation**: When JavaScript parses a date string like `new Date("2025-11-14")`, it creates a Date object at midnight UTC
3. **Local Conversion**: When displayed using `toLocaleDateString()`, the UTC date converts to the user's local timezone, potentially shifting to the previous or next day

### Example of the Bug:
\`\`\`javascript
// User in PST (UTC-8)
const dateString = "2025-11-14" // Nov 14 in database
const date = new Date(dateString) // Creates Nov 14 00:00 UTC
// In PST, this is Nov 13 16:00 (previous day!)
date.toLocaleDateString() // Shows "11/13/2025"
\`\`\`

## Solution

Implemented timezone-neutral date handling by:

1. **Added `parseDate()` function**: Parses date strings as local dates without timezone conversion
   \`\`\`typescript
   export function parseDate(dateString: string): Date {
     const [year, month, day] = dateString.split('-').map(Number)
     return new Date(year, month - 1, day) // Local date, no timezone shift
   }
   \`\`\`

2. **Updated all date displays**: Replaced `new Date(dateString)` with `parseDate(dateString)` throughout:
   - `app/calendar/page.tsx` - Calendar shift displays
   - `app/my-schedule/page.tsx` - Schedule list and calendar exports
   - `app/volunteer/page.tsx` - Dashboard upcoming shifts

3. **Fixed calendar event creation**: Ensured `.ics` file generation uses local dates consistently

## Files Modified

- `lib/date.ts` - Added `parseDate()` helper function
- `app/calendar/page.tsx` - Fixed shift end time calculations and display
- `app/my-schedule/page.tsx` - Fixed date displays and calendar exports
- `app/volunteer/page.tsx` - Fixed dashboard shift date displays

## Testing Verification

After this fix, all components now consistently show shifts on the correct date:
- Calendar view shows shifts on the correct date
- My Schedule page displays the same dates
- Dashboard upcoming shifts match calendar dates
- Calendar exports (.ics files) create events on correct dates
- No 24-hour shift when adding/removing shifts

## Prevention

For future development:
- Always use `parseDate()` when converting database date strings to Date objects
- Never use `new Date(dateString)` with YYYY-MM-DD format from database
- Use `ymd()` when converting Date objects back to date strings for database queries
- Be mindful that `date` type columns don't include timezone information
