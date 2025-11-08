# Calendar Component Implementation Plan
## Comprehensive Development, Testing & Validation Plan

**Objective**: Build a production-ready calendar component that achieves 100% test pass rate (TC-014, TC-015) and enables complete volunteer workflow.

---

## PHASE 1: DESIGN & ARCHITECTURE (COMPLETED)

### Design Brief (Generated)
**Aesthetic**: Clean, modern calendar inspired by Airbnb's booking calendar
- **Color Scheme**: 
  - Primary: Blue (#3b82f6) for selected dates
  - Success: Green (#10b981) for available shifts
  - Warning: Orange (#f59e0b) for nearly full shifts
  - Destructive: Red (#ef4444) for full shifts
  - Neutral: Slate grays for backgrounds
  
- **Typography**:
  - Headers: Bold, sans-serif (16-18px)
  - Day numbers: Medium weight (14px)
  - Status indicators: Small (12px)
  
- **Layout Strategy**:
  - Mobile: Single month view, stacked shift indicators
  - Tablet: Single month with expanded shift details
  - Desktop: Month view with side panel for shift details

### Key Design Patterns Identified
1. **Monthly Grid**: 7-column grid (Sun-Sat) with 5-6 rows
2. **Day Cell Composition**:
   - Date number (top)
   - 3 shift indicators (AM/MID/PM) as colored dots/badges
   - Hover state reveals shift details
3. **Visual Capacity Indicators**:
   - Green dot: Available (>50% capacity remaining)
   - Orange dot: Nearly full (20-50% capacity)
   - Red dot: Full (0% capacity)
   - Gray dot: No shift created
4. **Navigation**: Month/Year dropdowns with prev/next arrows
5. **Responsive Breakpoints**: 
   - Mobile: <768px (compact view)
   - Tablet: 768-1024px (comfortable view)
   - Desktop: >1024px (full view with details panel)

---

## PHASE 2: DATABASE & API LAYER

### Required Queries
\`\`\`sql
-- Query 1: Get all shifts for a month with assignment counts
SELECT 
  s.id,
  s.shift_date,
  s.slot,
  s.capacity,
  COUNT(sa.id) as assignments_count
FROM shifts s
LEFT JOIN shift_assignments sa ON s.id = sa.id
WHERE s.shift_date >= '2025-02-01' 
  AND s.shift_date <= '2025-02-28'
GROUP BY s.id, s.shift_date, s.slot, s.capacity
ORDER BY s.shift_date, s.slot;

-- Query 2: Check if user is assigned to specific shift
SELECT sa.id 
FROM shift_assignments sa
WHERE sa.shift_id = $shiftId 
  AND sa.user_id = $userId;

-- Query 3: Get user's assignments for month (for My Schedule page)
SELECT 
  s.shift_date,
  s.slot,
  s.start_time,
  s.end_time,
  sa.id as assignment_id
FROM shift_assignments sa
JOIN shifts s ON sa.shift_id = s.id
WHERE sa.user_id = $userId
  AND s.shift_date >= $startDate
  AND s.shift_date <= $endDate
ORDER BY s.shift_date, s.slot;
\`\`\`

### API Functions Needed
\`\`\`typescript
// lib/shifts.ts
export async function getMonthShifts(year: number, month: number)
export async function signUpForShift(shiftId: string, userId: string)
export async function cancelShiftSignup(assignmentId: string)
export async function getUserAssignments(userId: string, startDate: string, endDate: string)
\`\`\`

---

## PHASE 3: COMPONENT DEVELOPMENT

### File Structure
\`\`\`
/app
  /calendar
    page.tsx          (Monthly calendar view - TC-014)
  /my-schedule
    page.tsx          (User's personal schedule - Related to TC-015)
  
/components
  /calendar
    MonthlyGrid.tsx   (Calendar grid component)
    DayCell.tsx       (Individual day cell with shift indicators)
    ShiftIndicator.tsx (Colored dot/badge for shift status)
    ShiftDetailsPanel.tsx (Side panel showing shift details on click)
    
/lib
  shifts.ts           (Shift query functions)
  calendar-utils.ts   (Calendar calculation helpers)
\`\`\`

### Component Hierarchy
\`\`\`
CalendarPage
├── MonthNavigator (Month/Year selector)
├── MonthlyGrid
│   └── DayCell (×35-42 cells)
│       ├── DateNumber
│       └── ShiftIndicators
│           ├── AMShiftIndicator
│           ├── MIDShiftIndicator
│           └── PMShiftIndicator
└── ShiftDetailsPanel (conditional)
    ├── ShiftInfo
    ├── AssignmentsList
    └── SignUpButton
\`\`\`

### Key Features Per Component

#### 1. `/app/calendar/page.tsx`
- Month/year navigation
- Fetch shifts for displayed month
- Pass data to MonthlyGrid
- Handle day cell clicks
- Responsive layout (grid on left, details on right for desktop)

#### 2. `MonthlyGrid.tsx`
- Render 7×6 grid of days
- Handle month boundaries (previous/next month days grayed out)
- Pass shift data to each DayCell
- Handle click events to show details

#### 3. `DayCell.tsx`
- Display date number
- Render 3 ShiftIndicators (AM/MID/PM)
- Apply visual states (today, selected, other month)
- Handle click to open details panel
- Tooltip on hover showing capacity

#### 4. `ShiftIndicator.tsx`
- Calculate capacity status (available/nearly-full/full/none)
- Render colored badge/dot
- Show capacity text on hover
- Handle click to filter shift details

#### 5. `ShiftDetailsPanel.tsx`
- Display selected date
- List all 3 shifts with details
- Show capacity for each
- "Sign Up" button (if space available)
- "Cancel" button (if already signed up)
- Real-time validation

#### 6. `/app/my-schedule/page.tsx`
- List user's upcoming shifts
- Calendar view highlighting assigned days
- Filter by month
- Export to iCal/Google Calendar (future)

---

## PHASE 4: TEST CASES MAPPING

### TC-014: View Calendar ✅
**Requirements**:
- Display monthly calendar view
- Navigate between months
- Show shift availability indicators
- Click on date to see shift details

**Implementation Checklist**:
- [x] Design brief generated
- [ ] MonthlyGrid component built
- [ ] Month navigation implemented
- [ ] Shift data fetching
- [ ] Visual capacity indicators
- [ ] Day cell click handler
- [ ] Details panel/modal

**Acceptance Criteria**:
1. Calendar displays current month by default
2. Previous/next month buttons work
3. Each day shows 3 shift indicators (AM/MID/PM)
4. Indicators use color coding (green/orange/red)
5. Clicking a day shows shift details
6. Responsive on mobile/tablet/desktop

---

### TC-015: Shift Capacity Indicators ✅
**Requirements**:
- Visual indicators for shift availability
- Color-coded status (available/nearly-full/full)
- Real-time capacity updates
- Clear visual differentiation

**Implementation Checklist**:
- [ ] Calculate capacity percentage
- [ ] Apply color rules:
  - Green: >50% available
  - Orange: 20-50% available
  - Red: 0% available (full)
  - Gray: No shift exists
- [ ] Hover tooltip showing "X of Y filled"
- [ ] Update indicators after signup/cancel
- [ ] Loading state during actions

**Acceptance Criteria**:
1. Capacity colors accurately reflect availability
2. Tooltip shows exact numbers (e.g., "3 of 4 filled")
3. Indicators update immediately after signup/cancel
4. Mobile-friendly touch targets (min 44px)
5. High contrast for accessibility

---

## PHASE 5: INTEGRATION POINTS

### 1. Authentication Integration
- User must be logged in to view calendar
- Use `RequireAuth` wrapper
- Pass `userId` to signup/cancel functions

### 2. Database Integration
- Query shifts table with RLS policies
- Insert into shift_assignments with validation
- Check user role for admin vs volunteer views

### 3. Admin Integration
- Link from admin shifts page to calendar
- Admin sees additional controls (edit capacity, etc.)
- Color-code admin-only features

### 4. Navigation Integration
- Update Header to highlight "Calendar" when active
- Add breadcrumbs: Home > Calendar > [Date]
- Deep linking: `/calendar?date=2025-02-15`

---

## PHASE 6: TESTING STRATEGY

### Unit Tests
\`\`\`typescript
// Test shift capacity calculation
test('getCapacityStatus returns correct status', () => {
  expect(getCapacityStatus(4, 1)).toBe('available') // 75% free
  expect(getCapacityStatus(4, 3)).toBe('nearly-full') // 25% free
  expect(getCapacityStatus(4, 4)).toBe('full') // 0% free
  expect(getCapacityStatus(4, 0)).toBe('available') // 100% free
})

// Test date calculations
test('daysInGrid generates correct number of cells', () => {
  const days = daysInGrid(new Date(2025, 1, 1)) // Feb 2025
  expect(days.length).toBe(35) // or 42 depending on month
})
\`\`\`

### Integration Tests
\`\`\`typescript
// Test signup flow
test('user can sign up for available shift', async () => {
  // Mock user and shift data
  // Click shift indicator
  // Click "Sign Up" button
  // Verify assignment created
  // Verify indicator updates to show reduced capacity
})

// Test cancellation flow
test('user can cancel their signup', async () => {
  // Mock existing assignment
  // Click shift indicator
  // Click "Cancel" button
  // Confirm cancellation
  // Verify assignment deleted
  // Verify indicator updates
})
\`\`\`

### Manual Test Checklist
- [ ] Calendar loads with current month
- [ ] Navigate to previous month
- [ ] Navigate to next month
- [ ] Jump to specific month/year
- [ ] Click on past date (should show view-only)
- [ ] Click on future date with available shifts
- [ ] Sign up for shift (success case)
- [ ] Try to sign up when full (error case)
- [ ] Cancel existing signup
- [ ] View "My Schedule" page
- [ ] Test on mobile device (touch interactions)
- [ ] Test on tablet (medium viewport)
- [ ] Test on desktop (full features)
- [ ] Test with slow network (loading states)
- [ ] Test with admin account (admin features visible)

---

## PHASE 7: EDGE CASES & ERROR HANDLING

### Edge Cases to Handle
1. **No shifts exist for month**: Show "Seed This Month" prompt
2. **User double-clicks signup button**: Debounce button, show loading state
3. **Shift fills up while user viewing**: Refresh data, show "Shift just filled" message
4. **User already signed up**: Show "Cancel" instead of "Sign Up"
5. **User tries to sign up for past shift**: Disable button, show message
6. **User navigates away during signup**: Cancel pending request
7. **Network error during signup**: Retry logic, show error toast
8. **Month with 6 weeks**: Grid expands to 42 cells
9. **Leap year February**: Correct day count (29 days)
10. **Time zone issues**: Use UTC for shift_date, local time for display

### Error Messages
- "This shift is now full" (capacity exceeded)
- "You're already signed up for this shift"
- "Cannot sign up for past shifts"
- "Network error. Please try again."
- "Failed to load shifts. Refresh page."

---

## PHASE 8: RESPONSIVE DESIGN BREAKPOINTS

### Mobile (<768px)
- Single month view, full width
- Compact day cells (40px × 40px)
- Shift indicators as small dots (8px)
- Tap day to open bottom sheet with details
- Sticky month navigator at top

### Tablet (768px - 1024px)
- Larger day cells (60px × 60px)
- Shift indicators as labeled badges
- Details panel slides in from right
- Month navigator with dropdowns

### Desktop (>1024px)
- Full calendar grid on left (60% width)
- Persistent details panel on right (40% width)
- Hover tooltips on shift indicators
- Keyboard navigation support (arrow keys)

---

## PHASE 9: ACCESSIBILITY REQUIREMENTS

### WCAG 2.1 AA Compliance
- [ ] Color contrast ratio ≥4.5:1 for text
- [ ] Color not sole indicator (use icons + color)
- [ ] Keyboard navigation (Tab, Arrow keys, Enter)
- [ ] Screen reader labels for all interactive elements
- [ ] Focus indicators visible
- [ ] Touch targets ≥44px × 44px
- [ ] Alt text for visual indicators
- [ ] ARIA labels for dynamic content
- [ ] Skip navigation links

### Screen Reader Announcements
- "Calendar for February 2025"
- "Monday, February 3rd. Morning shift: 3 of 4 spots filled. Available."
- "Shift signup successful. You're now signed up for the morning shift on February 3rd."

---

## PHASE 10: PERFORMANCE OPTIMIZATION

### Data Fetching
- Fetch only visible month's shifts
- Prefetch adjacent months on hover
- Cache shift data for 5 minutes
- Use SWR for automatic revalidation

### Rendering
- Virtualize grid for very large date ranges (future)
- Memoize DayCell components
- Debounce month navigation
- Lazy load details panel

### Bundle Size
- Code-split calendar page
- Tree-shake unused date-fns functions
- Use native Intl.DateTimeFormat where possible

---

## PHASE 11: FINAL REGRESSION TEST EXECUTION

### Pre-Deployment Checklist
1. Run all 32 test cases from ADMIN_COMPREHENSIVE_TEST_PLAN.md
2. Verify TC-001 to TC-013 still pass (no regression)
3. Verify TC-014 and TC-015 now pass (new functionality)
4. Execute TC-016 to TC-032 (admin features, reports, etc.)
5. Generate final test report with 100% pass rate
6. Document any remaining "nice-to-have" features for backlog

### Test Execution Timeline
- **Day 1**: Build components (PHASE 3)
- **Day 2**: Integration & styling (PHASE 4-5)
- **Day 3**: Manual testing & bug fixes (PHASE 6)
- **Day 4**: Accessibility audit (PHASE 9)
- **Day 5**: Performance testing (PHASE 10)
- **Day 6**: Final regression tests (PHASE 11)
- **Day 7**: Deploy to production

---

## SUCCESS METRICS

### Quantitative Metrics
- ✅ 100% test pass rate (32/32 tests)
- ✅ <2s page load time
- ✅ <100ms interaction response time
- ✅ 0 critical accessibility violations
- ✅ >4.5:1 color contrast ratio
- ✅ <200KB bundle size for calendar page

### Qualitative Metrics
- ✅ Intuitive navigation (user testing)
- ✅ Clear visual hierarchy
- ✅ Consistent with existing design system
- ✅ Positive volunteer feedback
- ✅ Admin approval for production release

---

## ROLLOUT PLAN

### Phase 1: Internal Testing (Week 1)
- Deploy to staging environment
- Admin and core volunteer testing
- Gather feedback, fix critical bugs

### Phase 2: Beta Release (Week 2)
- Invite 10-20 volunteers to use new calendar
- Monitor error rates and user feedback
- Iterate on UX issues

### Phase 3: Full Production (Week 3)
- Deploy to all users
- Monitor analytics and error tracking
- Prepare hotfix process for any issues

### Phase 4: Post-Launch (Week 4+)
- Collect user feedback
- Plan v2 features (recurring shifts, etc.)
- Optimize based on usage patterns

---

## IMPLEMENTATION BEGINS NOW

**Status**: Ready to implement
**Estimated Time**: 2-3 hours for core functionality
**Blockers**: None - all dependencies in place

Let's build the calendar! 🚀
\`\`\`

Now I'll implement the actual calendar component:
