/**
 * Thin TzKT API client for wallet summary.
 * Base URL from config (mainnet or ghostnet).
 */

import { TZKT_BASE_URL } from '../config';

const TZKT_BASE = TZKT_BASE_URL;

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

/** Operation group by hash (list: reveal + transaction, etc.). */
interface TzktOpItem {
  type: string;
  target?: { address: string };
  amount?: number;
}

export async function getOperationByHash(hash: string): Promise<TzktOpItem[]> {
  const data = await fetchJson<TzktOpItem[]>(`${TZKT_BASE}/operations/${encodeURIComponent(hash)}`);
  return Array.isArray(data) ? data : [];
}

/** True if the op group contains a transaction to expectedTarget with amount >= minMutez. */
export function verifyPaymentInOps(ops: TzktOpItem[], expectedTarget: string, minMutez: number): boolean {
  const tx = ops.find((o) => o.type === 'transaction');
  if (!tx?.target?.address || tx.amount == null) return false;
  if (tx.target.address !== expectedTarget.trim()) return false;
  return tx.amount >= minMutez;
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
    'anyof.sender.target': address,
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
    'anyof.from.to': address,
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

/** ~24h of blocks at ~20s/block; ~30d = 30 * this */
const BLOCKS_PER_24H = 4320;
const BLOCKS_PER_30D = 30 * BLOCKS_PER_24H;

/** Get head block level from TzKT. */
export async function getHeadLevel(): Promise<number> {
  const data = await fetchJson<{ level: number }[]>(
    `${TZKT_BASE}/blocks?limit=1&sort.desc=level`
  );
  if (Array.isArray(data) && data[0]?.level != null) return data[0].level;
  throw new Error('Could not fetch head block');
}

/**
 * Token transfers FROM the given address within the last 24 hours (by block level).
 * Used for free Trader tree: who did this wallet send NFTs/tokens to?
 */
export async function getTokenTransfersFromInLast24h(
  fromAddress: string
): Promise<TokenTransferRow[]> {
  const head = await getHeadLevel();
  const levelGe = Math.max(0, head - BLOCKS_PER_24H);
  const params = new URLSearchParams({
    from: fromAddress.trim(),
    'level.ge': String(levelGe),
    limit: '500',
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

/** ~30d block window for upgraded Trader tree. */
export const TRADER_TREE_30D_BLOCKS = BLOCKS_PER_30D;

/** Payment from sender to target (for module unlock check). */
export interface PaymentRow {
  id: number;
  timestamp: string;
  amount: number;
  hash: string;
}

export async function getPaymentsFromSenderToTarget(
  sender: string,
  target: string,
  minMutez: number,
  sinceTimestamp: string
): Promise<PaymentRow[]> {
  const params = new URLSearchParams({
    sender: sender.trim(),
    target: target.trim(),
    limit: '50',
    'sort.desc': 'id',
  });
  const data = await fetchJson<TxRow[]>(
    `${TZKT_BASE}/operations/transactions?${params}`
  );
  if (!Array.isArray(data)) return [];
  const since = new Date(sinceTimestamp).getTime();
  return data
    .filter((tx) => (tx.amount ?? 0) >= minMutez && new Date(tx.timestamp).getTime() >= since)
    .map((tx) => ({
      id: tx.id,
      timestamp: tx.timestamp,
      amount: tx.amount ?? 0,
      hash: tx.hash,
    }));
}

export async function getTokenTransfersFromInLevelRange(
  fromAddress: string,
  levelGe: number,
  levelLe: number,
  limit = 500
): Promise<TokenTransferRow[]> {
  const params = new URLSearchParams({
    from: fromAddress.trim(),
    'level.ge': String(levelGe),
    'level.le': String(levelLe),
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

export interface TraderTreeNode {
  address: string;
  alias?: string;
  count: number;
  children: TraderTreeNode[];
}

export async function buildTraderTree(
  rootAddress: string,
  levelGe: number,
  levelLe: number,
  maxDepth: number,
  maxNodes: number
): Promise<{ root: TraderTreeNode; totalTransfers: number }> {
  const root: TraderTreeNode = { address: rootAddress, count: 0, children: [] };
  let totalTransfers = 0;
  let nodeCount = 1;

  const transfers0 = await getTokenTransfersFromInLevelRange(rootAddress, levelGe, levelLe, 500);
  totalTransfers += transfers0.length;
  const byTo = new Map<string, { alias?: string; count: number }>();
  for (const t of transfers0) {
    const toAddr = t.to?.address;
    if (!toAddr) continue;
    const cur = byTo.get(toAddr) ?? { alias: t.to?.alias, count: 0 };
    cur.count += 1;
    if (t.to?.alias) cur.alias = t.to.alias;
    byTo.set(toAddr, cur);
  }

  if (maxDepth < 1 || nodeCount >= maxNodes) {
    root.children = Array.from(byTo.entries()).map(([address, { alias, count }]) => ({
      address,
      alias,
      count,
      children: [],
    }));
    return { root, totalTransfers };
  }

  for (const [addr, { alias, count }] of byTo.entries()) {
    if (nodeCount >= maxNodes) break;
    const child: TraderTreeNode = { address: addr, alias, count, children: [] };
    root.children.push(child);
    nodeCount += 1;

    if (maxDepth >= 2) {
      const transfers1 = await getTokenTransfersFromInLevelRange(addr, levelGe, levelLe, 200);
      totalTransfers += transfers1.length;
      const byTo1 = new Map<string, { alias?: string; count: number }>();
      for (const t of transfers1) {
        const toAddr = t.to?.address;
        if (!toAddr) continue;
        const cur = byTo1.get(toAddr) ?? { alias: t.to?.alias, count: 0 };
        cur.count += 1;
        if (t.to?.alias) cur.alias = t.to.alias;
        byTo1.set(toAddr, cur);
      }
      for (const [addr1, { alias: a1, count: c1 }] of byTo1.entries()) {
        if (nodeCount >= maxNodes) break;
        child.children.push({ address: addr1, alias: a1, count: c1, children: [] });
        nodeCount += 1;
      }
    }
  }

  return { root, totalTransfers };
}
