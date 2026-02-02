/**
 * Thin TzKT API client for wallet summary.
 * Uses public api.tzkt.io; no backend. Patterns from reference projects.
 */

const TZKT_BASE = 'https://api.tzkt.io/v1';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TzKT ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  return res.json();
}

export interface AccountInfo {
  balance: number;
  type: string;
  firstActivity?: string;
  delegate?: string;
  delegateAlias?: string;
}

export function isValidTezosAddress(address: string): boolean {
  return /^(tz[123]|KT1)[a-zA-Z0-9]{33}$/.test(address.trim());
}

export async function getAccount(address: string): Promise<AccountInfo | null> {
  try {
    const data = await fetchJson<{
      balance?: number;
      type?: string;
      firstActivityTime?: string;
      delegate?: { address: string; alias?: string };
    }>(`${TZKT_BASE}/accounts/${address}`);
    return {
      balance: (data.balance ?? 0) / 1_000_000,
      type: data.type ?? 'unknown',
      firstActivity: data.firstActivityTime,
      delegate: data.delegate?.address,
      delegateAlias: data.delegate?.alias,
    };
  } catch {
    return null;
  }
}

export interface TxRow {
  id: number;
  level: number;
  timestamp: string;
  hash: string;
  sender?: { address: string; alias?: string };
  target?: { address: string; alias?: string };
  amount?: number;
  fee?: number;
  status?: string;
}

export async function getRecentTransactions(
  address: string,
  limit = 20
): Promise<TxRow[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: 'desc',
  });
  const data = await fetchJson<TxRow[]>(
    `${TZKT_BASE}/accounts/${encodeURIComponent(address)}/operations/transactions?${params}`
  );
  return Array.isArray(data) ? data : [];
}

export interface TokenTransferRow {
  id: number;
  level: number;
  timestamp: string;
  from?: { address: string; alias?: string };
  to?: { address: string; alias?: string };
  amount?: string;
  token?: {
    contract?: { address: string };
    tokenId?: string;
    metadata?: { symbol?: string; name?: string; decimals?: string };
  };
}

export async function getRecentTokenTransfers(
  address: string,
  limit = 15
): Promise<TokenTransferRow[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: 'desc',
  });
  const data = await fetchJson<TokenTransferRow[]>(
    `${TZKT_BASE}/accounts/${encodeURIComponent(address)}/operations/token_transfers?${params}`
  );
  return Array.isArray(data) ? data : [];
}
