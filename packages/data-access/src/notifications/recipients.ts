import type { Queryable } from '../db/index.js';
import type { WebNotificationAudience } from './types.js';

export type NotificationRecipient = {
  userId: string;
  email: string | null;
  fullName: string | null;
  emailNotificationsEnabled: boolean;
};

const ACTIVE_USER = `
  u.deleted_at IS NULL
  AND u.deactivated_at IS NULL
  AND u.is_blocked = false
`;

export async function resolveNotificationRecipients(
  db: Queryable,
  audience: WebNotificationAudience,
  businessId?: string | null,
): Promise<NotificationRecipient[]> {
  if (audience === 'platform_admins') {
    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.email_notifications_enabled
       FROM users u
       WHERE u.platform_role IN ('super_admin', 'admin')
         AND ${ACTIVE_USER}`,
    );
    return result.rows.map(mapRecipient);
  }

  if (audience === 'admin_ops') {
    const result = await db.query(
      `SELECT DISTINCT ON (u.id)
          u.id, u.email, u.full_name, u.email_notifications_enabled
       FROM users u
       LEFT JOIN organization_memberships om ON om.user_id = u.id
       LEFT JOIN businesses b ON b.id = om.business_id AND b.is_platform_org = true
       WHERE ${ACTIVE_USER}
         AND (
           u.platform_role IN ('super_admin', 'admin')
           OR (b.id IS NOT NULL AND om.role = 'dispatcher')
         )
       ORDER BY u.id`,
    );
    return result.rows.map(mapRecipient);
  }

  if (!businessId) return [];

  const result = await db.query(
    `SELECT u.id, u.email, u.full_name, u.email_notifications_enabled
     FROM organization_memberships om
     JOIN users u ON u.id = om.user_id
     JOIN businesses b ON b.id = om.business_id
     WHERE om.business_id = $1
       AND b.is_platform_org = false
       AND om.role IN ('account_owner', 'admin', 'dispatcher')
       AND ${ACTIVE_USER}`,
    [businessId],
  );
  return result.rows.map(mapRecipient);
}

function mapRecipient(row: Record<string, unknown>): NotificationRecipient {
  return {
    userId: String(row.id),
    email: row.email == null || row.email === '' ? null : String(row.email),
    fullName: row.full_name == null || row.full_name === '' ? null : String(row.full_name),
    emailNotificationsEnabled: row.email_notifications_enabled !== false,
  };
}
