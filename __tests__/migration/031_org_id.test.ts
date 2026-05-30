/**
 * Migration invariant guard for scripts/031_multitenancy_core.sql (Phase 1).
 *
 * This is a DB-level integration test: it connects to the STAGING Supabase project
 * (DATABASE_URL from .env.local) and asserts the org_id multitenancy invariants the
 * migration is responsible for. Every test runs inside a transaction that is ROLLED
 * BACK, so it never persists data.
 *
 * Fail-closed: the suite is SKIPPED unless DATABASE_URL targets the known staging ref.
 * That keeps it inert in CI / on machines without staging access (it neither fails nor
 * touches a database), while running for real wherever staging is reachable.
 *
 * Covers (ultrareview #9 — the regression guard the migration lacked):
 *   - NOT NULL org_id columns reject a NULL org_id.
 *   - handle_new_user populates org_id with the ANCHOR and IGNORES client-supplied
 *     signup metadata org_id (ultrareview #1 fix), and create_notification_preferences
 *     inherits it.
 *   - schedule_shift_reminder populates notification_queue.org_id.
 *   - apply_shift_template creates org-scoped shifts and its re-scoped ON CONFLICT holds.
 *   - auth_blocklist allows the same email across orgs but rejects a duplicate within one org.
 *   - shifts allow the same (shift_date, slot) across orgs (org-scoped unique key).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import pg from "pg"
import { readFileSync } from "node:fs"

const STAGING_REF = "tgioxwjxxppjsjernhvt"
const ANCHOR = "00000000-0000-0000-0000-000000000001"
const ORG_B = "00000000-0000-0000-0000-000000000002" // deliberately NOT pre-created

function loadStagingDbUrl(): string | null {
  try {
    const t = readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    const m = t.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?\s*$/m)
    const url = m ? m[1].trim() : null
    return url && url.includes(STAGING_REF) ? url : null // fail-closed: staging only
  } catch {
    return null
  }
}

const DB_URL = loadStagingDbUrl()
const run = DB_URL ? describe : describe.skip
if (!DB_URL) {
  console.warn("[031_org_id] SKIPPED — no staging DATABASE_URL in .env.local (CI/no-DB is expected to skip).")
}

run("031 multitenancy migration invariants (staging)", () => {
  let client: pg.Client

  beforeAll(async () => {
    client = new pg.Client({ connectionString: DB_URL!, ssl: { rejectUnauthorized: false } })
    await client.connect()
  }, 20000)

  afterAll(async () => {
    if (client) await client.end()
  })

  // Insert a fake auth.users row inside the current txn -> fires on_auth_user_created.
  async function authUser(email: string, meta = "{}"): Promise<string> {
    const r = await client.query(
      `insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
          $1, '$2a$10$placeholderplaceholderplaceholderplaceholderxx', now(), now(), now(),
          '{"provider":"email","providers":["email"]}', $2::jsonb, false)
       returning id`,
      [email, meta],
    )
    return r.rows[0].id
  }

  it("NOT NULL org_id columns reject a NULL org_id", async () => {
    await client.query("begin")
    let rejected = false
    try {
      await client.query(
        `insert into public.shifts (shift_date, slot, start_time, end_time, capacity)
         values (current_date + 60, 'PM', '15:00', '17:00', 2)`, // org_id omitted
      )
    } catch (e: any) {
      rejected = e?.code === "23502" // not_null_violation
    }
    await client.query("rollback")
    expect(rejected).toBe(true)
  }, 15000)

  it("handle_new_user sets org_id to the anchor and IGNORES client metadata org_id (#1 fix)", async () => {
    await client.query("begin")
    // Attacker-style: supply a different (and non-existent) org_id in signup metadata.
    const uid = await authUser("mig-hnu@example.com", JSON.stringify({ name: "HNU", org_id: ORG_B }))
    const prof = (await client.query(`select org_id::text as org_id from public.profiles where id = $1`, [uid])).rows
    const prefs = (await client.query(`select org_id::text as org_id from public.notification_preferences where user_id = $1`, [uid])).rows
    await client.query("rollback")
    expect(prof.length).toBe(1)
    expect(prof[0].org_id).toBe(ANCHOR) // metadata ORG_B ignored
    expect(prefs.length).toBe(1)
    expect(prefs[0].org_id).toBe(ANCHOR) // create_notification_preferences inherited it
  }, 15000)

  it("schedule_shift_reminder populates notification_queue.org_id", async () => {
    await client.query("begin")
    const uid = await authUser("mig-ssr@example.com")
    const sid = (await client.query(
      `insert into public.shifts (shift_date, slot, start_time, end_time, capacity, org_id)
       values (current_date + 31, 'AM', '09:00', '12:00', 5, $1) returning id`, [ANCHOR],
    )).rows[0].id
    await client.query(`insert into public.shift_assignments (shift_id, user_id, org_id) values ($1, $2, $3)`, [sid, uid, ANCHOR])
    const nq = (await client.query(
      `select org_id::text as org_id, notification_type from public.notification_queue where shift_id = $1`, [sid],
    )).rows
    await client.query("rollback")
    expect(nq.length).toBe(1)
    expect(nq[0].org_id).toBe(ANCHOR)
    expect(nq[0].notification_type).toBe("shift_reminder")
  }, 15000)

  it("apply_shift_template creates org-scoped shifts and the re-scoped ON CONFLICT holds", async () => {
    await client.query("begin")
    const tid = (await client.query(
      `insert into public.shift_templates (name, slot, start_time, end_time, capacity, recurrence_pattern, days_of_week, active, org_id)
       values ('mig test template', 'AM', '09:00', '12:00', 5, 'weekly', '{0,1,2,3,4,5,6}', true, $1) returning id`, [ANCHOR],
    )).rows[0].id
    const r1 = (await client.query(`select shifts_created from public.apply_shift_template($1, current_date + 40, current_date + 42)`, [tid])).rows[0].shifts_created
    const r2 = (await client.query(`select shifts_created from public.apply_shift_template($1, current_date + 40, current_date + 42)`, [tid])).rows[0].shifts_created
    const made = (await client.query(
      `select count(*)::int as n, count(*) filter (where org_id = $1)::int as n_org
       from public.shifts where shift_date between current_date + 40 and current_date + 42`, [ANCHOR],
    )).rows[0]
    await client.query("rollback")
    expect(Number(r1)).toBe(3) // 3 days, all weekdays matched
    expect(Number(r2)).toBe(0) // second run: ON CONFLICT (org_id, shift_date, slot) DO NOTHING
    expect(Number(made.n)).toBe(3)
    expect(Number(made.n_org)).toBe(3)
  }, 15000)

  it("auth_blocklist allows the same email across orgs but rejects a duplicate within one org", async () => {
    await client.query("begin")
    await client.query(`insert into public.organizations (id, slug, name, status, plan) values ($1, 'org-b-blk', 'Org B Blk', 'active', 'starter')`, [ORG_B])
    await client.query(`insert into public.auth_blocklist (email, org_id) values ('dup@x.com', $1)`, [ANCHOR])
    let crossOrgOk = true
    try {
      await client.query(`insert into public.auth_blocklist (email, org_id) values ('dup@x.com', $1)`, [ORG_B])
    } catch {
      crossOrgOk = false
    }
    let sameOrgRejected = false
    try {
      await client.query(`insert into public.auth_blocklist (email, org_id) values ('dup@x.com', $1)`, [ANCHOR])
    } catch (e: any) {
      sameOrgRejected = e?.code === "23505" // unique_violation on (org_id, email)
    }
    await client.query("rollback")
    expect(crossOrgOk).toBe(true)
    expect(sameOrgRejected).toBe(true)
  }, 15000)

  it("shifts allow the same (shift_date, slot) across orgs (org-scoped unique key)", async () => {
    await client.query("begin")
    await client.query(`insert into public.organizations (id, slug, name, status, plan) values ($1, 'org-b-shf', 'Org B Shf', 'active', 'starter')`, [ORG_B])
    await client.query(`insert into public.shifts (shift_date, slot, start_time, end_time, capacity, org_id) values (current_date + 70, 'AM', '09:00', '12:00', 5, $1)`, [ANCHOR])
    let crossOrgOk = true
    try {
      await client.query(`insert into public.shifts (shift_date, slot, start_time, end_time, capacity, org_id) values (current_date + 70, 'AM', '09:00', '12:00', 5, $1)`, [ORG_B])
    } catch {
      crossOrgOk = false
    }
    let sameOrgRejected = false
    try {
      await client.query(`insert into public.shifts (shift_date, slot, start_time, end_time, capacity, org_id) values (current_date + 70, 'AM', '09:00', '12:00', 5, $1)`, [ANCHOR])
    } catch (e: any) {
      sameOrgRejected = e?.code === "23505"
    }
    await client.query("rollback")
    expect(crossOrgOk).toBe(true)
    expect(sameOrgRejected).toBe(true)
  }, 15000)

  // ===== 031a backstop triggers: inserts that OMIT org_id auto-fill it =====
  // Mirrors how real app code inserts (the cases above always set org_id explicitly,
  // which masked the NOT NULL regression Codex PR #36 flagged).

  it("backstop (shift-derived): shift_assignments insert WITHOUT org_id inherits the shift's org_id", async () => {
    await client.query("begin")
    const uid = await authUser("mig-bk-shift@example.com")
    const sid = (await client.query(
      `insert into public.shifts (shift_date, slot, start_time, end_time, capacity, org_id)
       values (current_date + 80, 'AM', '09:00', '12:00', 5, $1) returning id`, [ANCHOR],
    )).rows[0].id
    // omit org_id, exactly like lib/shifts.ts signUpForShift / admin assign actions
    const r = (await client.query(
      `insert into public.shift_assignments (shift_id, user_id) values ($1, $2) returning org_id::text as org_id`, [sid, uid],
    )).rows
    await client.query("rollback")
    expect(r.length).toBe(1)
    expect(r[0].org_id).toBe(ANCHOR)
  }, 15000)

  it("backstop (user-derived): notification_queue insert WITHOUT org_id inherits the user's org_id", async () => {
    await client.query("begin")
    const uid = await authUser("mig-bk-user@example.com")
    const r = (await client.query(
      `insert into public.notification_queue (user_id, notification_type, subject, body, scheduled_for)
       values ($1, 'test', 's', 'b', now()) returning org_id::text as org_id`, [uid],
    )).rows
    await client.query("rollback")
    expect(r.length).toBe(1)
    expect(r[0].org_id).toBe(ANCHOR)
  }, 15000)

  it("backstop (actor-derived): email_templates insert WITHOUT org_id inherits the acting user's org_id", async () => {
    await client.query("begin")
    const uid = await authUser("mig-bk-actor@example.com")
    // simulate an authenticated session so auth.uid() resolves (the session-client path)
    await client.query(`select set_config('request.jwt.claim.sub', $1::text, true)`, [uid])
    await client.query(`select set_config('request.jwt.claims', json_build_object('sub', $1::text)::text, true)`, [uid])
    const r = (await client.query(
      `insert into public.email_templates (name, category, subject, body)
       values ('backstop tmpl', 'reminder', 's', 'b') returning org_id::text as org_id`,
    )).rows
    await client.query("rollback")
    expect(r.length).toBe(1)
    expect(r[0].org_id).toBe(ANCHOR)
  }, 15000)
})
