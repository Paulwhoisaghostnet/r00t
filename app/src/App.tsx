import { useState } from 'react';
import {
  getAccount,
  getRecentTransactions,
  getRecentTokenTransfers,
  isValidTezosAddress,
  type AccountInfo,
  type TxRow,
  type TokenTransferRow,
} from './lib/tzkt';
import { NIMROD_WALLET, HUMAN_WALLET } from './config';

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

export default function App() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [transfers, setTransfers] = useState<TokenTransferRow[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function fetchForAddress(addr: string) {
    const trimmed = addr.trim();
    if (!trimmed || !isValidTezosAddress(trimmed)) return;
    setError(null);
    setAccount(null);
    setTxs([]);
    setTransfers([]);
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
    <>
      <h1>r00t – Tezos wallet summary</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Enter a Tezos address to see balance, delegation, and recent activity. Data from TzKT.
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
          <h2>Account</h2>
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
          <h2>Recent XTZ transactions</h2>
          <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
            Times are block time (when the tx was included on-chain), not when this page loaded.
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
          <h2>Recent token transfers</h2>
          <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
            Times are block time (on-chain), not when this page loaded.
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

      <div className="support">
        <h2 style={{ fontSize: '0.9375rem', marginTop: 0 }}>Support this experiment</h2>
        <p>
          Nimrod&apos;s wallet (r00t experiment). Once the signer service is running, the agent can sign from this address; otherwise the human holds the keys. Payments to Nimrod&apos;s wallet fund the experiment; the human receives as intermediary.
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
    </>
  );
}
