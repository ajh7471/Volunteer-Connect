# CLAUDE.md - Volunteer Connect

## Project Overview

Volunteer Connect is a full-stack volunteer management system built for the Vanderpump Dogs Foundation. It provides shift scheduling, email communications, reporting, and administrative tools for managing volunteers.

**Version**: 1.6.2
**Status**: Production (deployed on Vercel)
**Production branch**: `Vanderpump`

## Tech Stack

- **Framework**: Next.js 14.2 (App Router, Server Components)
- **Language**: TypeScript 5, React 19
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth with role-based access (admin/volunteer)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style, Radix UI primitives)
- **Testing**: Vitest 2.1 with v8 coverage
- **Package Manager**: pnpm
- **Deployment**: Vercel

## Commands

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build (runs ESLint + TypeScript checks)
pnpm lint             # Run ESLint
pnpm test             # Run all tests (vitest run)
pnpm test:watch       # Tests in watch mode
pnpm test:ui          # Tests with browser UI dashboard
pnpm test:coverage    # Tests with v8 coverage report
```

## Project Structure

```
app/                    # Next.js App Router pages and API routes
  admin/                # Admin dashboard (users, shifts, emails, reports, settings)
    actions.ts          # User management server actions
    email-actions.ts    # Email system server actions
    reporting-actions.ts
    shift-management-actions.ts
  api/                  # REST API routes (session management, tests)
  auth/                 # Auth pages (login, signup, forgot password)
  calendar/             # Calendar view
  my-schedule/          # User's personal schedule
  profile/              # User profile
  volunteer/            # Volunteer dashboard
  components/           # App-level components
  layout.tsx            # Root layout
  globals.css           # Global styles
components/             # Reusable components
  ui/                   # shadcn/ui components (do not edit directly)
  calendar/             # Calendar-specific components
lib/                    # Utilities and shared logic
  supabase/             # Supabase client management
    client.ts           # Browser client (singleton)
    server.ts           # Server client (cookie-aware)
    admin.ts            # Admin client (service role)
    config.ts           # Config validation & caching
  shifts.ts             # Shift data access layer
  calendar-export.ts    # iCal export
  date.ts               # Date utilities
  useSession.ts         # Auth session hook
  utils.ts              # General utilities (cn helper, etc.)
types/                  # TypeScript type definitions
  database.ts           # Supabase database schema types
hooks/                  # React custom hooks
scripts/                # SQL migrations (001-030) and utility scripts
__tests__/              # Test files
  setup.ts              # Global test setup (stubs env vars)
middleware.ts           # Auth routing middleware
```

## Architecture Patterns

### Supabase Client Usage

Three client types exist — use the correct one for the context:

```typescript
// Client components (browser)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Server components, server actions, route handlers
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // note: async

// Admin operations (bypasses RLS)
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
```

### Server Actions

Files named `*-actions.ts` with `"use server"` directive at top. Pattern:
- Verify user role before sensitive operations
- Call `revalidatePath()` after mutations
- Return `{ success: boolean, error?: string }`

### Authentication & Routing

- `middleware.ts` handles route protection and role-based redirects
- Admin routes (`/admin/*`) require admin role in profiles table
- Protected routes: `/calendar`, `/my-schedule`, `/profile`, `/volunteer`
- Unauthenticated users can only access `/` and `/auth/*`

### Data Fetching

- Server-side: Direct Supabase queries
- Client-side: SWR for caching and revalidation
- No global state management library — server state preferred

## Code Conventions

- **Files/folders**: kebab-case (`email-actions.ts`, `shift-templates/`)
- **Functions**: camelCase
- **Components**: PascalCase
- **Types/Interfaces**: PascalCase
- **Path aliases**: `@/*` maps to project root
- **Icons**: lucide-react
- **Classnames**: Use `cn()` from `lib/utils.ts` for conditional Tailwind classes

## Testing

Tests live in `__tests__/` and use Vitest with Node.js environment. Each test file is isolated (module isolation enabled).

**Key patterns**:
- Mock Supabase clients with `vi.mock()`
- Define fixture data at top of test files
- Reset mocks in `beforeEach()`
- Organize with `describe()` blocks per function

**Test files match**: `__tests__/**/*.{test,spec}.{ts,tsx}`
**Coverage includes**: `lib/**`, `app/admin/**`

## Environment Variables

Required (set in `.env.local` for dev, Vercel dashboard for prod):

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Admin operations key |

## Database

PostgreSQL via Supabase with Row Level Security on all tables.

**Core tables**: `profiles`, `shifts`, `shift_assignments`, `email_logs`, `email_templates`, `scheduled_emails`, `email_blocklist`

**Advanced tables**: `shift_templates`, `shift_waitlist`, `shift_swap_requests`, `user_preferences`, `calendar_sync_tokens`, `sessions`, `notification_queue`

**Views**: `volunteer_attendance_view`, `shift_statistics_view`

Migrations are in `scripts/` numbered 001-030.

## Important Notes

- `strict` mode is off in tsconfig — be mindful of null checks
- shadcn/ui components in `components/ui/` are generated — modify with care
- The production branch is `Vanderpump`, not `main`
- Security headers are applied via middleware and `next.config.mjs`
- Console logs use `[v0]` prefix for custom application logic
