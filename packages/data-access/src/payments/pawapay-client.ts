import { getPawaPayConfig } from './pawapay-config.js';

export type InitiateDepositInput = {
  depositId: string;
  amount: string;
  currency: string;
  phoneNumber: string;
  provider: string;
};

export type DepositInitiationResult =
  | {
      ok: true;
      depositId: string;
      status: string;
      created?: string;
    }
  | { ok: false; status: number; error: string };

export type DepositStatusResult =
  | {
      ok: true;
      depositId: string;
      status: string;
      failureReason?: string | null;
    }
  | { ok: false; status: number; error: string };

type PawaPayErrorBody = {
  errorMessage?: string;
  error?: { message?: string };
};

async function pawapayRequest<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T }> {
  const config = getPawaPayConfig();
  if (!config) {
    throw new Error('PawaPay is not configured');
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, status: response.status, body };
}

function readError(status: number, body: unknown): string {
  const payload = body as PawaPayErrorBody;
  return payload.errorMessage ?? payload.error?.message ?? `PawaPay API error (${status})`;
}

export async function initiatePawaPayDeposit(
  input: InitiateDepositInput,
): Promise<DepositInitiationResult> {
  const { ok, status, body } = await pawapayRequest<{
    depositId?: string;
    status?: string;
    created?: string;
  }>('/v2/deposits', {
    method: 'POST',
    body: JSON.stringify({
      depositId: input.depositId,
      amount: input.amount,
      currency: input.currency,
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber: input.phoneNumber,
          provider: input.provider,
        },
      },
    }),
  });

  if (!ok) {
    return { ok: false, status, error: readError(status, body) };
  }

  return {
    ok: true,
    depositId: body.depositId ?? input.depositId,
    status: body.status ?? 'UNKNOWN',
    created: body.created,
  };
}

export async function getPawaPayDepositStatus(depositId: string): Promise<DepositStatusResult> {
  const { ok, status, body } = await pawapayRequest<{
    depositId?: string;
    status?: string;
    failureReason?: string | null;
  }>(`/v2/deposits/${depositId}`);

  if (!ok) {
    return { ok: false, status, error: readError(status, body) };
  }

  return {
    ok: true,
    depositId: body.depositId ?? depositId,
    status: body.status ?? 'UNKNOWN',
    failureReason: body.failureReason ?? null,
  };
}

export type PawaPayProviderOption = {
  id: string;
  label: string;
};

export async function listPawaPayDepositProviders(): Promise<PawaPayProviderOption[]> {
  const config = getPawaPayConfig();
  if (!config) return [];

  const { ok, body } = await pawapayRequest<{
    countries?: Array<{
      country: string;
      providers?: Array<{ provider: string; displayName?: string }>;
    }>;
  }>(`/v2/active-conf?country=${config.country}&operationType=DEPOSIT`);

  if (!ok) return [];

  const country = body.countries?.find((entry) => entry.country === config.country);
  return (
    country?.providers?.map((provider) => ({
      id: provider.provider,
      label: provider.displayName ?? provider.provider,
    })) ?? []
  );
}

export type PawaPayDepositCallback = {
  depositId: string;
  status: string;
  failureReason?: string | null;
};

export function parseDepositCallback(payload: unknown): PawaPayDepositCallback | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.depositId !== 'string' || typeof record.status !== 'string') {
    return null;
  }
  return {
    depositId: record.depositId,
    status: record.status,
    failureReason:
      typeof record.failureReason === 'string'
        ? record.failureReason
        : record.failureReason === null
          ? null
          : undefined,
  };
}

export function mapPawaPayDepositStatus(status: string): 'processing' | 'completed' | 'failed' {
  const normalized = status.toUpperCase();
  if (normalized === 'COMPLETED') return 'completed';
  if (['FAILED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(normalized)) return 'failed';
  return 'processing';
}
