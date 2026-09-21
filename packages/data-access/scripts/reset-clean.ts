/**
 * Development-only operational wipe. Keeps schema/migrations and platform Admin logins.
 *
 * Does NOT drop tables, does NOT re-run the demo seed.
 *
 * Usage (from repo root):
 *   EVEIDER_ALLOW_CLEAN_RESET=1 pnpm db:reset:clean
 */
import dns from 'node:dns';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { getPgClientConfig, resolveDatabaseUrl } from '../src/db/pool.js';

dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;

const PRESERVE_PUBLIC_TABLES = new Set([
  'schema_migrations',
  '_prisma_migrations',
  'users',
  'businesses',
]);

const STARTER_TEMPLATES = [
  {
    name: 'Standard 3×3',
    description: 'Grille 3×3 — compartiments moyens',
    rows: 3,
    columns: 3,
    cells: [
      { label: 'A1', size: 'medium' },
      { label: 'A2', size: 'medium' },
      { label: 'A3', size: 'medium' },
      { label: 'B1', size: 'medium' },
      { label: 'B2', size: 'medium' },
      { label: 'B3', size: 'medium' },
      { label: 'C1', size: 'medium' },
      { label: 'C2', size: 'medium' },
      { label: 'C3', size: 'medium' },
    ],
  },
  {
    name: 'Standard 4×4',
    description: 'Grille 4×4 — compartiments moyens',
    rows: 4,
    columns: 4,
    cells: [
      { label: 'A1', size: 'medium' },
      { label: 'A2', size: 'medium' },
      { label: 'A3', size: 'medium' },
      { label: 'A4', size: 'medium' },
      { label: 'B1', size: 'medium' },
      { label: 'B2', size: 'medium' },
      { label: 'B3', size: 'medium' },
      { label: 'B4', size: 'medium' },
      { label: 'C1', size: 'medium' },
      { label: 'C2', size: 'medium' },
      { label: 'C3', size: 'medium' },
      { label: 'C4', size: 'medium' },
      { label: 'D1', size: 'medium' },
      { label: 'D2', size: 'medium' },
      { label: 'D3', size: 'medium' },
      { label: 'D4', size: 'medium' },
    ],
  },
] as const;

type AdminRow = {
  id: string;
  email: string;
  platform_role: string;
  full_name: string | null;
  auth_id: string | null;
};

type CountRow = { table: string; n: number };

function assertDevelopmentOnly(): void {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('Refusing to run clean reset in production');
  }
  if (process.env.EVEIDER_ALLOW_CLEAN_RESET !== '1') {
    throw new Error(
      'Refusing to wipe data. Re-run with EVEIDER_ALLOW_CLEAN_RESET=1 (development only).',
    );
  }
}

function resolveResetDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  const url = resolveDatabaseUrl();
  if (!url) throw new Error('DATABASE_URL is required');
  return url;
}

async function connectDatabase(connectionString: string): Promise<pg.Client> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const client = new Client({
      ...getPgClientConfig(connectionString),
      connectionTimeoutMillis: 30_000,
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // ignore
      }
      const delayMs = 1500 * attempt;
      console.warn(`connect database failed (attempt ${attempt}/5), retrying in ${delayMs}ms…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function listPublicTables(db: pg.Client): Promise<string[]> {
  const result = await db.query<{ table_name: string }>(
    `SELECT tablename AS table_name
     FROM pg_tables
     WHERE schemaname = 'public'
     ORDER BY tablename`,
  );
  return result.rows.map((row) => row.table_name);
}

async function countTables(db: pg.Client, tables: string[]): Promise<CountRow[]> {
  const counts: CountRow[] = [];
  for (const table of tables) {
    const result = await db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.${quoteIdent(table)}`,
    );
    counts.push({ table, n: result.rows[0]!.n });
  }
  return counts;
}

