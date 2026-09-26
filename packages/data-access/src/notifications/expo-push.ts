import type { Queryable } from '../db/index.js';
import type { ExpoPushPayload, PushDevicePlatform, UserPushDevice } from './types.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^ExponentPushToken\[.+\]$/;

export function isValidExpoPushToken(token: string): boolean {
  return EXPO_TOKEN_PATTERN.test(token.trim());
}

function mapDevice(row: Record<string, unknown>): UserPushDevice {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    expoPushToken: String(row.expo_push_token),
    platform: row.platform as PushDevicePlatform,
    deviceId: row.device_id == null || row.device_id === '' ? null : String(row.device_id),
    enabled: row.enabled !== false,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    lastSeenAt: new Date(String(row.last_seen_at)),
  };
}

/**
 * Expo Push Service adapter. Delivers attention pushes only —
 * never creates notification rows. Failures must not affect domain txns.
 */
export class ExpoPushProvider {
  constructor(private readonly db: Queryable) {}

  async registerDevice(input: {
    userId: string;
    expoPushToken: string;
    platform: PushDevicePlatform;
    deviceId?: string | null;
  }): Promise<UserPushDevice> {
    const token = input.expoPushToken.trim();
    if (!isValidExpoPushToken(token)) {
      throw new Error('Jeton push Expo invalide');
    }
    if (input.platform !== 'ios' && input.platform !== 'android') {
      throw new Error('Plateforme push invalide');
    }

    const deviceId = input.deviceId?.trim() || null;

    // Token must never stay registered to another user.
    await this.db.query(
      `UPDATE user_push_devices
       SET enabled = false, updated_at = NOW()
       WHERE expo_push_token = $1 AND user_id <> $2 AND enabled = true`,
      [token, input.userId],
    );

    if (deviceId) {
      await this.db.query(
        `UPDATE user_push_devices
         SET enabled = false, updated_at = NOW()
         WHERE user_id = $1 AND device_id = $2 AND expo_push_token <> $3 AND enabled = true`,
        [input.userId, deviceId, token],
      );
    }

    const result = await this.db.query(
      `INSERT INTO user_push_devices (
         user_id, expo_push_token, platform, device_id, enabled, last_seen_at, updated_at
       ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (expo_push_token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         platform = EXCLUDED.platform,
         device_id = COALESCE(EXCLUDED.device_id, user_push_devices.device_id),
         enabled = true,
         last_seen_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [input.userId, token, input.platform, deviceId],
    );
    return mapDevice(result.rows[0]!);
  }

  async unregisterDevice(input: {
    userId: string;
    expoPushToken?: string | null;
    deviceId?: string | null;
  }): Promise<number> {
    if (input.expoPushToken?.trim()) {
      const result = await this.db.query(
        `UPDATE user_push_devices
         SET enabled = false, updated_at = NOW()
         WHERE user_id = $1 AND expo_push_token = $2 AND enabled = true`,
        [input.userId, input.expoPushToken.trim()],
      );
      return result.rowCount ?? 0;
    }
    if (input.deviceId?.trim()) {
      const result = await this.db.query(
        `UPDATE user_push_devices
         SET enabled = false, updated_at = NOW()
         WHERE user_id = $1 AND device_id = $2 AND enabled = true`,
        [input.userId, input.deviceId.trim()],
      );
      return result.rowCount ?? 0;
    }
    const result = await this.db.query(
      `UPDATE user_push_devices
       SET enabled = false, updated_at = NOW()
       WHERE user_id = $1 AND enabled = true`,
      [input.userId],
    );
    return result.rowCount ?? 0;
  }

  async listEnabledTokensForUser(userId: string): Promise<string[]> {
    const result = await this.db.query(
      `SELECT expo_push_token FROM user_push_devices
       WHERE user_id = $1 AND enabled = true`,
      [userId],
    );
    return result.rows.map((row) => String(row.expo_push_token));
  }

  async disableTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.db.query(
      `UPDATE user_push_devices
       SET enabled = false, updated_at = NOW()
       WHERE expo_push_token = ANY($1) AND enabled = true`,
      [tokens],
    );
  }

  async sendToUser(userId: string, payload: ExpoPushPayload): Promise<void> {
    const preference = await this.db.query(
      `SELECT push_notifications_enabled FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!preference.rows[0] || preference.rows[0].push_notifications_enabled === false) {
      return;
    }

    const tokens = await this.listEnabledTokensForUser(userId);
    if (tokens.length === 0) return;
    await this.sendToDevices(tokens, payload);
  }

  async sendToDevices(tokens: string[], payload: ExpoPushPayload): Promise<void> {
    const unique = [...new Set(tokens.map((t) => t.trim()).filter(isValidExpoPushToken))];
    if (unique.length === 0) return;

    const messages = unique.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default' as const,
      priority: payload.priority === 'high' ? ('high' as const) : ('default' as const),
      channelId: payload.channelId ?? 'eveider_operations',
    }));

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.error('[eveider:expo-push] HTTP error', {
          status: response.status,
          body: await response.text().catch(() => ''),
        });
        return;
      }

      const json = (await response.json()) as {
        data?: Array<{
          status?: string;
          message?: string;
          details?: { error?: string };
        }>;
      };

      const deadTokens: string[] = [];
      for (let i = 0; i < (json.data?.length ?? 0); i += 1) {
        const ticket = json.data![i]!;
        const token = unique[i];
        if (ticket.status === 'error') {
          const code = ticket.details?.error;
          console.error('[eveider:expo-push] ticket error', {
            token,
            message: ticket.message,
            error: code,
          });
          if (code === 'DeviceNotRegistered' || code === 'InvalidCredentials') {
            if (token) deadTokens.push(token);
          }
        }
      }
      if (deadTokens.length > 0) {
        await this.disableTokens(deadTokens);
      }
    } catch (error) {
      console.error('[eveider:expo-push] send failed', error);
    }
  }
}
