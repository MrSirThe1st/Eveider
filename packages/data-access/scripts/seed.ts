/**
 * Wipes app data + Auth users, then seeds Lubumbashi / Kolwezi demo accounts.
 *
 * Usage: pnpm db:seed
 * Password (override with SEED_PASSWORD): EveiderDemo2026!
 */
import dns from 'node:dns';
import {
  buildUniformLayout,
  generateBusinessAccessCode,
  generatePickupPinCode,
  generatePointCode,
  generateTrackingNumber,
  matchDrcCity,
} from '@eveider/domain';
import type { Queryable } from '../src/db/pool.js';
import { getPgClientConfig, resolveDatabaseUrl } from '../src/db/pool.js';
import pg from 'pg';

dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'EveiderDemo2026!';

const APP_TABLES = [
  'verification_checks',
  'business_verifications',
  'business_documents',
  'business_locations',
  'billing_accounts',
  'settlement_accounts',
  'business_permissions',
  'business_limits',
  'business_status_histories',
  'parcel_payments',
  'parcel_invites',
  'notifications',
  'driver_dossiers',
  'organization_memberships',
  'business_team_invites',
  'issues',
  'pickup_pins',
  'deliveries',
  'parcels',
  'compartments',
  'lockers',
  'delivery_pricing_rules',
  'users',
  'businesses',
] as const;

type AuthAccount = {
  email: string;
  kind: 'super_admin' | 'platform_admin' | 'eveider_dispatcher' | 'organization' | 'driver' | 'customer';
  fullName: string;
  phone: string;
  orgRole?: 'account_owner' | 'admin' | 'dispatcher' | 'driver';
  businessKey?: 'lubum' | 'kolwezi' | 'pending';
};

const ACCOUNTS: AuthAccount[] = [
  {
    email: 'admin@eveider.cd',
    kind: 'super_admin',
    fullName: 'Marie Kalala',
    phone: '+243810000001',
  },
  {
    email: 'admin.ops@eveider.cd',
    kind: 'platform_admin',
    fullName: 'David Mwamba',
    phone: '+243810000002',
  },
  {
    email: 'operator@eveider.cd',
    kind: 'eveider_dispatcher',
    fullName: 'Sarah Ilunga',
    phone: '+243810000011',
  },
  {
    email: 'operator.kolwezi@eveider.cd',
    kind: 'eveider_dispatcher',
    fullName: 'Patrick Mutombo',
    phone: '+243810000012',
  },
  {
    email: 'boutique.lubum@eveider.cd',
    kind: 'organization',
    fullName: 'Chantal Kasongo',
    phone: '+243970100001',
    orgRole: 'account_owner',
    businessKey: 'lubum',
  },
  {
    email: 'boutique.lubum.manager@eveider.cd',
    kind: 'organization',
    fullName: 'Eric Kabongo',
    phone: '+243970100002',
    orgRole: 'admin',
    businessKey: 'lubum',
  },
  {
    email: 'boutique.lubum.logistics@eveider.cd',
    kind: 'organization',
    fullName: 'Nadia Fwamba',
    phone: '+243970100003',
    orgRole: 'dispatcher',
    businessKey: 'lubum',
  },
  {
    email: 'boutique.lubum.viewer@eveider.cd',
    kind: 'organization',
    fullName: 'Grace Ilunga',
    phone: '+243970100004',
    orgRole: 'dispatcher',
    businessKey: 'lubum',
  },
  {
    email: 'mine.kolwezi@eveider.cd',
    kind: 'organization',
    fullName: 'Joseph Mwepu',
    phone: '+243970200001',
    orgRole: 'account_owner',
    businessKey: 'kolwezi',
  },
  {
    email: 'pending.shop@eveider.cd',
    kind: 'organization',
    fullName: 'Alice Ngoie',
    phone: '+243970300001',
    orgRole: 'account_owner',
    businessKey: 'pending',
  },
  {
    email: 'courier.lubum1@eveider.cd',
    kind: 'driver',
    fullName: 'Jean-Pierre Tshibanda',
    phone: '+243820100001',
    orgRole: 'driver',
    businessKey: 'lubum',
  },
  {
    email: 'courier.lubum2@eveider.cd',
    kind: 'driver',
    fullName: 'Ruth Mbuyi',
    phone: '+243820100002',
    orgRole: 'driver',
    businessKey: 'lubum',
  },
  {
    email: 'courier.kolwezi@eveider.cd',
    kind: 'driver',
    fullName: 'Michel Kabwe',
    phone: '+243820200001',
    orgRole: 'driver',
    businessKey: 'kolwezi',
  },
  {
    email: 'customer.amina@eveider.cd',
    kind: 'customer',
    fullName: 'Amina Mwamba',
    phone: '+243970111001',
  },
  {
    email: 'customer.jean@eveider.cd',
    kind: 'customer',
    fullName: 'Jean Kalonji',
    phone: '+243970111002',
  },
  {
    email: 'customer.grace@eveider.cd',
    kind: 'customer',
    fullName: 'Grace Kyungu',
    phone: '+243970222001',
  },
  {
    email: 'customer.patrick@eveider.cd',
    kind: 'customer',
    fullName: 'Patrick Ilunga',
    phone: '+243970222002',
  },
];

