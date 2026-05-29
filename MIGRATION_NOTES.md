# MIGRATION_NOTES.md — Phase 0 Audit (Volunteer Connect → Volunteer Hub)

**Branch:** `chore/phase-0-audit`
**Date:** 2026-05-29
**Scope:** Read-only audit + staging setup. No schema changes, no app code changes, no refactors.
**Staging target:** Supabase project `volunteer-hub-staging` (staging only — production never touched).
**Package manager:** pnpm (detected from `pnpm-lock.yaml`).

> This document is the input to Phases 1–2. Where the live schema could not be reproduced (see Blockers), the tenant-table inventory is derived from `types/database.ts` + the SQL scripts, and that limitation is flagged.

---

## 0. Phase 0 task results (summary)

| Task | Result |
|---|---|
| 1. Install dependencies | ✅ `pnpm install` clean (exit 0) |
| 2. Replay `/scripts/*.sql` on staging | ⚠️ **2 of 24 scripts ran clean; 0 tables created** — base DDL missing (see Blocker B1) |
| 3. Boot app (dev) against staging | ✅ Boots; `/` (login) = HTTP 200, no server errors |
| 4. Test suite baseline | ⚠️ **0 discovered / exit 1** — `vitest.config.ts` misconfig (see Blocker B2) |
| 5. `MIGRATION_NOTES.md` | ✅ this file |

---

## 1. BLOCKERS / contradictions with SPEC.md  (read first)

### B1 — `/scripts` cannot reproduce the schema (HIGH)
Replaying all 24 `/scripts/*.sql` in numeric order against a fresh staging DB produced **0 public tables**. 22/24 failed with `relation "<table>" does not exist` (profiles, shifts, shift_assignments, shift_swap_requests, user_sessions, …).

**Cause:** the repo's scripts start at **`008_mock_data.sql`**. Scripts **001–007 (the base `CREATE TABLE` DDL) are absent.** Every later script assumes the core tables already exist.

**Contradicts SPEC.md:**
- §4 Phase 0: "run all `/scripts/*.sql` in order to reproduce the schema."
- §3: "DB is managed by numbered SQL scripts in `/scripts`."

**Impact:** Phase 1/2 cannot be built/tested on staging until the base schema exists there. Options (need your call, none done):
1. Locate/commit the missing `001–007` scripts, **or**
2. `[ALAN]`-approved **schema-only** export from the existing project (`supabase db dump --schema-only`) — note this reads production metadata (no row data); it is currently blocked by the hard rule + the prod-deny hook, so it needs your explicit go-ahead, **or**
3. Hand-write a consolidated baseline DDL from `types/database.ts` (effectively new schema work — belongs in Phase 1, not Phase 0).

### B2 — Test suite discovers 0 tests (HIGH)
`pnpm test` (`vitest run`) → **"No test files found, exiting with code 1."** Baseline = **0 passed / 0 failed**. 5 test files exist under `__tests__/` (`admin/actions.test.ts`, `admin/workflows.integration.test.ts`, `lib/calendar-export.test.ts`, `lib/date.test.ts`, `lib/shifts.test.ts`).

**Cause:** `vitest.config.ts` line 4 hardcodes `const ROOT = "/"`, used for `root`, the `@` alias, `setupFiles: ["/__tests__/setup.ts"]`, and `include: ["/__tests__/**/..."]`. On Windows `/` resolves to drive root `C:/`, so vitest searches `C:/__tests__` and finds nothing.

**Not fixed** (Phase 0 is read-only). **Must be fixed before Phase 2**, where SPEC.md makes `__tests__/rls/tenant-isolation.test.ts` a release blocker — that test can't run under the current config. Likely a one-line fix (`ROOT` → project dir / relative `__tests__/**`), to be done in a later phase with your approval.

### B3 — Script numbers 029 / 030 / 031 already taken (MEDIUM)
SPEC.md Phase 1 says create `scripts/029_multitenancy_core.sql`, Phase 2 `scripts/030_rls_tenant_isolation.sql`, Phase 10 `scripts/031_org_offboarding.sql`. **All three numbers already exist** in the repo:
- `029_check_triggers.sql`, `030_disable_trigger_set_admin.sql` (031 not present but next free).

