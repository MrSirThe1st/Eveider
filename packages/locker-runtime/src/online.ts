export type OnlineActionClient = {
  authorize(body: Record<string, unknown>): Promise<
    | { ok: true; sessionId: string; compartmentId: string }
    | { ok: false; code: string }
  >;
  confirm(sessionId: string, body: Record<string, unknown>): Promise<boolean>;
  cancel(sessionId: string): Promise<boolean>;
  reportRecipientCollection(body: Record<string, unknown>): Promise<boolean>;
};

export type HardwareCommandLog = {
  command: 'open';
  compartmentId: string;
  sessionId?: string;
  credentialId?: string;
};

/**
 * Online-required actions fail closed: no OPEN unless Eveider authorized.
 * Physical evidence, not command acceptance, decides confirm vs cancel.
 */
export async function executeOnlineLockerAction(input: {
  client: OnlineActionClient;
  authorizeBody: Record<string, unknown>;
  occupancyRequired: boolean;
  open: (compartmentId: string) => Promise<{ accepted: boolean }>;
  evidence: (compartmentId: string) => Promise<{
    doorOpened: boolean;
    doorClosed: boolean;
    occupancy: 'occupied' | 'empty' | 'unknown';
  }>;
  success: (evidence: {
    doorOpened: boolean;
    doorClosed: boolean;
    occupancy: 'occupied' | 'empty' | 'unknown';
    occupancyRequired: boolean;
  }) => boolean;
  log?: (entry: HardwareCommandLog) => void;
}): Promise<
  | { opened: false; reason: string }
  | { opened: true; confirmed: boolean; sessionId: string; deviceEventId: string; queued: boolean }
> {
  const authorized = await input.client.authorize(input.authorizeBody);
  if (!authorized.ok) {
    return { opened: false, reason: authorized.code };
  }

  const opened = await input.open(authorized.compartmentId);
  input.log?.({
    command: 'open',
    compartmentId: authorized.compartmentId,
    sessionId: authorized.sessionId,
  });
  if (!opened.accepted) {
    await input.client.cancel(authorized.sessionId);
    return { opened: false, reason: 'HARDWARE_REJECTED' };
  }

  const evidence = await input.evidence(authorized.compartmentId);
  const deviceEventId = `session-confirm:${authorized.sessionId}`;
  if (!input.success({ ...evidence, occupancyRequired: input.occupancyRequired })) {
    await input.client.cancel(authorized.sessionId);
    return { opened: true, confirmed: false, sessionId: authorized.sessionId, deviceEventId, queued: false };
  }

  const confirmed = await input.client.confirm(authorized.sessionId, {
    result: 'success',
    deviceEventId,
    sensorConfirmed: evidence.occupancy !== 'unknown',
  });
  return {
    opened: true,
    confirmed,
    sessionId: authorized.sessionId,
    deviceEventId,
    queued: !confirmed,
  };
}
