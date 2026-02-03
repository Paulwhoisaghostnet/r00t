#!/usr/bin/env node
/**
 * Charlie Ghostnet test: TzKT API pathways for all 5 Charlie wallets.
 * Reads addresses from nimrod/charlie-ghostnet-wallets.md (gitignored).
 * Run from repo root: node scripts/charlie-ghostnet-test.js
 * Appends results to nimrod/charlie-test-log.md.
 */

const fs = require('fs');
const path = require('path');

const TZKT_BASE = 'https://api.ghostnet.tzkt.io/v1';
const NIMROD_WALLET = 'tz1MrLSKWNZjY7ugAUUstDaAASuZVNXEuxQ7';
const WALLETS_PATH = path.join(process.cwd(), 'nimrod', 'charlie-ghostnet-wallets.md');
const LOG_PATH = path.join(process.cwd(), 'nimrod', 'charlie-test-log.md');

function extractAddresses(md) {
  const re = /Address[^`]*`(tz[123][a-zA-Z0-9]{33})`/g;
  const out = [];
  let m;
  while ((m = re.exec(md)) !== null) out.push(m[1]);
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`TzKT ${res.status}: ${text.slice(0, 200)}`);
  if (text.startsWith('<!')) throw new Error('TzKT returned HTML instead of JSON');
  return JSON.parse(text);
}

async function getAccount(address) {
  try {
    return await fetchJson(`${TZKT_BASE}/accounts/${address}`);
  } catch (e) {
    return null;
  }
}

async function getHeadLevel() {
  const blocks = await fetchJson(`${TZKT_BASE}/blocks?limit=1&sort.desc=level`);
  return Array.isArray(blocks) && blocks[0]?.level != null ? blocks[0].level : 0;
}

async function getRecentTxs(address, limit = 5) {
  const params = new URLSearchParams({
    'anyof.sender.target': address,
    limit: String(limit),
    'sort.desc': 'id',
  });
  const data = await fetchJson(`${TZKT_BASE}/operations/transactions?${params}`);
  return Array.isArray(data) ? data : [];
}

async function getTokenTransfersFrom(address, levelGe, limit = 50) {
  const params = new URLSearchParams({
    from: address,
    'level.ge': String(levelGe),
    limit: String(limit),
    'sort.desc': 'id',
  });
  const data = await fetchJson(`${TZKT_BASE}/tokens/transfers?${params}`);
  return Array.isArray(data) ? data : [];
}

function ensureLog() {
  if (!fs.existsSync(LOG_PATH)) {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.writeFileSync(LOG_PATH, '# Charlie test log\n\n', 'utf8');
  }
}

function appendLog(entry) {
  ensureLog();
  const line = `\n---\n**${new Date().toISOString()}**\n\n${entry}\n`;
  fs.appendFileSync(LOG_PATH, line, 'utf8');
}

async function main() {
  let md;
  try {
    md = fs.readFileSync(WALLETS_PATH, 'utf8');
  } catch (e) {
    console.error('Missing nimrod/charlie-ghostnet-wallets.md');
    process.exit(1);
  }

  const addresses = extractAddresses(md);
  if (addresses.length === 0) {
    console.error('No Charlie addresses found in wallets file');
    process.exit(1);
  }

  console.log(`Charlie Ghostnet test: ${addresses.length} wallets, TzKT base ${TZKT_BASE}\n`);

  const headLevel = await getHeadLevel();
  const level24hAgo = Math.max(0, headLevel - 4320); // ~24h blocks

  const results = [];
  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    const short = `${addr.slice(0, 8)}…${addr.slice(-4)}`;
    const walletNum = i + 1;
    const errs = [];

    try {
      const account = await getAccount(addr);
      if (!account) errs.push('getAccount: null or error');
      const txs = await getRecentTxs(addr, 5);
      if (!Array.isArray(txs)) errs.push('getRecentTxs: not array');
      const transfers24h = await getTokenTransfersFrom(addr, level24hAgo, 30);
      if (!Array.isArray(transfers24h)) errs.push('getTokenTransfersFrom(24h): not array');
    } catch (e) {
      errs.push(e.message || String(e));
    }

    const ok = errs.length === 0;
    results.push({ walletNum, address: addr, short, ok, errs });
    console.log(`  Wallet ${walletNum} ${short}: ${ok ? 'OK' : 'FAIL'}${errs.length ? ' ' + errs.join('; ') : ''}`);
  }

  // One Trader-tree style check: payments to NIMROD_WALLET in last 30d (level range)
  const level30dAgo = Math.max(0, headLevel - 4320 * 30);
  let paymentCheck = 'skipped';
  try {
    const params = new URLSearchParams({
      sender: addresses[0],
      target: NIMROD_WALLET,
      'level.ge': String(level30dAgo),
      limit: '5',
      'sort.desc': 'id',
    });
    const payments = await fetchJson(`${TZKT_BASE}/operations/transactions?${params}`);
    paymentCheck = Array.isArray(payments) ? `found ${payments.length} payment(s)` : 'unexpected response';
  } catch (e) {
    paymentCheck = `error: ${e.message}`;
  }
  console.log(`  Payment check (wallet 1 → NIMROD): ${paymentCheck}`);

  const allOk = results.every((r) => r.ok);
  const logEntry = [
    '## Charlie Ghostnet API test (TzKT)',
    `- Wallets: ${addresses.length}`,
    `- Head level: ${headLevel}`,
    `- Result: ${allOk ? 'PASS' : 'FAIL'}`,
    '',
    '| Wallet | Address | Status |',
    '|--------|---------|--------|',
    ...results.map((r) => `| ${r.walletNum} | ${r.short} | ${r.ok ? 'OK' : r.errs.join('; ')} |`),
    '',
    `- Payment check (wallet 1 → NIMROD_WALLET): ${paymentCheck}`,
  ].join('\n');

  appendLog(logEntry);
  console.log('\n' + (allOk ? 'PASS' : 'FAIL') + ' – log appended to nimrod/charlie-test-log.md');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  appendLog(`**Error:** ${err.message}\n`);
  process.exit(1);
});