**Recommendation:** start new multitenancy scripts at **`031_`** (next free) and renumber the spec's 029/030/031 → 031/032/033. Confirm before Phase 1.

### B4 — Spec's tenant-table list doesn't fully match the codebase (MEDIUM)
SPEC.md §2/§6 reference tables **`recurring_signups`** and **`reports`**. Neither exists in `types/database.ts` or the scripts. Recurrence lives in **`shift_templates`** (`days_of_week`, `recurrence_pattern`); reporting is via **views** (`shift_fill_rate`, `volunteer_attendance`), not a `reports` table. Phase 1's "repeat per table" loop should use the real table list in §2 below, not the spec's illustrative list.

### B5 — `types/database.ts` is hand-maintained, not generated (LOW/UNCERTAIN)
The file is plain hand-written interfaces (no Supabase codegen header). Because staging has no schema and prod is off-limits, **I could not diff it against a live schema.** Treat the §2 table list as "best available, possibly drifted." Regenerating types from a real schema (Phase 1, after B1) is the only way to be certain.

---

## 2. TENANT TABLES (source: `types/database.ts` + `/scripts`)

Every table below stores org-specific data and currently has **NO org/tenant column** — confirming SPEC.md §6's premise. Phase 1 adds `org_id uuid not null` + index + FK to each; Phase 2 adds RLS by `auth_org_id()`.