function quoteIdent(name: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Refusing to quote unsafe identifier: ${name}`);
  }
  return `"${name}"`;
}

async function loadAdmins(db: pg.Client): Promise<AdminRow[]> {
  const result = await db.query<AdminRow>(
    `SELECT id, email, platform_role::text AS platform_role, full_name, auth_id
     FROM users
     WHERE platform_role IS NOT NULL
       AND deleted_at IS NULL
     ORDER BY CASE WHEN platform_role = 'super_admin' THEN 0 ELSE 1 END, email`,
  );
  return result.rows;
}

async function ensureBootConfig(db: pg.Client): Promise<string[]> {
  const restored: string[] = [];

  const platformOrg = await db.query(
    `SELECT id FROM businesses WHERE is_platform_org = true LIMIT 1`,
  );
  if (!platformOrg.rows[0]) {
    await db.query(
      `INSERT INTO businesses (name, status, is_platform_org, contact_email, is_phone_verified)
       VALUES ('Eveider', 'active', true, 'ops@eveider.cd', true)`,
    );
    restored.push('businesses (Eveider platform org)');
  }

  const settings = await db.query(`SELECT id FROM platform_settings LIMIT 1`);
  if (!settings.rows[0]) {
    await db.query(
      `INSERT INTO platform_settings (
         pickup_fee_amount, pickup_fee_currency, platform_currency, require_org_approval,
         default_daily_shipments, default_monthly_shipments,
         default_max_package_value_usd, default_cod_daily_limit_usd,
         default_enabled_features
       ) VALUES (
         5.00, 'CDF', 'CDF', FALSE, 50, 1000, 500.00, 200.00,
         '["CREATE_SHIPMENT","API_ACCESS","COD","MONTHLY_INVOICE"]'::jsonb
       )`,
    );
    restored.push('platform_settings (defaults)');
  }

  const lockerSettings = await db.query(`SELECT id FROM locker_network_settings LIMIT 1`);
  if (!lockerSettings.rows[0]) {
    await db.query(
      `INSERT INTO locker_network_settings (
         size_matching_mode, assignment_strategy, pickup_hold_hours, pickup_reminder_hours
       ) VALUES ('exact_or_larger', 'smallest_fit', 72, 24)`,
    );
    restored.push('locker_network_settings (defaults)');
  }

  const pricing = await db.query(`SELECT id FROM delivery_pricing_rules LIMIT 1`);
  if (!pricing.rows[0]) {
    await db.query(
      `INSERT INTO delivery_pricing_rules (
         distance_threshold_km, below_threshold_amount, above_threshold_amount, currency,
         small_coefficient, medium_coefficient, large_coefficient,
         drop_off_fee_amount, locker_rental_rate_amount,
         locker_collection_amount, return_locker_amount
       ) VALUES (10, 1500, 3000, 'CDF', 1.0, 1.5, 2.0, 500, 200, 500, 500)`,
    );
    restored.push('delivery_pricing_rules (defaults)');
  }

  for (const template of STARTER_TEMPLATES) {
    const existing = await db.query(
      `SELECT id FROM locker_layout_templates
       WHERE lower(trim(name)) = lower($1) AND archived_at IS NULL
       LIMIT 1`,
      [template.name],
    );
    if (existing.rows[0]) continue;
    await db.query(
      `INSERT INTO locker_layout_templates (name, description, rows, columns, cells, is_starter)
       VALUES ($1, $2, $3, $4, $5::jsonb, TRUE)`,
      [
        template.name,
        template.description,
        template.rows,
        template.columns,
        JSON.stringify(template.cells),
      ],
    );
    restored.push(`locker_layout_templates (${template.name})`);
  }

  return restored;
}

async function deleteAuthUsersExcept(db: pg.Client, keepAuthIds: string[]): Promise<number> {
  const keep = keepAuthIds.filter(Boolean);
  const others = await db.query<{ id: string }>(
    keep.length > 0
      ? `SELECT id FROM auth.users WHERE NOT (id = ANY($1::uuid[]))`
      : `SELECT id FROM auth.users`,
    keep.length > 0 ? [keep] : [],
  );
  const ids = others.rows.map((row) => String(row.id));
  if (ids.length === 0) return 0;

  const refs = await db.query<{ schema: string; table: string; column: string }>(
    `SELECT
       n.nspname AS schema,
       c.relname AS table,
       a.attname AS column
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = cols.attnum
     WHERE con.contype = 'f'
       AND con.confrelid = 'auth.users'::regclass
       AND cols.ord = 1
     ORDER BY n.nspname, c.relname`,
  );

  const knownDeletes = [
    `DELETE FROM auth.refresh_tokens WHERE user_id::text = ANY($1::text[])`,
    `DELETE FROM auth.mfa_amr_claims WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id::text = ANY($1::text[]))`,
    `DELETE FROM auth.sessions WHERE user_id::text = ANY($1::text[])`,
    `DELETE FROM auth.identities WHERE user_id::text = ANY($1::text[])`,
    `DELETE FROM auth.one_time_tokens WHERE user_id::text = ANY($1::text[])`,
    `DELETE FROM auth.mfa_challenges WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id::text = ANY($1::text[]))`,
    `DELETE FROM auth.mfa_factors WHERE user_id::text = ANY($1::text[])`,
    `DELETE FROM auth.flow_state WHERE user_id::text = ANY($1::text[])`,
  ];
  for (const sql of knownDeletes) {
    try {
      await db.query(sql, [ids]);
    } catch (error) {
      if (!isMissingRelationError(error)) throw error;
    }
  }

  for (let pass = 0; pass < 8; pass++) {
    for (const ref of refs.rows) {
      if (ref.schema === 'auth' && ref.table === 'users') continue;
      try {
        await db.query(
          `DELETE FROM ${quoteIdent(ref.schema)}.${quoteIdent(ref.table)}
           WHERE ${quoteIdent(ref.column)}::text = ANY($1::text[])`,
          [ids],
        );
      } catch (error) {
        if (!isIgnorableAuthDeleteError(error)) throw error;
      }
    }
    try {
      const deleted = await db.query(
        `DELETE FROM auth.users WHERE id::text = ANY($1::text[])`,
        [ids],
      );
      return deleted.rowCount ?? ids.length;
    } catch (error) {
      if (pass === 7 || !isIgnorableAuthDeleteError(error)) throw error;
    }
  }
  throw new Error('Could not delete non-admin Auth users after retries');
}

function isMissingRelationError(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  return code === '42P01' || code === '42703';
}

function isIgnorableAuthDeleteError(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  return isMissingRelationError(error) || code === '23503';
}

async function verifyAdminLogin(admins: AdminRow[]): Promise<{
  email: string;
  ok: boolean;
  detail: string;
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const password = process.env.SEED_PASSWORD ?? 'EveiderDemo2026!';
  const primary = admins.find((admin) => admin.platform_role === 'super_admin') ?? admins[0];
  if (!primary || !url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: primary.email,
    password,
  });
  if (error || !data.user) {
    return {
      email: primary.email,
      ok: false,
      detail: error?.message ?? 'sign-in returned no user',
    };
  }
  await supabase.auth.signOut();
  return {
    email: primary.email,
    ok: true,
    detail: `auth_id ${data.user.id}`,
  };
}

async function printReport(input: {
  host: string;
  before: CountRow[];
  after: CountRow[];
  admins: AdminRow[];
  restored: string[];
  deletedAuthUsers: number;
  login: { email: string; ok: boolean; detail: string } | null;
}): Promise<void> {
  const deleted = input.before
    .map((row) => {
      const after = input.after.find((item) => item.table === row.table)?.n ?? 0;
      return { table: row.table, before: row.n, after, removed: row.n - after };
    })
    .filter((row) => row.removed > 0);

  console.log('\n=== Eveider clean reset report ===');
  console.log(`Database: ${input.host}`);
  console.log('\n1. Preserved');
  for (const admin of input.admins) {
    console.log(
      `  - Admin ${admin.email} (${admin.platform_role})${admin.full_name ? ` — ${admin.full_name}` : ''}`,
    );
  }
  console.log('  - public.users / auth.users rows for those Admin accounts (password unchanged)');
  console.log('  - schema_migrations (and leftover _prisma_migrations if present)');
  console.log('  - Eveider platform organization (is_platform_org)');
  console.log('  - Boot config rows (settings / pricing / locker network / starter templates)');

  console.log('\n2. Deleted');
  if (deleted.length === 0) {
    console.log('  - nothing (database was already clean)');
  } else {
    for (const row of deleted) {
      console.log(`  - ${row.table}: ${row.removed} row(s)`);
    }
  }
  console.log(`  - auth.users (non-admin): ${input.deletedAuthUsers}`);

  console.log('\n3. Records that had to remain');
  console.log('  - Admin profiles + Auth credentials: required to log in');
  console.log('  - Eveider platform org: unique is_platform_org row used by staff memberships');
  console.log('  - platform_settings / locker_network_settings / delivery_pricing_rules: app throws if missing');
  console.log('  - Starter locker layout templates: system modèles, not operational lockers');
  console.log('  - schema_migrations: records applied DDL; tables were not dropped');
  if (input.restored.length > 0) {
    console.log('  Recreated defaults:');
    for (const item of input.restored) console.log(`    - ${item}`);
  }

  console.log('\n4. Admin login');
  if (!input.login) {
    console.log('  - Skipped live Auth sign-in (missing Supabase URL/key). DB linkage preserved.');
  } else if (input.login.ok) {
    console.log(`  - OK: ${input.login.email} signed in (${input.login.detail})`);
  } else {
    console.log(
      `  - Auth API sign-in failed for ${input.login.email}: ${input.login.detail}. Profile/auth rows were not rewritten; try the existing password in the UI.`,
    );
  }
  console.log('');
}

async function main() {
  assertDevelopmentOnly();

  const connectionString = resolveResetDatabaseUrl();
  const host = new URL(connectionString.replace(/^postgresql:/, 'http:')).host;
  const dryRun = process.argv.includes('--dry-run');

  const client = await connectDatabase(connectionString);
  try {
    const tables = await listPublicTables(client);
    const operational = tables.filter((name) => !PRESERVE_PUBLIC_TABLES.has(name));
    const before = await countTables(client, tables);
    const admins = await loadAdmins(client);

    if (admins.length === 0) {
      throw new Error('No Admin users found (users.platform_role). Aborting to avoid a lockout.');
    }
    if (!admins.some((admin) => admin.platform_role === 'super_admin')) {
      throw new Error('No super_admin user found. Aborting.');
    }
    const missingAuth = admins.filter((admin) => !admin.auth_id);
    if (missingAuth.length > 0) {
      throw new Error(
        `Admin account(s) missing auth_id: ${missingAuth.map((row) => row.email).join(', ')}`,
      );
    }

    console.log(`Clean reset target: ${host}`);
    console.log(
      `Preserving ${admins.length} Admin account(s): ${admins.map((row) => row.email).join(', ')}`,
    );
    console.log(`Operational tables to wipe: ${operational.length}`);
    if (dryRun) {
      console.log('Dry run only — no writes.');
      return;
    }

    await client.query('BEGIN');
    try {
      // List every operational table in one TRUNCATE so RESTRICT FKs among
      // them are satisfied. Do not CASCADE: that would follow FKs into
      // preserved parents if a future table pointed the wrong way.
      if (operational.length > 0) {
        const names = operational.map(quoteIdent).join(', ');
        await client.query(`TRUNCATE TABLE ${names} RESTART IDENTITY`);
      }

      const deletedUsers = await client.query(
        `DELETE FROM users WHERE platform_role IS NULL`,
      );
      const deletedBusinesses = await client.query(
        `DELETE FROM businesses WHERE is_platform_org IS NOT TRUE`,
      );
      console.log(
        `Removed ${deletedUsers.rowCount ?? 0} non-admin user(s), ${deletedBusinesses.rowCount ?? 0} non-platform business(es)`,
      );

      const restored = await ensureBootConfig(client);
      const keepAuthIds = admins.map((admin) => String(admin.auth_id));
      const deletedAuthUsers = await deleteAuthUsersExcept(client, keepAuthIds);
      await client.query('COMMIT');

      const afterAdmins = await loadAdmins(client);
      const after = await countTables(client, tables);
      const login = await verifyAdminLogin(afterAdmins);

      await printReport({
        host,
        before,
        after,
        admins: afterAdmins,
        restored,
        deletedAuthUsers,
        login,
      });

      const leftoverOps = after.filter(
        (row) =>
          !PRESERVE_PUBLIC_TABLES.has(row.table) &&
          !['platform_settings', 'locker_network_settings', 'delivery_pricing_rules', 'locker_layout_templates'].includes(
            row.table,
          ) &&
          row.n > 0,
      );
      if (leftoverOps.length > 0) {
        console.warn('Warning: unexpected leftover operational rows:');
        for (const row of leftoverOps) console.warn(`  ${row.table}: ${row.n}`);
        process.exitCode = 1;
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
