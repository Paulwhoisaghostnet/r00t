/**
 * Beacon wallet connect for r00t Cockpit.
 * Connect, sign auth message (prove ownership), disconnect, get active account.
 */

import { DAppClient, NetworkType, SigningType } from '@airgap/beacon-sdk';
import { NETWORK } from '../config';

let client: DAppClient | null = null;

function getClient(): DAppClient {
  if (!client) {
    client = new DAppClient({
      name: 'r00t Cockpit',
      preferredNetwork: NETWORK === 'ghostnet' ? NetworkType.GHOSTNET : NetworkType.MAINNET,
    });
  }
  return client;
}

/** Auth message payload; user must sign this to prove wallet ownership. */
const AUTH_PAYLOAD_PREFIX = 'r00t Cockpit auth ';

/** Request wallet connection and proof of ownership (sign auth message). Returns address or null if user cancelled or refused sign. */
export async function connectWallet(): Promise<string | null> {
  const c = getClient();
  try {
    const perm = await c.requestPermissions();
    const address = perm.address ?? null;
    if (!address) return null;
    const payload = AUTH_PAYLOAD_PREFIX + new Date().toISOString().slice(0, 10);
    await c.requestSignPayload({ signingType: SigningType.RAW, payload });
    return address;
  } catch {
    return null;
  }
}

/** Disconnect active account (clears Beacon state). */
export async function disconnectWallet(): Promise<void> {
  const c = getClient();
  try {
    await c.clearActiveAccount();
  } catch {
    // ignore
  }
}

/** Get currently active account address without prompting. */
export async function getActiveAccount(): Promise<string | null> {
  const c = getClient();
  try {
    const acc = await c.getActiveAccount();
    return acc?.address ?? null;
  } catch {
    return null;
  }
}