async function wipeAuthUsers(db: Queryable) {
  await db.query(`DELETE FROM auth.refresh_tokens`);
  await db.query(`DELETE FROM auth.sessions`);
  await db.query(`DELETE FROM auth.identities`);
  const result = await db.query(`DELETE FROM auth.users`);
  console.log(`Deleted ${result.rowCount ?? 0} Auth user(s)`);
}

async function wipeAppTables(db: Queryable) {
  const existing = await db.query<{ tablename: string }>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename = ANY($1::text[])`,
    [APP_TABLES],
  );
  const names = existing.rows.map((row) => row.tablename);
  if (names.length === 0) {
    throw new Error('No application tables found — run pnpm db:migrate first');
  }

  await db.query(`TRUNCATE TABLE ${names.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`);
  console.log(`Truncated ${names.length} table(s)`);
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

async function createAuthAccounts(db: Queryable) {
  const instance = await db.query<{ id: string }>(`SELECT id FROM auth.instances LIMIT 1`);
  const instanceId = instance.rows[0]?.id ?? '00000000-0000-0000-0000-000000000000';
  const byEmail = new Map<string, string>();

  for (const account of ACCOUNTS) {
    const inserted = await db.query<{ id: string }>(
      `INSERT INTO auth.users (
         instance_id, id, aud, role, email, encrypted_password,
         email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
         created_at, updated_at, confirmation_token, email_change,
         email_change_token_new, recovery_token, is_sso_user, is_anonymous
       ) VALUES (
         $1::uuid, gen_random_uuid(), 'authenticated', 'authenticated', $2,
         extensions.crypt($3, extensions.gen_salt('bf')),
         NOW(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         $4::jsonb,
         NOW(), NOW(), '', '', '', '', false, false
       )
       RETURNING id`,
      [
        instanceId,
        account.email,
        SEED_PASSWORD,
        JSON.stringify({ full_name: account.fullName, kind: account.kind }),
      ],
    );
    const id = String(inserted.rows[0]!.id);
    await db.query(
      `INSERT INTO auth.identities (
         id, user_id, provider_id, identity_data, provider,
         last_sign_in_at, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1::uuid, $1::text,
         jsonb_build_object('sub', $1::text, 'email', $2::text),
         'email', NOW(), NOW(), NOW()
       )`,
      [id, account.email],
    );
    byEmail.set(account.email, id);
  }

  console.log(`Created ${byEmail.size} Auth user(s)`);
  return byEmail;
}

async function insertReturningId(
  db: Queryable,
  sql: string,
  values: unknown[],
): Promise<string> {
  const result = await db.query<{ id: string }>(sql, values);
  const id = result.rows[0]?.id;
  if (!id) throw new Error(`Insert returned no id: ${sql.slice(0, 80)}`);
  return String(id);
}

async function uniquePointCode(db: Queryable): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generatePointCode();
    const existing = await db.query(`SELECT id FROM lockers WHERE code = $1 LIMIT 1`, [code]);
    if (!existing.rows[0]) return code;
  }
  throw new Error('Could not generate a unique point code');
}

async function uniqueAccessCode(db: Queryable): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateBusinessAccessCode();
    const existing = await db.query(`SELECT id FROM businesses WHERE access_code = $1 LIMIT 1`, [
      code,
    ]);
    if (!existing.rows[0]) return code;
  }
  throw new Error('Could not generate a unique business access code');
}

async function uniquePin(db: Queryable): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generatePickupPinCode();
    const existing = await db.query(`SELECT id FROM pickup_pins WHERE code = $1 LIMIT 1`, [code]);
    if (!existing.rows[0]) return code;
  }
  throw new Error('Could not generate a unique pickup PIN');
}

async function seed(db: Queryable, authIds: Map<string, string>) {
  const eveiderOrgId = await insertReturningId(
    db,
    `INSERT INTO businesses (name, status, is_platform_org, contact_email, is_phone_verified)
     VALUES ('Eveider', 'active', true, 'ops@eveider.cd', true)
     RETURNING id`,
    [],
  );

  const adminId = await insertReturningId(
    db,
    `INSERT INTO users (auth_id, email, phone, full_name, platform_role, is_customer)
     VALUES ($1, $2, $3, $4, 'super_admin', false)
     RETURNING id`,
    [
      authIds.get('admin@eveider.cd'),
      'admin@eveider.cd',
      '+243810000001',
      'Marie Kalala',
    ],
  );

  await db.query(
    `INSERT INTO users (auth_id, email, phone, full_name, platform_role, is_customer)
     VALUES ($1, $2, $3, $4, 'admin', false)`,
    [
      authIds.get('admin.ops@eveider.cd'),
      'admin.ops@eveider.cd',
      '+243810000002',
      'David Mwamba',
    ],
  );

  const lubumBusinessId = await insertReturningId(
    db,
    `INSERT INTO businesses (
       name, status, business_type, industry, sales_channels, description,
       risk_classification, contact_email, contact_phone, is_phone_verified,
       legal_company_name, rccm_number, nif_number, legal_rep_name, access_code
     ) VALUES (
       'Boutique Kenya', 'active', 'registered_company', 'retail',
       ARRAY['physical_store','whatsapp'],
       'Mode et accessoires — Kenya, Lubumbashi',
       'registered_business', 'boutique.lubum@eveider.cd', '+243970100001', true,
       'Boutique Kenya SARL', 'CD/LSH/RCCM/24-B-01234', 'A1234567L',
       'Chantal Kasongo', $1
     ) RETURNING id`,
    [await uniqueAccessCode(db)],
  );

  const kolweziBusinessId = await insertReturningId(
    db,
    `INSERT INTO businesses (
       name, status, business_type, industry, sales_channels, description,
       risk_classification, contact_email, contact_phone, is_phone_verified,
       legal_company_name, rccm_number, nif_number, legal_rep_name, access_code
     ) VALUES (
       'Kolwezi Market', 'active', 'marketplace', 'marketplace',
       ARRAY['online','physical_store'],
       'Marketplace locale — Dilala, Kolwezi',
       'registered_business', 'mine.kolwezi@eveider.cd', '+243970200001', true,
       'Kolwezi Market SAS', 'CD/KWZ/RCCM/24-B-04567', 'A7654321K',
       'Joseph Mwepu', $1
     ) RETURNING id`,
    [await uniqueAccessCode(db)],
  );

  const pendingBusinessId = await insertReturningId(
    db,
    `INSERT INTO businesses (
       name, status, business_type, industry, sales_channels, description,
       risk_classification, contact_email, contact_phone, is_phone_verified,
       individual_full_name, id_passport_number, residential_address
     ) VALUES (
       'Atelier Kampemba', 'active', 'individual_seller', 'fashion',
       ARRAY['instagram'],
       'Couture sur mesure — Kampemba',
       'individual_seller', 'pending.shop@eveider.cd', '+243970300001', true,
       'Alice Ngoie', 'OP-9876543', 'Av. de la Paix, Kampemba, Lubumbashi'
     ) RETURNING id`,
    [],
  );

  const businessIds = {
    lubum: lubumBusinessId,
    kolwezi: kolweziBusinessId,
    pending: pendingBusinessId,
  } as const;

  const profileIds = new Map<string, string>();
  profileIds.set('admin@eveider.cd', adminId);
  const opsAdmin = await db.query(`SELECT id FROM users WHERE email = 'admin.ops@eveider.cd' LIMIT 1`);
  if (opsAdmin.rows[0]) profileIds.set('admin.ops@eveider.cd', String(opsAdmin.rows[0].id));

  for (const account of ACCOUNTS) {
    if (account.kind === 'super_admin' || account.kind === 'platform_admin') continue;
    const platformRole = null;
    const isCustomer = account.kind === 'customer';
    const id = await insertReturningId(
      db,
      `INSERT INTO users (auth_id, email, phone, full_name, platform_role, is_customer)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        authIds.get(account.email),
        account.email,
        account.phone,
        account.fullName,
        platformRole,
        isCustomer,
      ],
    );
    profileIds.set(account.email, id);

    if (account.kind === 'eveider_dispatcher') {
      await db.query(
        `INSERT INTO organization_memberships (user_id, business_id, role) VALUES ($1, $2, 'dispatcher')`,
        [id, eveiderOrgId],
      );
    }
    if ((account.kind === 'organization' || account.kind === 'driver') && account.businessKey && account.orgRole) {
      await db.query(
        `INSERT INTO organization_memberships (user_id, business_id, role) VALUES ($1, $2, $3)`,
        [id, businessIds[account.businessKey], account.orgRole],
      );
    }
  }

  await db.query(
    `INSERT INTO delivery_pricing_rules (
       distance_threshold_km, below_threshold_amount_fc, above_threshold_amount_fc,
       small_coefficient, medium_coefficient, large_coefficient, updated_by
     ) VALUES (10, 1500, 3000, 1.0, 1.5, 2.0, $1)`,
    [adminId],
  );

  async function seedBusinessOps(
    businessId: string,
    city: string,
    street: string,
    lat: number,
    lng: number,
    contact: string,
    phone: string,
    payout: string,
    features: Array<'CREATE_SHIPMENT' | 'API_ACCESS' | 'COD' | 'MONTHLY_INVOICE'>,
  ) {
    await db.query(
      `INSERT INTO business_locations (
         business_id, type, pickup_method, country, city, street, lat, lng,
         contact_person, contact_phone, available_days, available_hours
       ) VALUES (
         $1, 'business_address', 'courier_pickup', 'RDC', $2, $3, $4, $5,
         $6, $7, 'Mon-Sat', '08:00-18:00'
       )`,
      [businessId, city, street, lat, lng, contact, phone],
    );
    await db.query(
      `INSERT INTO billing_accounts (business_id, payment_rule, billing_type)
       VALUES ($1, 'merchant_pays', 'pay_per_shipment')`,
      [businessId],
    );
    await db.query(
      `INSERT INTO settlement_accounts (business_id, payout_method, account_holder, account_number)
       VALUES ($1, 'mobile_money_airtel', $2, $3)`,
      [businessId, contact, payout],
    );
    await db.query(
      `INSERT INTO business_limits (business_id, daily_shipments, monthly_shipments, max_package_value_usd, cod_daily_limit_usd)
       VALUES ($1, 80, 1500, 800, 300)`,
      [businessId],
    );
    for (const feature of features) {
      await db.query(
        `INSERT INTO business_permissions (business_id, feature, status)
         VALUES ($1, $2, 'ENABLED')`,
        [businessId, feature],
      );
    }
  }

  await seedBusinessOps(
    lubumBusinessId,
    'Lubumbashi',
    'Av. de la Révolution, Kenya',
    -11.686,
    27.452,
    'Chantal Kasongo',
    '+243970100001',
    '+243970100001',
    ['CREATE_SHIPMENT', 'API_ACCESS', 'COD'],
  );
  await seedBusinessOps(
    kolweziBusinessId,
    'Kolwezi',
    'Av. Munongo, Dilala',
    -10.732,
    25.468,
    'Joseph Mwepu',
    '+243970200001',
    '+243970200001',
    ['CREATE_SHIPMENT', 'COD', 'MONTHLY_INVOICE'],
  );
  await seedBusinessOps(
    pendingBusinessId,
    'Lubumbashi',
    'Av. de la Paix, Kampemba',
    -11.638,
    27.512,
    'Alice Ngoie',
    '+243970300001',
    '+243970300001',
    ['CREATE_SHIPMENT'],
  );

  const verificationId = await insertReturningId(
    db,
    `INSERT INTO business_verifications (business_id, status, reviewer_id, review_notes, reviewed_at)
     VALUES ($1, 'approved', $2, 'KYC validé — documents conformes', NOW())
     RETURNING id`,
    [lubumBusinessId, adminId],
  );
  for (const type of ['PHONE_VERIFIED', 'DOCUMENT_VALID', 'COMPANY_REGISTERED'] as const) {
    await db.query(
      `INSERT INTO verification_checks (business_verification_id, type, status)
       VALUES ($1, $2, 'PASS')`,
      [verificationId, type],
    );
  }

  await db.query(
    `INSERT INTO business_verifications (business_id, status, submitted_at)
     VALUES ($1, 'pending', NOW())`,
    [pendingBusinessId],
  );

  await db.query(
    `INSERT INTO business_documents (business_id, type, file_url, file_name, status)
     VALUES
       ($1, 'rccm_certificate', 'https://example.invalid/docs/rccm-kenya.pdf', 'rccm-kenya.pdf', 'approved'),
       ($1, 'nif_certificate', 'https://example.invalid/docs/nif-kenya.pdf', 'nif-kenya.pdf', 'approved')`,
    [lubumBusinessId],
  );

  type SmartLockerSeed = {
    key: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    rows: number;
    columns: number;
  };

  const smartLockers: SmartLockerSeed[] = [
    {
      key: 'kenya',
      name: 'EVEIDER KENYA',
      address: 'Av. de la Révolution, Kenya, Lubumbashi',
      latitude: -11.686,
      longitude: 27.452,
      rows: 3,
      columns: 3,
    },
    {
      key: 'kampemba',
      name: 'EVEIDER KAMPEMBA',
      address: 'Av. Sendwe, Kampemba, Lubumbashi',
      latitude: -11.638,
      longitude: 27.512,
      rows: 4,
      columns: 4,
    },
    {
      key: 'katuba',
      name: 'EVEIDER KATUBA',
      address: 'Rond-point Katuba, Lubumbashi',
      latitude: -11.708,
      longitude: 27.428,
      rows: 3,
      columns: 3,
    },
    {
      key: 'dilala',
      name: 'EVEIDER DILALA',
      address: 'Av. Munongo, Dilala, Kolwezi',
      latitude: -10.732,
      longitude: 25.468,
      rows: 3,
      columns: 3,
    },
    {
      key: 'kolwezi-centre',
      name: 'EVEIDER KOLWEZI CENTRE',
      address: 'Av. du 30 Juin, Kolwezi',
      latitude: -10.715,
      longitude: 25.508,
      rows: 3,
      columns: 4,
    },
  ];

  const lockerIds = new Map<string, string>();
  const compartmentsByLocker = new Map<string, Array<{ id: string; label: string }>>();

  for (const locker of smartLockers) {
    const layout = buildUniformLayout(locker.rows, locker.columns, 'medium');
    layout.cells[0]!.size = 'small';
    layout.cells[layout.cells.length - 1]!.size = 'large';

    const lockerId = await insertReturningId(
      db,
      `INSERT INTO lockers (code, name, address, city, latitude, longitude, rows, columns, status, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 'SMART_LOCKER')
       RETURNING id`,
      [
        await uniquePointCode(db),
        locker.name,
        locker.address,
        matchDrcCity(`${locker.name} ${locker.address}`),
        locker.latitude,
        locker.longitude,
        locker.rows,
        locker.columns,
      ],
    );
    lockerIds.set(locker.key, lockerId);

    const inserted: Array<{ id: string; label: string }> = [];
    for (const cell of layout.cells) {
      const compartmentId = await insertReturningId(
        db,
        `INSERT INTO compartments (locker_id, label, size, status)
         VALUES ($1, $2, $3, 'available')
         RETURNING id`,
        [lockerId, cell.label, cell.size],
      );
      inserted.push({ id: compartmentId, label: cell.label });
    }
    compartmentsByLocker.set(locker.key, inserted);
  }

  lockerIds.set(
    'shop-kenya',
    await insertReturningId(
      db,
      `INSERT INTO lockers (
         code, name, address, city, latitude, longitude, rows, columns, status, type,
         max_capacity, contact_phone, contact_name, notes,
         commission_type, commission_value, commission_currency
       ) VALUES (
         $1, 'Shop Kenya Partner', 'Marché Kenya, Lubumbashi', 'Lubumbashi', -11.69, 27.45,
         0, 0, 'active', 'PARTNER_POINT',
         25, '+243970100001', 'Chantal Kasongo', 'Point partenaire boutique',
         'percent', 8, 'USD'
       ) RETURNING id`,
      [await uniquePointCode(db)],
    ),
  );

  lockerIds.set(
    'home-kampemba',
    await insertReturningId(
      db,
      `INSERT INTO lockers (
         code, name, address, city, latitude, longitude, rows, columns, status, type,
         max_capacity, contact_phone, contact_name, notes,
         commission_type, commission_value, commission_currency
       ) VALUES (
         $1, 'Point résidentiel Kampemba', 'Résidence Sendwe, Kampemba, Lubumbashi',
         'Lubumbashi', -11.64, 27.51, 0, 0, 'active', 'RESIDENTIAL_LOCKER',
         12, '+243810000011', 'Sarah Ilunga', 'Point résidentiel opéré Eveider',
         'fixed', 500, 'CDF'
       ) RETURNING id`,
      [await uniquePointCode(db)],
    ),
  );

  lockerIds.set(
    'shop-dilala',
    await insertReturningId(
      db,
      `INSERT INTO lockers (
         code, name, address, city, latitude, longitude, rows, columns, status, type,
         max_capacity, contact_phone, contact_name, notes,
         commission_type, commission_value, commission_currency
       ) VALUES (
         $1, 'Shop Dilala Partner', 'Av. Dilala, Kolwezi', 'Kolwezi', -10.73, 25.47,
         0, 0, 'active', 'PARTNER_POINT',
         20, '+243970200001', 'Joseph Mwepu', 'Point partenaire Kolwezi',
         'percent', 10, 'USD'
       ) RETURNING id`,
      [await uniquePointCode(db)],
    ),
  );

  const courierLubum1 = profileIds.get('courier.lubum1@eveider.cd')!;
  const courierLubum2 = profileIds.get('courier.lubum2@eveider.cd')!;
  const courierKolwezi = profileIds.get('courier.kolwezi@eveider.cd')!;

  await db.query(
    `INSERT INTO driver_dossiers (
       contractor_type, business_id, user_id, full_name, email, phone, id_document_url, status
     ) VALUES
       ('business', $4, $1, 'Jean-Pierre Tshibanda', 'courier.lubum1@eveider.cd', '+243820100001', 'https://files.eveider.cd/id/lubum1.jpg', 'active'),
       ('business', $4, $2, 'Ruth Mbuyi', 'courier.lubum2@eveider.cd', '+243820100002', 'https://files.eveider.cd/id/lubum2.jpg', 'active'),
       ('business', $5, $3, 'Michel Kabwe', 'courier.kolwezi@eveider.cd', '+243820200001', 'https://files.eveider.cd/id/kolwezi.jpg', 'active')`,
    [courierLubum1, courierLubum2, courierKolwezi, lubumBusinessId, kolweziBusinessId],
  );

  const customerAmina = profileIds.get('customer.amina@eveider.cd')!;
  const customerJean = profileIds.get('customer.jean@eveider.cd')!;
  const customerGrace = profileIds.get('customer.grace@eveider.cd')!;
  const customerPatrick = profileIds.get('customer.patrick@eveider.cd')!;

  type ParcelSeed = {
    businessId: string;
    customerId: string | null;
    recipientPhone: string;
    recipientName: string;
    status: 'created' | 'in_transit' | 'delivered_to_locker' | 'ready_for_pickup' | 'collected';
    lockerKey: string;
    occupyCompartment?: boolean;
    courierId?: string;
    deliveryStatus?: 'assigned' | 'scanned' | 'drop_off_pending' | 'completed' | 'failed';
    pin?: boolean;
    pickupType?: 'courier_pickup' | 'merchant_dropoff';
    payment?: 'sender_pays' | 'receiver_pays' | 'cod';
    size?: 'small' | 'medium' | 'large';
    category?: string;
    reference: string;
    invite?: 'pending' | 'accepted';
    issue?: { type: 'failed_delivery' | 'parcel_problem'; reporterId: string };
  };

  const parcels: ParcelSeed[] = [
    {
      businessId: lubumBusinessId,
      customerId: customerAmina,
      recipientPhone: '+243970111001',
      recipientName: 'Amina Mwamba',
      status: 'ready_for_pickup',
      lockerKey: 'kenya',
      occupyCompartment: true,
      courierId: courierLubum1,
      deliveryStatus: 'completed',
      pin: true,
      payment: 'receiver_pays',
      reference: 'LSH-1001',
      invite: 'accepted',
    },
    {
      businessId: lubumBusinessId,
      customerId: customerJean,
      recipientPhone: '+243970111002',
      recipientName: 'Jean Kalonji',
      status: 'in_transit',
      lockerKey: 'kampemba',
      courierId: courierLubum1,
      deliveryStatus: 'scanned',
      pickupType: 'courier_pickup',
      reference: 'LSH-1002',
    },
    {
      businessId: lubumBusinessId,
      customerId: customerAmina,
      recipientPhone: '+243970111001',
      recipientName: 'Amina Mwamba',
      status: 'created',
      lockerKey: 'katuba',
      pickupType: 'merchant_dropoff',
      reference: 'LSH-1003',
      invite: 'pending',
    },
    {
      businessId: lubumBusinessId,
      customerId: customerJean,
      recipientPhone: '+243970111002',
      recipientName: 'Jean Kalonji',
      status: 'collected',
      lockerKey: 'kenya',
      courierId: courierLubum2,
      deliveryStatus: 'completed',
      payment: 'sender_pays',
      reference: 'LSH-1004',
      invite: 'accepted',
    },
    {
      businessId: lubumBusinessId,
      customerId: null,
      recipientPhone: '+243970111009',
      recipientName: 'Guest Lubumbashi',
      status: 'delivered_to_locker',
      lockerKey: 'shop-kenya',
      courierId: courierLubum2,
      deliveryStatus: 'completed',
      pin: true,
      payment: 'cod',
      reference: 'LSH-1005',
    },
    {
      businessId: kolweziBusinessId,
      customerId: customerGrace,
      recipientPhone: '+243970222001',
      recipientName: 'Grace Kyungu',
      status: 'ready_for_pickup',
      lockerKey: 'dilala',
      occupyCompartment: true,
      courierId: courierKolwezi,
      deliveryStatus: 'completed',
      pin: true,
      payment: 'receiver_pays',
      reference: 'KWZ-2001',
      invite: 'accepted',
    },
    {
      businessId: kolweziBusinessId,
      customerId: customerPatrick,
      recipientPhone: '+243970222002',
      recipientName: 'Patrick Ilunga',
      status: 'in_transit',
      lockerKey: 'kolwezi-centre',
      courierId: courierKolwezi,
      deliveryStatus: 'assigned',
      pickupType: 'courier_pickup',
      reference: 'KWZ-2002',
      issue: { type: 'failed_delivery', reporterId: courierKolwezi },
    },
    {
      businessId: kolweziBusinessId,
      customerId: customerGrace,
      recipientPhone: '+243970222001',
      recipientName: 'Grace Kyungu',
      status: 'created',
      lockerKey: 'shop-dilala',
      payment: 'cod',
      reference: 'KWZ-2003',
    },
  ];

  for (const parcel of parcels) {
    const lockerId = lockerIds.get(parcel.lockerKey);
    if (!lockerId) throw new Error(`Missing locker ${parcel.lockerKey}`);

    let compartmentId: string | null = null;
    if (parcel.occupyCompartment) {
      const cells = compartmentsByLocker.get(parcel.lockerKey);
      const free = cells?.shift();
      if (!free) throw new Error(`No free compartment in ${parcel.lockerKey}`);
      compartmentId = free.id;
      await db.query(`UPDATE compartments SET status = 'occupied', updated_at = NOW() WHERE id = $1`, [
        compartmentId,
      ]);
    }

    const parcelId = await insertReturningId(
      db,
      `INSERT INTO parcels (
         tracking_number, reference, status, business_id, customer_id,
         recipient_phone, recipient_name, locker_id, compartment_id,
         pickup_type, sender_name, sender_phone, sender_address,
         package_size, package_category, payment_responsibility,
         declared_value_usd, delivery_fee_fc, delivery_distance_km, pricing_size_used
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
       ) RETURNING id`,
      [
        generateTrackingNumber(),
        parcel.reference,
        parcel.status,
        parcel.businessId,
        parcel.customerId,
        parcel.recipientPhone,
        parcel.recipientName,
        lockerId,
        compartmentId,
        parcel.pickupType ?? 'merchant_dropoff',
        parcel.businessId === kolweziBusinessId ? 'Kolwezi Market' : 'Boutique Kenya',
        parcel.businessId === kolweziBusinessId ? '+243970200001' : '+243970100001',
        parcel.pickupType === 'courier_pickup'
          ? parcel.businessId === kolweziBusinessId
            ? 'Av. Munongo, Dilala, Kolwezi'
            : 'Av. de la Révolution, Kenya, Lubumbashi'
          : null,
        parcel.size ?? 'medium',
        parcel.category ?? 'fashion',
        parcel.payment ?? 'receiver_pays',
        45,
        parcel.size === 'large' ? 3000 : 1500,
        4.2,
        parcel.size ?? 'medium',
      ],
    );

    if (parcel.courierId && parcel.deliveryStatus) {
      await db.query(
        `INSERT INTO deliveries (parcel_id, driver_id, status, scanned_at, completed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          parcelId,
          parcel.courierId,
          parcel.deliveryStatus,
          parcel.deliveryStatus === 'assigned' ? null : new Date(),
          parcel.deliveryStatus === 'completed' ? new Date() : null,
        ],
      );
    }

    if (parcel.pin) {
      await db.query(`INSERT INTO pickup_pins (parcel_id, code) VALUES ($1, $2)`, [
        parcelId,
        await uniquePin(db),
      ]);
    }

    if (parcel.invite) {
      await db.query(
        `INSERT INTO parcel_invites (parcel_id, phone, email, status, expires_at, accepted_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '14 days', $5)`,
        [
          parcelId,
          parcel.recipientPhone,
          null,
          parcel.invite,
          parcel.invite === 'accepted' ? new Date() : null,
        ],
      );
    }

    if (parcel.payment === 'receiver_pays' && parcel.status === 'ready_for_pickup') {
      await db.query(
        `INSERT INTO parcel_payments (
           parcel_id, user_id, deposit_id, amount, currency, provider, phone_number, status, completed_at
         ) VALUES ($1, $2, gen_random_uuid(), '1500', 'CDF', 'pawapay', $3, 'completed', NOW())`,
        [parcelId, parcel.customerId, parcel.recipientPhone],
      );
    }

    if (parcel.customerId) {
      await db.query(
        `INSERT INTO notifications (user_id, parcel_id, channel, message, sent_at)
         VALUES ($1, $2, 'in_app', $3, NOW())`,
        [
          parcel.customerId,
          parcelId,
          `Colis ${parcel.reference} — ${parcel.status.replaceAll('_', ' ')}`,
        ],
      );
    }

    if (parcel.issue) {
      await db.query(
        `INSERT INTO issues (type, status, parcel_id, locker_id, reporter_id, description)
         VALUES ($1, 'open', $2, $3, $4, $5)`,
        [
          parcel.issue.type,
          parcelId,
          lockerId,
          parcel.issue.reporterId,
          'Destinataire injoignable au premier passage',
        ],
      );
    }
  }

  await db.query(
    `INSERT INTO issues (type, status, locker_id, reporter_id, description)
     VALUES ('locker_system', 'in_progress', $1, $2, 'Porte A2 ne se ferme plus correctement')`,
    [lockerIds.get('kenya'), adminId],
  );
}

function printCredentials() {
  console.log('\nSeed login (password for all accounts):');
  console.log(`  ${SEED_PASSWORD}\n`);
  console.log('Web (platform / organisation):');
  for (const account of ACCOUNTS.filter((item) =>
    ['super_admin', 'platform_admin', 'eveider_dispatcher', 'organization'].includes(item.kind),
  )) {
    console.log(`  ${account.kind.padEnd(22)} ${account.email}  ${account.fullName}`);
  }
  console.log('\nMobile (customer / driver):');
  for (const account of ACCOUNTS.filter((item) =>
    ['customer', 'driver'].includes(item.kind),
  )) {
    console.log(`  ${account.kind.padEnd(10)} ${account.email}  ${account.phone}`);
  }
}

async function main() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  console.log('Wiping Auth users and application tables, then seeding Lubumbashi + Kolwezi…');

  const client = await connectDatabase(connectionString);
  try {
    await wipeAppTables(client);
    await wipeAuthUsers(client);
    const authIds = await createAuthAccounts(client);
    await seed(client, authIds);

    const counts = await client.query<{
      users: number;
      businesses: number;
      lockers: number;
      parcels: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM users) AS users,
         (SELECT COUNT(*)::int FROM businesses) AS businesses,
         (SELECT COUNT(*)::int FROM lockers) AS lockers,
         (SELECT COUNT(*)::int FROM parcels) AS parcels`,
    );
    const row = counts.rows[0];
    console.log(
      `Seed complete: ${row?.users ?? 0} users, ${row?.businesses ?? 0} businesses, ${row?.lockers ?? 0} points, ${row?.parcels ?? 0} parcels`,
    );
    printCredentials();
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
