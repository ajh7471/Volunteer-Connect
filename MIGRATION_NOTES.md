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

---

## 6. SQL Provenance (added 2026-05-29)

### Origin of the schema
- **Scripts `001`–`007` were never committed to this repo.** The README documents `001_initial_schema.sql` ("Core tables"), but a full git-history search (282 commits, all branches) shows it never existed. The base tables (`profiles`, `shifts`, `shift_assignments`, …) were created **externally by the v0.dev platform / Supabase dashboard**, never synced to GitHub.
- The repo's committed scripts begin at `008` and assume those base tables already exist. Replaying them alone against a fresh DB yields **0 tables** (see Blocker B1).

### `000_baseline_schema.sql` — how it was produced
- **Reconstructed from the live production project on 2026-05-29**, under a one-time, owner-approved, **read-only, structure-only** exception to the production hard-rule. The global prod-deny guard (PreToolUse hook + auto-mode `hard_deny`) was temporarily lifted for this single task and **restored immediately after** (verified re-armed).
- Method: read-only catalog introspection via the authenticated Supabase MCP (`pg_get_constraintdef`, `pg_get_indexdef`, `pg_get_triggerdef`, `pg_get_functiondef`, `pg_policies`, `pg_get_viewdef`). **No row data was read or exported** — verified: 0 `COPY`, 0 top-level `INSERT`, 0 seeded data rows. (`db dump`/`pg_dump` were not usable — only API keys were available, not the prod DB password.)
- Captures: **20 tables, 1 enum (`email_status`), 1 view (`shift_fill_rates`), 68 constraints, 40 indexes, RLS enabled on all 20 tables, 43 policies, 24 app functions, 6 triggers** — including the Supabase `auth.users` trigger `on_auth_user_created → handle_new_user()`. Extensions: `citext`, `pgcrypto`, `uuid-ossp`. citext-extension internal functions are intentionally excluded (created by `CREATE EXTENSION`).

### Staging apply result
- Applying `000_baseline_schema.sql` to staging produced **20 tables, an exact match to production's 20-table list.** ✅
- Re-running `008`–`030` on top is **redundant and conflicts** (policy/function "already exists", missing `shift_swap_requests`), because the baseline already encodes the cumulative end-state of all prior migrations. **Resolution: `000_baseline` supersedes `001`–`007` AND the cumulative effect of `008`–`030`.** Treat `000_baseline` as the canonical schema going forward; the numbered scripts remain only as historical record.
- Side effect: mock-data scripts `008`/`009` inserted test rows into **staging** (sandbox; harmless).

### Superseded / stale scripts still present (NOT deleted — per instruction)
- `008_mock_data.sql` ⟶ superseded by `009_corrected_mock_data.sql`.
- Admin-role retry series: `024 → 025 → 026 → 027_set_admin_role_final → 028_bypass_rls_set_admin → 030_disable_trigger_set_admin` (iterative attempts at one task).
- `fix_volunteer_visibility_rls.sql` — unnumbered, out-of-sequence RLS patch.
- Deleted-in-history (informational): `007_day_roster_and_seed.sql`, `008_comprehensive_mock_data.sql`, `security_rls_fixes.sql` (the last created `auth_rate_limits` + `security_audit_log`, which **exist in prod** and are in the baseline, but the script is gone from the repo).

