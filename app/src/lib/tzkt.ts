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

interface TzktTransactionRaw extends TxRow {
  bakerFee?: number;
}

export async function getRecentTransactions(
  address: string,
  limit = 20
): Promise<TxRow[]> {
  const params = new URLSearchParams({
    account: address,
    limit: String(limit),
    'sort.desc': 'id',
  });
  const data = await fetchJson<TzktTransactionRaw[]>(
    `${TZKT_BASE}/operations/transactions?${params}`
  );
  if (!Array.isArray(data)) return [];
  if (data.length === 0) return [];

  const levels = [...new Set(data.map((row) => row.level))];
  const levelToTimestamp = await getBlockTimestamps(levels);

  return data.map((row) => ({
    ...row,
    fee: row.fee ?? row.bakerFee,
    timestamp: levelToTimestamp[row.level] ?? row.timestamp,
  }));
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

interface TzktTokenTransferRaw {
  id: number;
  level: number;
  timestamp: string;
  from?: { address: string; alias?: string };
  to?: { address: string; alias?: string };
  amount?: string;
  token?: {
    id?: number;
    contract?: { address: string; alias?: string };
    tokenId?: string;
    standard?: string;
  };
}

async function getBlockTimestamps(levels: number[]): Promise<Record<number, string>> {
  if (levels.length === 0) return {};
  const levelParams = new URLSearchParams({
    'level.in': levels.slice(0, 50).join(','),
    limit: String(levels.length),
  });
  const blocks = await fetchJson<{ level: number; timestamp: string }[]>(
    `${TZKT_BASE}/blocks?${levelParams}`
  );
  const out: Record<number, string> = {};
  if (Array.isArray(blocks)) {
    for (const b of blocks) {
      if (b.level != null && b.timestamp) out[b.level] = b.timestamp;
    }
  }
  return out;
}

export async function getRecentTokenTransfers(
  address: string,
  limit = 15
): Promise<TokenTransferRow[]> {
  const params = new URLSearchParams({
    account: address,
    limit: String(limit),
    'sort.desc': 'id',
  });
  const data = await fetchJson<TzktTokenTransferRaw[]>(
    `${TZKT_BASE}/tokens/transfers?${params}`
  );
  if (!Array.isArray(data)) return [];
  const levels = [...new Set(data.map((row) => row.level))];
  const levelToTimestamp = await getBlockTimestamps(levels);
  return data.map((row) => ({
    id: row.id,
    level: row.level,
    timestamp: levelToTimestamp[row.level] ?? row.timestamp,
    from: row.from,
    to: row.to,
    amount: row.amount,
    token: row.token
      ? {
          contract: row.token.contract,
          tokenId: row.token.tokenId,
          metadata: {
            symbol: row.token.contract?.alias ?? row.token.standard,
            name: row.token.contract?.alias ?? row.token.standard,
          },
        }
      : undefined,
  }));
}
