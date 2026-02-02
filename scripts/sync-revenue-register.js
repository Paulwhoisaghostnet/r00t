#!/usr/bin/env node
/**
 * Sync revenue register from chain: fetch incoming transactions to NIMROD_WALLET from TzKT,
 * append new rows to nimrod/revenue-register.md.
 * Run from repo root: node scripts/sync-revenue-register.js
 */

const NIMROD_WALLET = 'tz1MrLSKWNZjY7ugAUUstDaAASuZVNXEuxQ7';
const TZKT = 'https://api.tzkt.io/v1';
const REGISTER_PATH = 'nimrod/revenue-register.md';
const fs = require('fs');
const path = require('path');

async function fetchIncoming(limit = 100) {
  const params = new URLSearchParams({
    'target.eq': NIMROD_WALLET,
    limit: String(limit),
    'sort.desc': 'id',
  });
  const res = await fetch(`${TZKT}/operations/transactions?${params}`);
  if (!res.ok) throw new Error(`TzKT ${res.status}`);
  return res.json();
}

function parseExistingHashes(content) {
  const hashes = new Set();
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/\|\s*[^\|]+\|\s*[^\|]+\|\s*(o[a-zA-Z0-9]+)\s*\|/);
    if (m) hashes.add(m[1]);
  }
  return hashes;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.slice(0, 10) : d.toISOString().slice(0, 10);
}

async function main() {
  const registerPath = path.resolve(process.cwd(), REGISTER_PATH);
  let existing = '';
  try {
    existing = fs.readFileSync(registerPath, 'utf8');
  } catch (_) {}
  const existingHashes = parseExistingHashes(existing);

  const txs = await fetchIncoming();
  const newRows = [];
  for (const tx of txs) {
    const hash = tx.hash;
    if (existingHashes.has(hash)) continue;
    const amount = tx.amount != null ? (tx.amount / 1_000_000).toFixed(4) : '—';
    const date = formatDate(tx.timestamp);
    const source = tx.amount >= 500_000 ? 'export' : 'incoming';
    newRows.push(`| ${date} | ${amount} | ${hash} | ${source} |`);
  }

  if (newRows.length === 0) {
    console.log('No new incoming transactions.');
    return;
  }

  const dir = path.dirname(registerPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const placeholder = '| (sync from chain) | | | |';
  const header = existing.trim() === '' ? '# Revenue register (Nimrod wallet)\n\nIncoming XTZ to NIMROD_WALLET. Sync: node scripts/sync-revenue-register.js\n\n| Date | Amount (XTZ) | Op hash | Source |\n|------|--------------|---------|--------|\n' : '';
  const insert = existing.includes(placeholder)
    ? existing.replace(placeholder, newRows.join('\n') + '\n' + placeholder)
    : header + existing.trimEnd() + (existing.trim() ? '\n' : '') + newRows.join('\n') + '\n';
  fs.writeFileSync(registerPath, insert, 'utf8');
  console.log(`Appended ${newRows.length} row(s) to ${REGISTER_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