### Uncertainties / caveats (flagged, not assumed)
- The baseline is a **catalog reconstruction, not a literal `pg_dump`**. It omits: object ownership/grants, comments, and any objects outside `public` except the one `auth.users` trigger. Cross-checked by table count (20 = 20) and a clean apply, but not byte-identical to a `pg_dump`.
- `get_active_volunteers()` references a `volunteer_attendance` relation that **does not exist in prod** — carried over as-is (function body isn't validated at create time). Likely a latent bug in prod; flag for Phase 1.
- `types/database.ts` lists `WaitlistEntry` but the real table is `shift_waitlist`; reporting view is `shift_fill_rates` (plural). Use the baseline names.
- Recommend regenerating `types/database.ts` from staging (now that it has the schema) before Phase 1.

---

## 7. Finalizer outcomes (2026-05-29)

### Canonical pg_dump verification
- A canonical `pg_dump --schema-only` of prod was produced (by the owner, PG18 client) and structurally diffed against `000_baseline_schema.sql`.
- **Public schema matches exactly:** tables 20=20, functions 24=24, policies 43=43, triggers 6=6 (incl. `on_auth_user_created`), enum `email_status`, view `shift_fill_rates`, constraints 68=68, non-constraint indexes 40=40. **Diff empty.**
- The dump was a FULL-database dump (no `--schema public`), so it also carried Supabase-managed `auth`/`storage`/`realtime`/`vault` schemas. We did **NOT** adopt it as the baseline (committing those internals would clobber Supabase on a fresh project). `000_baseline_schema.sql` stays canonical — now **verified** against the authoritative dump. The temp dump lives at a local non-repo path and can be deleted.

### Staging drift removed (staging now == prod, object-level)
Re-running `008`–`030` on staging had introduced objects prod lacks. Dropped:
- View `public.volunteer_attendance` (created by `015`; prod only has `shift_fill_rates`).
- Event trigger `ensure_rls` + function `public.rls_auto_enable()` (an auto-RLS-on-new-tables helper from a repo RLS script; **prod does not have it**).
- Post-cleanup staging inventory: 20 tables / 1 view / 24 functions / 43 policies / 6 table-triggers / 6 event-triggers (Supabase defaults) — **identical to prod.**
- NOTE for Phase 1: the repo's auto-RLS event trigger (`rls_auto_enable`) is a real repo-vs-prod divergence. It would auto-enable RLS on any new `public` table — relevant when Phase 1 adds the `organizations`/`org_settings` tables. Decide intentionally whether to include it.

### Phase 0 acceptance criteria — now all confirmed
- App boots against staging: `next dev` ready ~6s; `/` (login page) = **HTTP 200**, title "Volunteer Hub - Vanderpump Dogs".
- Login UI renders (headless check): Email + Password fields, Sign In button, Forgot-password / Create-account links. No console errors (only 2 benign `<Image>` warnings).
- Test suite baseline: `pnpm test` (`vitest run`) → **0 passed / 0 failed — "No test files found", exit 1.** Root cause = `vitest.config.ts` `ROOT="/"` (Blocker B2); 5 test files exist but aren't discovered. NOT fixed (out of Phase 0 scope). **Must fix before Phase 2** (the RLS isolation test is a release blocker there).

---

## 8. Decisions locked for Phase 1 (owner, 2026-05-29)

1. **Script numbering: new multitenancy scripts start at `031`.** `029`/`030` are already taken (`029_check_triggers.sql`, `030_disable_trigger_set_admin.sql`). The Spec's `029_multitenancy_core` / `030_rls_tenant_isolation` / `031_org_offboarding` shift to **`031` / `032` / `033`**.
2. **Do NOT add the auto-RLS event trigger (`ensure_rls` / `rls_auto_enable`) to the build.** Rationale: it auto-enables RLS on any new `public` table, which would (a) fire on `organizations`/`org_settings` at unexpected moments and (b) mask whether the explicit policies are actually correct — a table could look secure because the trigger locked it, not because the policy works. Multi-tenancy RLS must be **explicit and test-proven per table** (Phase 2 isolation test). Prod doesn't have this trigger; keep it that way. (Already removed from staging.)
3. **`vitest.config.ts` (B2) fix = Phase 1 Step 0**, before any tenancy work, so the isolation test can run.
4. **Keep `types/database.ts` hand-written; defer the generated-types migration.** Converting the app from flat interfaces (`Profile`, `Shift`) to the generated `Database` shape is a repo-wide refactor with no multi-tenancy value. Write Phase 1 code against the existing hand-written types and extend them as needed; keep `types/database.generated.ts` as reference only. Revisit post-launch, if ever.

---

## 9. Phase 1 progress log

### Step 0 — vitest harness fixed; test baseline accepted (2026-05-29)
- **Blocker B2 fixed.** `vitest.config.ts` `ROOT` now derives from the config file's own directory (`path.dirname(fileURLToPath(import.meta.url))`) instead of the hardcoded `"/"` that resolved to `C:/` on Windows. `setupFiles` / `include` globs made root-relative. All 5 test files are now discovered and executed.
- **Accepted baseline: 134 / 138 tests passing** across 5 files (4 files green, 1 file with 4 failures). Owner accepted the 134/138 baseline on 2026-05-29.

#### Known pre-existing test failures — DEFERRED, do NOT fix on the Phase 1 critical path (owner decision 2026-05-29, "option B")
All 4 live in `__tests__/admin/workflows.integration.test.ts` and ran for the first time only after B2 was fixed (they were never executing before — so these are pre-existing latent issues, not regressions from the config change). The harness itself works; these do **not** block the Phase 2 RLS isolation test from being discovered/run.

| # | Test | Symptom | Diagnosis (category) |
|---|---|---|---|
| 1 | Flow 4 — blocked email enforcement | `result.success` was true, expected false | Integration in-memory mock doesn't wire `auth_blocklist` the way `actions.ts` queries it. The same guard **passes** in standalone `actions.test.ts`. → integration-mock fidelity, not a product bug. |
| 2 | Flow 5 — last-admin protection | `result.success` was true, expected false | Same pattern: the last-admin guard **passes** in standalone `actions.test.ts`; the integration mock's `profiles` count doesn't reflect it. → integration-mock fidelity. |
| 3 | Flow 1 — revoke re-opens shift | `db.assignments` length 2, expected 1 | Integration in-memory `db` mock doesn't reflect the delete performed by `revokeShiftFromUser`. → integration-mock fidelity. |
| 4 | Flow 9 — reporting period date math | got `0.9940476…` (= 167/168), expected `1` | DST spring-forward week: assertion does local-time `setDate(+7)` then divides elapsed ms by a fixed 168h. → DST-naive assertion bug in the test, not product code. |

**Resolution path (later, dedicated test-hardening pass — NOT started):** align the 3 integration-mock fixtures with the standalone unit-test mocks; make the Flow 9 assertion DST-aware (compare calendar dates, not raw milliseconds).

### Step 2 — multitenancy core applied + verified on staging (2026-05-29)
`scripts/031_multitenancy_core.sql` built and applied on a **clean rebuild** (reset → `000_baseline_schema.sql` alone → `031`) on staging `tgioxwjxxppjsjernhvt`. All schema checks + the Trap-2 function patches passed end-to-end. Classification built as approved:

- **TENANT, `org_id NOT NULL` (15):** profiles, shifts, shift_assignments, shift_templates, shift_waitlist, emergency_coverage_requests, email_logs, email_templates, scheduled_emails, notification_queue, notification_preferences, calendar_exports, email_service_config, user_sessions, **auth_blocklist** (PK widened `(email)` → `(org_id, email)`).
- **TENANT, `org_id` NULLABLE (3):** pwa_installations, security_audit_log, session_events (system / pre-auth / anonymous rows have no org).
- **GLOBAL, no `org_id` (2):** auth_rate_limits, session_config.
- **Trap 1 unique keys re-scoped:** `shifts (org_id, shift_date, slot)` (replaced the named constraint AND the duplicate `ux_shifts_date_slot` index), `shift_templates (org_id, name)`, `email_service_config (org_id, service_name)`, `shift_assignments (org_id, shift_id, user_id)`, `shift_waitlist (org_id, shift_id, user_id)`. `profiles` PK and `notification_preferences UNIQUE(user_id)` left as-is (one-user-one-org).
- **Trap 2 functions patched + proven end-to-end (rolled-back txns):** `handle_new_user` (profile gets org_id, default anchor), `create_notification_preferences` (inherits NEW.org_id), `schedule_shift_reminder` (notification_queue gets org_id), `process_waitlist`, `apply_shift_template` (+ ON CONFLICT `(org_id, shift_date, slot)`), `seed_shifts_range`, `handle_new_user_disabled` (dormant). Tests T1/T2/T3 all PASS, zero NOT NULL violations.
- `types/database.generated.ts` regenerated from staging (reference only; hand-written `types/database.ts` untouched per decision #4).
- Apply+verify ran via a throwaway harness `scripts/_phase1_apply_verify.mjs` (fail-closed staging guard) — **deleted, not committed** (same pattern as the Phase 0 runner).
- **Backfill note:** clean rebuild = empty tables, so "attribute Vanderpump data to …0001" was vacuous here; the function tests prove the org_id-population mechanism for new rows. The real row backfill happens in **Phase 9** when `031` runs on prod. **Recommend a data-backfill rehearsal** (seed mock data, then apply `031`) before the Phase 9 cutover.

### 🔴 Phase 2 MUST-FIX — cross-tenant RLS leaks in the baseline policies (flagged 2026-05-29)
The baseline RLS policies are **single-tenant** and will leak across orgs until Phase 2 rewrites them with `auth_org_id()`. Highest priority:

- **`security_audit_log`** — policy `audit_log_admin_read` is `FOR SELECT USING (profiles.role = 'admin')`, i.e. **any admin reads ALL orgs' audit rows**. Phase 2 MUST org-scope this (or lock it to service-role). *(Per owner instruction 2026-05-29.)*
- **`auth_blocklist`** — `blocklist_admin_only` (`USING is_admin()`) spans all orgs; org-scope it in Phase 2. The pre-auth trigger `block_blocklisted_auth_users()` still does a bare `email` lookup with no org context — its redesign is **deferred to Phase 5** (signup flow) per owner ruling.
- **`profiles` JWT-metadata admin policies (ultrareview #2)** — `profiles_admin_read_all` and `profiles_admin_update_all` gate on `auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'`, NOT `is_admin()`, so the "general pattern" bullet below does NOT cover them. Two problems: (a) tenant-blind, so a Vanderpump admin's JWT reads/updates every org's profiles; (b) `user_metadata` is end-user-writable, so any user can self-set `role='admin'` and read/modify all profiles in all tenants. Because `profiles` is the RLS join table `auth_org_id()` resolves against, this breaks the whole isolation model. Phase 2 (`032`) MUST drop the JWT-claim check entirely, rebuild admin access on server-side `is_admin()` AND org-scope it (`org_id = auth_org_id() AND is_admin()`), and the isolation test MUST assert a user who sets `user_metadata.role='admin'` cannot read another org's profiles.
- **General pattern:** every baseline policy that uses `is_admin()` or `USING (true)` (e.g. `email_logs_admin_only`, `notification_queue_admin_only`, `scheduled_emails_admin_only`, `shifts_read USING(true)`, `"Public profiles are viewable by everyone" USING(true)`, `"Shift assignments are viewable by everyone" USING(true)`, `shift_templates_read`, etc.) is tenant-blind today and must be replaced with `org_id = auth_org_id()` predicates in Phase 2 (`scripts/032_rls_tenant_isolation.sql`). The Phase 2 isolation test is the gate that proves these are fixed.
- **`email_service_config`** holds provider secrets (SendGrid/Gmail keys) — its Phase 2 policy must be especially tight (org-scoped, ideally admin-or-service-role only).

### Step 2 hardening — applied post-ultrareview (2026-05-29, follow-up commit)
A multi-agent ultrareview of `1b5f925` (12 real findings, 9 false-positives killed by the critique pass) drove this hardening set. Applied and re-verified on staging:
- **(#1, HIGH) Removed the client-supplied `org_id` read** from `handle_new_user` AND `handle_new_user_disabled`. Both now default `org_id` to the anchor only and never read `raw_user_meta_data ->> 'org_id'` (it was an attacker-controllable cross-tenant placement vector feeding Phase 2's `auth_org_id()`). **Phase 5 gate:** self-service signup must resolve the real `org_id` server-side from a trusted subdomain/host signal, never from client metadata.
- **(#3, MEDIUM) Pinned `SET search_path TO 'public'`** on the 5 SECURITY DEFINER functions that lacked it (`create_notification_preferences`, `schedule_shift_reminder`, `process_waitlist`, `apply_shift_template`, `seed_shifts_range`). All 7 patched definer functions now pin search_path.
- **(#4, NIT) Added `if exists`** to the `auth_blocklist_pkey` drop.
- **(#9, HIGH) Added the committed regression guard** `__tests__/migration/031_org_id.test.ts` (DB-level, staging, rolled-back txns; skips fail-closed when there is no staging `DATABASE_URL`). Asserts: NOT NULL rejects a null `org_id`; `handle_new_user` uses the anchor and ignores client metadata `org_id`; the patched functions populate `org_id`; same email allowed across orgs but rejected within one org; same `(shift_date, slot)` allowed across orgs. **6/6 passing** against staging.

### Banked for later phases (ultrareview)
- **Phase 9 (#6/#7):** `031` runs as one transaction taking ACCESS EXCLUSIVE locks on all 18 tenant tables (inline FK validation + `SET NOT NULL` scans + blocking index builds). Free on empty staging, but a real downtime window on populated prod. Before cutover: set `lock_timeout`/`statement_timeout`; split FKs into `ADD CONSTRAINT ... NOT VALID` + a separate `VALIDATE CONSTRAINT`; build the org indexes on the large log tables with `CREATE INDEX CONCURRENTLY`; run in a maintenance window; and **rehearse on a prod-sized/clone dataset** (the staging run was empty-table, so backfill and lock duration are unrehearsed).
- **Phase 10 (#8):** every `org_id` FK is `ON DELETE CASCADE` to `organizations`, so a single `DELETE FROM organizations WHERE id='…0001'` would cascade-wipe all tenant data. Gate org deletes (admin-only RLS + an app guard / soft-delete for the anchor) and document the destructive cascade in the offboarding runbook.

### Deferred cleanup batch (ultrareview — do NOT do now)
- **#5:** `vitest.config.ts` redundant top-level `root`; the stub JWT-shaped env values are duplicated in `__tests__/setup.ts` (add an "inert stub" comment so they don't read as leaked keys).
- **#10:** committed `pnpm test` is red (134/138, exit 1) with no `it.skip`/allowlist encoding the accepted baseline; also fix the trivial Flow 9 DST assertion (compare calendar dates, not raw ms).
- **#11:** `types/database.generated.ts` is imported by nothing (no `tsc` drift tripwire) and the hand-written `types/database.ts` never gained `org_id`; add a type-parity tripwire or extend the hand-written interfaces when Phase 4 code starts setting `org_id`.
