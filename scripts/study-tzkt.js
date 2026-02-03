#!/usr/bin/env node
/**
 * Study TzKT: incremental fetch of blocks and transactions into .study/tzkt/{network}/.
 * Database is gitignored; use export workflow to copy subsets to project folders.
 * Run from repo root: node scripts/study-tzkt.js [mainnet|ghostnet] [--limit N]
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(process.cwd(), '.study', 'tzkt');
const TZKT_URL = {
  mainnet: 'https://api.tzkt.io/v1',
  ghostnet: 'https://ghostnet.tzkt.io/v1',
};

function loadMeta() {
  const p = path.join(BASE, 'meta.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { mainnet: { lastLevel: 0 }, ghostnet: { lastLevel: 0 } };
  }
}

function saveMeta(meta) {
  fs.mkdirSync(BASE, { recursive: true });
  fs.writeFileSync(path.join(BASE, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
}

function appendNdjson(network, kind, rows) {
  if (rows.length === 0) return;
  const dir = path.join(BASE, network);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${kind}.ndjson`);
  const lines = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.appendFileSync(file, lines);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TzKT ${res.status}: ${url}`);
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const network = args.find((a) => a === 'mainnet' || a === 'ghostnet') || 'mainnet';
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : 100;
  const baseUrl = TZKT_URL[network];

  const meta = loadMeta();
  const cursor = meta[network]?.lastLevel ?? 0;

  // Fetch blocks: level.ge=cursor, sort.asc=level
  const blocksUrl = `${baseUrl}/blocks?level.ge=${cursor}&limit=${limit}&sort.asc=level`;
  const blocks = await fetchJson(blocksUrl);
  if (Array.isArray(blocks) && blocks.length > 0) {
    appendNdjson(network, 'blocks', blocks);
    const lastBlock = blocks[blocks.length - 1];
    meta[network] = meta[network] || {};
    meta[network].lastLevel = Math.max(meta[network].lastLevel || 0, lastBlock.level);
  }

  // Fetch transactions: level.ge=cursor, sort.asc=id
  const txUrl = `${baseUrl}/operations/transactions?level.ge=${cursor}&limit=${limit}&sort.asc=id`;
  const txs = await fetchJson(txUrl);
  if (Array.isArray(txs) && txs.length > 0) {
    appendNdjson(network, 'transactions', txs);
    const lastTx = txs[txs.length - 1];
    meta[network] = meta[network] || {};
    meta[network].lastLevel = Math.max(meta[network].lastLevel || 0, lastTx.level);
  }

  saveMeta(meta);
  console.log(`Study ${network}: appended ${blocks?.length ?? 0} blocks, ${txs?.length ?? 0} transactions. lastLevel=${meta[network].lastLevel}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
