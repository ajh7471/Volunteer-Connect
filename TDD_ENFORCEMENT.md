# Test-Driven Development (TDD) Enforcement Policy

## MANDATORY RULE: Test Before Code

**Every code change MUST follow this sequence:**
1. Write/update tests FIRST
2. Run tests (they should fail initially - Red)
3. Write minimal code to pass tests (Green)
4. Refactor while keeping tests passing (Refactor)
5. Run full regression suite
6. Deploy only if ALL tests pass

## Automatic Enforcement

This project uses automated TDD enforcement that runs on every build.

### Pre-Build Checks (BLOCKING)
- All functions have `@test-scope` comments
- Test coverage meets minimum 80% threshold
- All existing tests pass
- No regression detected

### Build-Time Validation
\`\`\`bash
npm run build
# Automatically runs: npm run test:pre-build
# Build FAILS if tests fail or coverage drops
\`\`\`

## Test Annotation Requirements

Every function MUST include these JSDoc comments:

\`\`\`typescript
/**
 * Brief description of what this function does
 * 
 * @test-scope: [Feature area this covers]
 * @test-requirements:
 *   - TC-XXX-001: [Specific test case requirement]
 *   - TC-XXX-002: [Another test case]
 * @test-edge-cases:
 *   - [Edge case scenario 1]
 *   - [Edge case scenario 2]
 * @test-dependencies: [Tables, APIs, external services this depends on]
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return value description
 */
\`\`\`

### Example - Well Documented Function:

\`\`\`typescript
/**
 * Assigns a volunteer to a specific shift with validation
 * 
 * Checks capacity, prevents duplicates, validates IDs, and creates
 * the assignment record in the database.
 * 
 * @test-scope: Shift assignment workflow
 * @test-requirements:
 *   - TC-ASSIGN-001: Successfully assign volunteer to available shift
 *   - TC-ASSIGN-002: Reject assignment to full capacity shift
 *   - TC-ASSIGN-003: Prevent duplicate assignments
 *   - TC-ASSIGN-004: Validate shift exists
 *   - TC-ASSIGN-005: Validate user exists and is active
 * @test-edge-cases:
 *   - Shift is at full capacity
 *   - Volunteer already assigned to this shift
 *   - Invalid shift ID (non-existent)
 *   - Invalid user ID (non-existent)
 *   - Inactive/deactivated user account
 *   - Database connection failure during insert
 *   - Concurrent assignment attempts
 * @test-dependencies: 
 *   - Database: shifts table, shift_assignments table, profiles table
 *   - Supabase RLS policies on shift_assignments
 * @param {string} shiftId - UUID of the shift to assign
 * @param {string} userId - UUID of the volunteer to assign
 * @returns {Promise<{success: boolean, error?: string}>} Assignment result
 */
async function assignVolunteerToShift(
  shiftId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Implementation with detailed inline comments...
  
  // Step 1: Validate input parameters
  if (!shiftId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }
  
  // Step 2: Check if shift exists and get current assignments
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('*, shift_assignments(*)')
    .eq('id', shiftId)
    .single()
  
  if (shiftError || !shift) {
    return { success: false, error: 'Shift not found' }
  }
  
  // Step 3: Validate capacity
  const currentAssignments = shift.shift_assignments?.length || 0
  if (currentAssignments >= shift.capacity) {
    return { success: false, error: 'Shift is at full capacity' }
  }
  
  // Step 4: Check for duplicate assignment
  const isDuplicate = shift.shift_assignments?.some(
    (assignment: any) => assignment.user_id === userId
  )
  if (isDuplicate) {
    return { success: false, error: 'Volunteer already assigned to this shift' }
  }
  
  // Step 5: Verify user exists and is active
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, active')
    .eq('id', userId)
    .single()
  
  if (userError || !user) {
    return { success: false, error: 'User not found' }
  }
  
  if (user.active === false) {
    return { success: false, error: 'Cannot assign inactive user' }
  }
  
  // Step 6: Create assignment record
  const { error: insertError } = await supabase
    .from('shift_assignments')
    .insert({ shift_id: shiftId, user_id: userId })
  
  if (insertError) {
    return { success: false, error: 'Failed to create assignment' }
  }
  
  return { success: true }
}
\`\`\`

## Test File Organization

\`\`\`
/tests
  /unit              # Individual function tests
  /integration       # Multi-component tests
  /e2e               # End-to-end user workflows
  /generated         # Auto-generated from @test-scope
  /fixtures          # Test data and mocks
\`\`\`

## Running Tests

\`\`\`bash
# Run all tests before coding
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate tests from code comments
npm run generate-tests

# Run full regression suite
npm run test:regression

# Check coverage
npm run test:coverage

# Pre-build validation (runs automatically)
npm run test:pre-build
\`\`\`

## TDD Workflow Example

### Scenario: Add "Email All Volunteers" feature

#### Step 1: Write Test First (Red)
\`\`\`typescript
// tests/unit/email-volunteers.test.ts
describe('emailAllVolunteers', () => {
  it('should send email to all opted-in volunteers', async () => {
    const result = await emailAllVolunteers({
      subject: 'Test',
      body: 'Hello',
      category: 'promotional'
    })
    expect(result.sent).toBe(5) // We have 5 opted-in volunteers
    expect(result.failed).toBe(0)
  })
  
  it('should respect opt-out preferences', async () => {
    const result = await emailAllVolunteers({
      subject: 'Test',
      body: 'Hello',
      category: 'promotional'
    })
    // User who opted out should not receive email
    const optedOutUser = await getUser('opted-out-id')
    expect(optedOutUser.emailsSent).toBe(0)
  })
  
  it('should handle email service failure gracefully', async () => {
    mockEmailService.mockRejection()
    const result = await emailAllVolunteers({
      subject: 'Test',
      body: 'Hello',
      category: 'urgent'
    })
    expect(result.error).toBeDefined()
    expect(result.sent).toBe(0)
  })
})
\`\`\`

#### Step 2: Run Tests (Should Fail)
\`\`\`bash
npm test
# FAIL: emailAllVolunteers is not defined
\`\`\`

#### Step 3: Write Minimal Code (Green)
\`\`\`typescript
/**
 * Sends email to all volunteers who opted into the specified category
 * 
 * @test-scope: Email communication system
 * @test-requirements:
 *   - TC-EMAIL-001: Send to opted-in volunteers only
 *   - TC-EMAIL-002: Respect category preferences
 *   - TC-EMAIL-003: Handle email service failures
 * @test-edge-cases:
 *   - No volunteers opted in
 *   - Email service unavailable
 *   - Invalid email addresses
 *   - Rate limiting
 * @test-dependencies: profiles table, email service API
 */
async function emailAllVolunteers(options: EmailOptions) {
  // Get volunteers who opted into this category
  const volunteers = await getOptedInVolunteers(options.category)
  
  let sent = 0
  let failed = 0
  
  for (const volunteer of volunteers) {
    try {
      await sendEmail(volunteer.email, options.subject, options.body)
      sent++
    } catch (error) {
      failed++
      console.error(`Failed to send to ${volunteer.email}:`, error)
    }
  }
  
  return { sent, failed }
}
\`\`\`

#### Step 4: Run Tests Again (Should Pass)
\`\`\`bash
npm test
# PASS: All tests passing ✓
\`\`\`

#### Step 5: Refactor & Run Regression
\`\`\`bash
npm run test:regression
# All 47 tests passed ✓
# Coverage: 87% ✓
\`\`\`

#### Step 6: Deploy
\`\`\`bash
npm run build
# Pre-build tests: PASSED ✓
# Coverage check: PASSED ✓
# Build: SUCCESS ✓
\`\`\`

## Coverage Requirements by Component

| Component Type | Min Coverage | Rationale |
|----------------|--------------|-----------|
| Authentication | 100% | Security critical |
| Database mutations | 95% | Data integrity critical |
| Admin operations | 90% | High-privilege actions |
| API routes | 90% | External interface |
| UI components | 80% | User-facing |
| Utility functions | 85% | Reused across app |
| Type definitions | N/A | Static checking |

## Enforcement Points

### 1. Pre-Commit Hook
\`\`\`bash
# .git/hooks/pre-commit
npm run test:quick
# Blocks commit if tests fail
\`\`\`

### 2. Pre-Build Script
\`\`\`bash
# package.json
"prebuild": "npm run test:pre-build"
# Blocks build if coverage < 80% or tests fail
\`\`\`

### 3. CI/CD Pipeline
\`\`\`yaml
# .github/workflows/test.yml
- name: Run Tests
  run: npm test
- name: Coverage Check
  run: npm run test:coverage
- name: Block Deploy
  if: failure()
\`\`\`

### 4. Code Review Checklist
- [ ] All new functions have @test-scope comments
- [ ] Tests written before implementation
- [ ] All tests passing
- [ ] Coverage maintained or increased
- [ ] Edge cases documented and tested

## Benefits of This Approach

1. **Living Documentation**: Code comments serve as both documentation and test specifications
2. **Continuous Learning**: Developers learn by reading comprehensive comments
3. **Automated Coverage**: System auto-generates tests from comments
4. **Quality Assurance**: Tests catch bugs before deployment
5. **Regression Prevention**: Full suite runs on every change
6. **Confidence**: Deploy knowing everything works

## Penalties for Non-Compliance

### Automated (System Enforced):
- Build fails if tests fail
- Build fails if coverage drops
- Commit blocked if quick tests fail
- Deployment prevented automatically

### Manual (Code Review):
- PR rejected if missing test annotations
- PR rejected if tests not updated
- PR rejected if new code has no tests

## Getting Help

### Resources:
- [Test Writing Guide](./TEST_WRITING_GUIDE.md)
- [Example Test Cases](./tests/examples/)
- [Comment Standards](./COMMENT_STANDARDS.md)
- [Coverage Reports](./coverage/)

### Questions?
- Check existing tests for patterns
- Review well-documented functions
- Ask during code review

---

**Remember**: 
- RED → GREEN → REFACTOR
- Test First, Code Second
- No Tests = No Deploy
- Comments Teach Everyone

---

*Last Updated: 2025*
*Version: 1.0*
