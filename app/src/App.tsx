import { useState, useEffect } from 'react';
import {
  getAccount,
  getRecentTransactions,
  getRecentTokenTransfers,
  getOperationByHash,
  verifyPaymentInOps,
  getTokenTransfersFromInLast24h,
  getPaymentsFromSenderToTarget,
  getHeadLevel,
  buildTraderTree,
  TRADER_TREE_30D_BLOCKS,
  isValidTezosAddress,
  type AccountInfo,
  type TxRow,
  type TokenTransferRow,
  type TraderTreeNode,
} from './lib/tzkt';
import { connectWallet, disconnectWallet, getActiveAccount } from './lib/beacon';
import { NIMROD_WALLET, HUMAN_WALLET, EXPORT_PRICE_MUTEZ, TRADER_TREE_UPGRADED_PRICE_MUTEZ, TRADER_TREE_UPGRADED_DAYS, NIMROD_TEST_MODE } from './config';

function formatXtz(mutez: number): string {
  return (mutez / 1_000_000).toFixed(4);
}

function shortHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function shortAddr(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function formatTime(iso: string | undefined): string {
  if (iso == null || iso === '') return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

type ModuleId = 'wallet' | 'trader-tree';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('wallet');
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (NIMROD_TEST_MODE) {
      setConnectedAddress(NIMROD_WALLET);
      return;
    }
    getActiveAccount().then((addr) => setConnectedAddress(addr));
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      if (addr) setConnectedAddress(addr);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (NIMROD_TEST_MODE) return;
    await disconnectWallet();
    setConnectedAddress(null);
  }

  return (
    <>
      <header className="cockpit-header">
        <h1>r00t – Cockpit</h1>
        <p className="muted cockpit-tagline">
          Tezos analytics: wallet summary, token flows, and more. Data from TzKT. Some modules are free; upgraded modules unlock with a small XTZ payment for 30 days.
        </p>
        <div className="header-row">
          <nav className="module-nav" aria-label="Modules">
            <button
              type="button"
              className={`module-tab ${activeModule === 'wallet' ? 'active' : ''}`}
              onClick={() => setActiveModule('wallet')}
            >
              Wallet summary
            </button>
            <button
              type="button"
              className={`module-tab ${activeModule === 'trader-tree' ? 'active' : ''}`}
              onClick={() => setActiveModule('trader-tree')}
            >
              Trader tree
            </button>
          </nav>
          <div className="wallet-connect">
            {NIMROD_TEST_MODE && (
              <span className="muted" style={{ fontSize: '0.75rem', marginRight: '0.5rem' }} title="Dev-only: connected as Nimrod without Beacon">
                Test mode (Nimrod)
              </span>
            )}
            {connectedAddress ? (
              <>
                <span className="wallet-addr" title={connectedAddress}>
                  {shortAddr(connectedAddress)}
                </span>
                {!NIMROD_TEST_MODE && (
                  <button type="button" className="btn-secondary" onClick={handleDisconnect}>
                    Disconnect
                  </button>
                )}
              </>
            ) : (
              <button type="button" onClick={handleConnect} disabled={connecting}>
                {connecting ? 'Connecting…' : 'Connect wallet'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="cockpit-main">
        {activeModule === 'wallet' && (
          <WalletSummaryModule />
        )}
        {activeModule === 'trader-tree' && (
          <TraderTreeModule connectedAddress={connectedAddress} />
        )}
      </main>

      <SupportSection />
    </>
  );
}

function WalletSummaryModule() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [transfers, setTransfers] = useState<TokenTransferRow[]>([]);
  const [exportOpHash, setExportOpHash] = useState('');
  const [exportVerified, setExportVerified] = useState(false);
  const [exportTxs, setExportTxs] = useState<TxRow[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (NIMROD_TEST_MODE && !address) {
      setAddress(NIMROD_WALLET);
      fetchForAddress(NIMROD_WALLET);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only for test mode
  }, []);

  async function fetchForAddress(addr: string) {
    const trimmed = addr.trim();
    if (!trimmed || !isValidTezosAddress(trimmed)) return;
    setError(null);
    setAccount(null);
    setTxs([]);
    setTransfers([]);
    setExportVerified(false);
    setExportTxs([]);
    setExportOpHash('');
    setExportError(null);
    setLoading(true);
    try {
      const [acc, txList, transferList] = await Promise.all([
        getAccount(trimmed),
        getRecentTransactions(trimmed, 15),
        getRecentTokenTransfers(trimmed, 10),
      ]);
      setAccount(acc);
      setTxs(txList);
      setTransfers(transferList);
      if (!acc) setError('Account not found or no activity.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Enter a Tezos address (tz1, tz2, tz3, or KT1).');
      return;
    }
    if (!isValidTezosAddress(trimmed)) {
      setError('Invalid Tezos address format.');
      return;
    }
    setAddress(trimmed);
    fetchForAddress(trimmed);
  }

  function handleViewNimrodWallet() {
    setAddress(NIMROD_WALLET);
    fetchForAddress(NIMROD_WALLET);
  }

  async function handleVerifyExport() {
    const hash = exportOpHash.trim();
    if (!hash || !address.trim()) return;
    setExportError(null);
    setExportLoading(true);
    try {
      const ops = await getOperationByHash(hash);
      if (!verifyPaymentInOps(ops, NIMROD_WALLET, EXPORT_PRICE_MUTEZ)) {
        setExportError('No payment found to Nimrod\'s wallet for 0.5 XTZ or more. Check the operation hash.');
        return;
      }
      const txsForExport = await getRecentTransactions(address.trim(), 100);
      setExportTxs(txsForExport);
      setExportVerified(true);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setExportLoading(false);
    }
  }

  function downloadExportCsv() {
    if (exportTxs.length === 0) return;
    const header = 'timestamp,hash,sender,target,amount_xtz,fee_xtz\n';
    const rows = exportTxs.map((tx) => {
      const ts = formatTime(tx.timestamp);
      const amt = tx.amount != null ? formatXtz(tx.amount) : '';
      const fee = tx.fee != null ? formatXtz(tx.fee) : '';
      const sender = tx.sender?.address ?? '';
      const target = tx.target?.address ?? '';
      return `${ts},${tx.hash},${sender},${target},${amt},${fee}`;
    });
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tezos-txs-${address.slice(0, 8)}-${exportTxs.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="module-content" aria-labelledby="wallet-module-title">
      <h2 id="wallet-module-title" className="module-title">Wallet summary <span className="badge free">Free</span></h2>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Enter a Tezos address to see balance, delegation, and recent activity.
      </p>
      <p style={{ marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={handleViewNimrodWallet}
          disabled={loading}
          style={{ marginRight: '0.5rem' }}
        >
          View Nimrod&apos;s wallet
        </button>
        <span className="muted"> — or enter any address below</span>
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="tz1… or KT1…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Fetch summary'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {account && (
        <div className="summary">
          <h3>Account</h3>
          <p><strong>Balance:</strong> {account.balance.toFixed(4)} XTZ</p>
          <p><strong>Type:</strong> {account.type}</p>
          {account.delegate && (
            <p><strong>Delegate:</strong> {account.delegateAlias || shortAddr(account.delegate)}</p>
          )}
          {account.firstActivity && (
            <p className="muted">First activity: {account.firstActivity.slice(0, 10)}</p>
          )}
        </div>
      )}

      {txs.length > 0 && (
        <div className="summary">
          <h3>Recent XTZ transactions</h3>
          <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
            Times are block time (on-chain).
          </p>
          <ul className="ops-list">
            {txs.map((tx) => {
              const amount = tx.amount != null ? formatXtz(tx.amount) : '—';
              const fee = tx.fee != null ? formatXtz(tx.fee) : '';
              return (
                <li key={tx.id}>
                  <span className="muted" title={tx.timestamp}>{formatTime(tx.timestamp)}</span>
                  <span>
                    {amount} XTZ {fee ? `(fee ${fee})` : ''} · {shortHash(tx.hash)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {transfers.length > 0 && (
        <div className="summary">
          <h3>Recent token transfers</h3>
          <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
            Times are block time (on-chain).
          </p>
          <ul className="ops-list">
            {transfers.map((tr) => {
              const token = tr.token?.metadata?.symbol || tr.token?.metadata?.name || 'token';
              const amount = tr.amount ?? '—';
              return (
                <li key={tr.id}>
                  <span className="muted">{formatTime(tr.timestamp)}</span>
                  <span>{amount} {token}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {account && (
        <div className="summary">
          <h3 style={{ fontSize: '0.9375rem' }}>Export transactions (paid)</h3>
          <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '-0.25rem' }}>
            Send {(EXPORT_PRICE_MUTEZ / 1_000_000).toFixed(1)} XTZ or more to Nimrod&apos;s wallet (below). Paste the operation hash from your payment. We verify on-chain and unlock a CSV of up to 100 transactions.
          </p>
          {!exportVerified ? (
            <>
              <p style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Operation hash (e.g. oo…)"
                  value={exportOpHash}
                  onChange={(e) => { setExportOpHash(e.target.value); setExportError(null); }}
                  style={{ flex: '1 1 200px', fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
                <button type="button" onClick={handleVerifyExport} disabled={exportLoading}>
                  {exportLoading ? 'Checking…' : 'Verify and unlock'}
                </button>
              </p>
              {exportError && <p className="error" style={{ marginTop: '0.5rem' }}>{exportError}</p>}
            </>
          ) : (
            <p style={{ marginTop: '0.5rem' }}>
              <button type="button" onClick={downloadExportCsv}>
                Download CSV ({exportTxs.length} transactions)
              </button>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Aggregated recipient for Trader tree: address + count of tokens received from the queried wallet. */
interface RecipientCount {
  address: string;
  alias?: string;
  count: number;
}

function TraderTreeModule({ connectedAddress }: { connectedAddress: string | null }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<RecipientCount[]>([]);
  const [totalTransfers, setTotalTransfers] = useState(0);

  // Upgraded: unlock state
  const [unlockChecked, setUnlockChecked] = useState(false);
  const [unlockedUntil, setUnlockedUntil] = useState<Date | null>(null);
  const [unlockCheckLoading, setUnlockCheckLoading] = useState(false);
  const [treeAddress, setTreeAddress] = useState('');
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeResult, setTreeResult] = useState<{ root: TraderTreeNode; totalTransfers: number } | null>(null);

  useEffect(() => {
    if (!connectedAddress) {
      setUnlockChecked(false);
      setUnlockedUntil(null);
      return;
    }
    setUnlockCheckLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - TRADER_TREE_UPGRADED_DAYS);
    getPaymentsFromSenderToTarget(
      connectedAddress,
      NIMROD_WALLET,
      TRADER_TREE_UPGRADED_PRICE_MUTEZ,
      since.toISOString()
    )
      .then((payments) => {
        setUnlockChecked(true);
        if (payments.length === 0) {
          setUnlockedUntil(null);
          return;
        }
        const latest = payments[0];
        const until = new Date(latest.timestamp);
        until.setDate(until.getDate() + TRADER_TREE_UPGRADED_DAYS);
        setUnlockedUntil(until);
      })
      .catch(() => setUnlockChecked(true))
      .finally(() => setUnlockCheckLoading(false));
  }, [connectedAddress]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Enter a Tezos address.');
      return;
    }
    if (!isValidTezosAddress(trimmed)) {
      setError('Invalid Tezos address format.');
      return;
    }
    setError(null);
    setRecipients([]);
    setTotalTransfers(0);
    setLoading(true);
    try {
      const transfers = await getTokenTransfersFromInLast24h(trimmed);
      setTotalTransfers(transfers.length);
      const byTo = new Map<string, { alias?: string; count: number }>();
      for (const t of transfers) {
        const toAddr = t.to?.address;
        if (!toAddr) continue;
        const cur = byTo.get(toAddr) ?? { alias: t.to?.alias, count: 0 };
        cur.count += 1;
        if (t.to?.alias) cur.alias = t.to.alias;
        byTo.set(toAddr, cur);
      }
      const list: RecipientCount[] = Array.from(byTo.entries())
        .map(([addr, { alias, count }]) => ({ address: addr, alias, count }))
        .sort((a, b) => b.count - a.count);
      setRecipients(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBuildTree(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = treeAddress.trim();
    if (!trimmed || !isValidTezosAddress(trimmed)) {
      setTreeError('Enter a valid Tezos address.');
      return;
    }
    setTreeError(null);
    setTreeResult(null);
    setTreeLoading(true);
    try {
      const head = await getHeadLevel();
      const levelGe = Math.max(0, head - TRADER_TREE_30D_BLOCKS);
      const { root, totalTransfers: total } = await buildTraderTree(trimmed, levelGe, head, 2, 50);
      setTreeResult({ root, totalTransfers: total });
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : 'Failed to build tree.');
    } finally {
      setTreeLoading(false);
    }
  }

  const isUnlocked = unlockedUntil != null && new Date() < unlockedUntil;

  return (
    <section className="module-content" aria-labelledby="trader-tree-module-title">
      <h2 id="trader-tree-module-title" className="module-title">
        Trader tree <span className="badge free">Free</span> / <span className="badge upgraded">Upgraded</span>
      </h2>

      {/* Free: 24h one-hop */}
      <h3 className="module-subtitle">Last 24 hours (free)</h3>
      <p className="muted" style={{ marginBottom: '0.75rem' }}>
        Who did this wallet send NFTs/tokens to in the last 24 hours? One hop only.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="tz1… or KT1…"
          value={address}
          onChange={(e) => { setAddress(e.target.value); setError(null); }}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Show recipients (24h)'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {recipients.length > 0 && (
        <div className="summary">
          <h3>Recipients (last 24h)</h3>
          <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
            {totalTransfers} transfer{totalTransfers !== 1 ? 's' : ''} to {recipients.length} address{recipients.length !== 1 ? 'es' : ''}.
          </p>
          <ul className="ops-list">
            {recipients.map((r) => (
              <li key={r.address}>
                <span className="muted">{r.address.slice(0, 10)}…{r.address.slice(-8)}</span>
                <span>{r.alias ? `${r.alias} · ` : ''}{r.count} token{r.count !== 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upgraded: 30d + tree */}
      <h3 className="module-subtitle" style={{ marginTop: '1.5rem' }}>30 days + downstream (upgraded)</h3>
      {!connectedAddress ? (
        <p className="muted">
          Connect your wallet (top right) to unlock. Then pay {(TRADER_TREE_UPGRADED_PRICE_MUTEZ / 1_000_000).toFixed(1)} XTZ to Nimrod&apos;s wallet for {TRADER_TREE_UPGRADED_DAYS} days&apos; access.
        </p>
      ) : !unlockChecked || unlockCheckLoading ? (
        <p className="muted">{unlockCheckLoading ? 'Checking unlock…' : '…'}</p>
      ) : !isUnlocked ? (
        <p className="muted">
          Pay {(TRADER_TREE_UPGRADED_PRICE_MUTEZ / 1_000_000).toFixed(1)} XTZ to Nimrod&apos;s wallet (see Support below). After paying, refresh or switch tab and back to re-check. Access lasts {TRADER_TREE_UPGRADED_DAYS} days.
        </p>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            Unlocked until {unlockedUntil!.toLocaleDateString()}. Enter any address to build the 30-day tree (root → recipients → their recipients).
          </p>
          <form onSubmit={handleBuildTree}>
            <input
              type="text"
              placeholder="tz1… or KT1…"
              value={treeAddress}
              onChange={(e) => { setTreeAddress(e.target.value); setTreeError(null); }}
              disabled={treeLoading}
            />
            <button type="submit" disabled={treeLoading}>
              {treeLoading ? 'Building…' : 'Build tree (30d)'}
            </button>
          </form>
          {treeError && <p className="error">{treeError}</p>}
          {treeResult && (
            <div className="summary">
              <h3>Tree (30d)</h3>
              <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                {treeResult.totalTransfers} transfers; up to 50 nodes, 2 hops.
              </p>
              <TraderTreeViz node={treeResult.root} depth={0} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function TraderTreeViz({ node, depth }: { node: TraderTreeNode; depth: number }) {
  const indent = depth * 1.25;
  return (
    <ul className="tree-list" style={{ marginLeft: `${indent}rem`, marginTop: '0.25rem' }}>
      <li>
        <span className="muted">{shortAddr(node.address)}</span>
        {node.alias && <span> ({node.alias})</span>}
        {node.count > 0 && <span> · {node.count} received</span>}
      </li>
      {node.children.map((child) => (
        <TraderTreeViz key={child.address} node={child} depth={depth + 1} />
      ))}
    </ul>
  );
}

function SupportSection() {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function copyAddress(addr: string, label: string) {
    try {
      await navigator.clipboard.writeText(addr);
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback(null);
    }
  }

  return (
    <div className="support">
      <h2 style={{ fontSize: '0.9375rem', marginTop: 0 }}>Support this experiment</h2>
      <p>
        Nimrod&apos;s wallet (r00t experiment). Payments to Nimrod&apos;s wallet fund the experiment; the human receives as intermediary.
      </p>
      <p style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
        <code style={{ wordBreak: 'break-all', fontSize: '0.8125rem', flex: '1 1 200px' }}>{NIMROD_WALLET}</code>
        <button type="button" onClick={() => copyAddress(NIMROD_WALLET, 'Nimrod')} style={{ flexShrink: 0 }}>
          {copyFeedback === 'Nimrod' ? 'Copied!' : 'Copy'}
        </button>
      </p>
      <p className="muted" style={{ marginTop: '0.75rem' }}>Pay the human (intermediary):</p>
      <p style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
        <code style={{ wordBreak: 'break-all', fontSize: '0.8125rem', flex: '1 1 200px' }}>{HUMAN_WALLET}</code>
        <button type="button" onClick={() => copyAddress(HUMAN_WALLET, 'Human')} style={{ flexShrink: 0 }}>
          {copyFeedback === 'Human' ? 'Copied!' : 'Copy'}
        </button>
      </p>
    </div>
  );
}