| # | Table | Holds | Existing org/tenant column? | Notes |
|---|---|---|---|---|
| 1 | `profiles` | users (volunteers/admins) | ❌ none | RLS join table — `auth_org_id()` reads `profiles.org_id`. Add first. |
| 2 | `shifts` | shift instances | ❌ none | |
| 3 | `shift_assignments` | volunteer↔shift signups | ❌ none | scope via own `org_id` (don't rely only on join) |
| 4 | `shift_templates` | recurring shift defs | ❌ none | holds recurrence (no separate `recurring_signups` table) |
| 5 | `waitlist_entries` | shift waitlists | ❌ none | |
| 6 | `emergency_coverage_requests` | last-minute coverage | ❌ none | |
| 7 | `email_logs` | sent-email audit | ❌ none | |
| 8 | `email_templates` | email templates | ❌ none | |
| 9 | `email_service_config` | per-deployment email creds (SendGrid/Gmail) | ❌ none | **per-org after migration**; holds secrets — review RLS + service-role carefully |
| 10 | `scheduled_emails` | queued/scheduled emails | ❌ none | |
| 11 | `notification_queue` | notification jobs | ❌ none | |
| 12 | `notification_preferences` | per-user notif settings | ❌ none | per-user → org via user |
| 13 | `calendar_exports` | ICS export log | ❌ none | per-user |
| 14 | `pwa_installations` | PWA install telemetry | ❌ none | per-user |
| 15 | `auth_blocklist` | blocked emails | ❌ none | ⚠️ decide: per-org or global? affects RLS design |
| 16 | `user_sessions` | custom session system | ❌ none | from `scripts/020_*`,`023_*`; not in `types/database.ts`. Confirm exact name in Phase 1. |

**Views (derived, not base tables):** `shift_fill_rate`, `volunteer_attendance` — will inherit isolation from underlying tables but re-verify after RLS.

**Open question for you:** `auth_blocklist` and `email_service_config` — are these per-org or platform-global? That decision changes their Phase 1/2 treatment.

---

## 3. HARDCODED "VANDERPUMP" REFERENCES

**Exact total:** `grep -ri vanderpump` (excluding `node_modules`) = **212 occurrences across 52 files.** SPEC.md's estimate of "~59 across ~10 files" matches the *runtime-UI* subset's file count but undercounts vs. total and overcounts the runtime occurrences (actual runtime ≈ 34). Breakdown by category:

### 3a. Runtime / UI source — the Phase 4 de-brand surface (34 occurrences, 10 files + 1 asset)
| File | Count | Lines |
|---|---|---|
| `app/page.tsx` | 10 | 133,134,142,157,168,169,176,206,207,216 |
| `app/about/page.tsx` | 5 | 14,15,26,45,234 |
| `app/my-schedule/page.tsx` | 5 | 238,239,268,269,276 |
| `public/manifest.json` | 4 | (name/short_name/description) |
| `app/layout.tsx` | 2 | 26,27 (page `<title>` + meta description) |
| `app/admin/emails/page.tsx` | 2 | 209,263 |
| `app/admin/settings/email-service/sendgrid-form.tsx` | 2 | 74,86 |
| `lib/calendar-export.ts` | 2 | 20 (`PRODID`), 33 (`UID @vanderpumpdogs.org`) |
| `app/auth/signup/page.tsx` | 1 | 212 |
| `app/admin/settings/email-service/gmail-form.tsx` | 1 | 98 |
| `public/images/vanderpump-dogs-logo.png` | (asset) | binary; referenced by `app/page.tsx`, `app/about/page.tsx` |

→ All become `org_settings` (display_name, logo_url, support_email, colors) in Phase 4.

### 3b. Test fixtures (16 occurrences — update when de-branding tests)
`app/tests/page.tsx` (6), `__tests__/lib/calendar-export.test.ts` (6), `__tests__/admin/workflows.integration.test.ts` (3), `lib/test-helpers.ts` (1).

### 3c. Seed / admin helper scripts (~30 occurrences)
`scripts/update-admin-email.ts` (6), `013_email_system_enhancements.sql` (6), `012_production_admin_setup.sql` (3), `024_create_admin_user.sql` (3), `reset-admin-password.ts.bak` (3), `025/026` (2 each), `027` (1), `create-admin-user.ts` (2), `create-admin-user-org.ts` (1), `create-fresh-admin.js` (1). Hardcoded admin email `admin@vanderpumpdogs.org` / `volunteer@vanderpumpdogs.org`.

### 3d. Docs / planning (informational — not shipped)
Remaining ~116 occurrences live in `*.md` (README 15, the `*_TEST_*`/`*_PRODUCTION_*` docs, `EMAIL_*`), plus our own planning files `Spec.md` (30) and `Claude-Code-Setup-Guide_Volunteer-Hub.md` (6). No action needed for the product; clean up opportunistically.

---

## 4. SUPABASE CLIENT MAP

Client files: `lib/supabase/{client,server,admin,config}.ts` + legacy `lib/supabaseClient.ts`.

| Client | File | Key used | Where imported |
|---|---|---|---|
| Browser (anon) | `lib/supabase/client.ts` | anon | via legacy `lib/supabaseClient.ts` wrapper |
| SSR server (anon, cookie session) | `lib/supabase/server.ts` | anon | admin server actions (`app/admin/*-actions.ts`), `app/api/session/*` routes, `middleware.ts` (inline `createServerClient`) |
| **Service role (RLS bypass)** | `lib/supabase/admin.ts` → `createAdminClient()` | **service_role** | documented **server-only** (file header SECURITY WARNING); singleton, `persistSession:false` |
| Config resolver | `lib/supabase/config.ts` | reads `SUPABASE_SERVICE_ROLE_KEY` | server util |

### ⚠️ Service-role-in-client-component check → **PASS (none found)**
- Searched all `.ts/.tsx` for `supabase/admin`, `createAdminClient`, `service_role`, `SERVICE_ROLE`.
- The **only** `import { createAdminClient } from '@/lib/supabase/admin'` is in **`docs/SUPABASE_CONFIGURATION.md:111` (documentation, not a component).**
- Runtime service-role usage is confined to server contexts:
  - `app/admin/actions.ts` — starts with `"use server"`; builds a service-role client inline.
  - `lib/supabase/admin.ts`, `lib/supabase/config.ts` — server utils.
  - `scripts/*.ts` — Node scripts (server).
  - Test stubs: `__tests__/setup.ts`, `vitest.config.ts`, `app/api/tests/run/route.ts` (stub key, fine).
- **No service-role key imported into any `"use client"` component.** Matches SPEC.md §7.2.

---

## 5. Environment / infra notes
- `.env.local` configured for staging (URL, anon, service_role, DATABASE_URL) and verified: REST 200 (anon + service_role), direct DB connect OK (Postgres 17.6). `.env*` is git-ignored.
- Pre-existing change from setup (before Phase 0 instruction): `pg` + `@types/pg` added as devDependencies (used to replay scripts against staging). Flagging so it's not mistaken for Phase 0 scope creep — remove if you want the manifest untouched.
- A throwaway script `_vh_phase0_runner.mjs` was used to replay SQL and then deleted (not committed).
