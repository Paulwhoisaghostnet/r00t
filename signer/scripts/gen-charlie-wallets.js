#!/usr/bin/env node
/**
 * Generate 5 Tezos keypairs for Charlie (Ghostnet test wallets).
 * Writes addresses and secret keys to nimrod/charlie-ghostnet-wallets.md.
 * Run from repo root: node signer/scripts/gen-charlie-wallets.js
 * BACK UP: nimrod/charlie-ghostnet-wallets.md (contains secret keys).
 */

import bip39 from 'bip39';
import { InMemorySigner } from '@taquito/signer';
import fs from 'fs';
import path from 'path';

const NUM_WALLETS = 5;
const OUT_PATH = path.resolve(process.cwd(), 'nimrod', 'charlie-ghostnet-wallets.md');

async function generateOne(label) {
  const mnemonic = bip39.generateMnemonic(128);
  const signer = InMemorySigner.fromMnemonic({ mnemonic, curve: 'ed25519' });
  const address = await signer.publicKeyHash();
  const secretKey = await signer.secretKey();
  return { label, address, secretKey, mnemonic };
}

const lines = [
  '# CHARLIE\'S GHOSTNET WALLETS – NOT NIMROD\'S KEYS',
  '',
  'These 5 wallets belong to the subagent **Charlie** for Ghostnet testing only.',
  'Do not confuse with Nimrod\'s wallet (NIMROD_SECRET_KEY in signer/.env).',
  '',
  '**Back up this file.** It is gitignored. Contains secret keys.',
  '',
  '---',
  '',
];

for (let i = 1; i <= NUM_WALLETS; i++) {
  const w = await generateOne(`Charlie wallet ${i}`);
  lines.push(`## ${w.label}`);
  lines.push('');
  lines.push(`- **Address (fund on Ghostnet faucet):** \`${w.address}\``);
  lines.push(`- **Secret key:** \`${w.secretKey}\``);
  lines.push(`- **Mnemonic (recovery):** ${w.mnemonic}`);
  lines.push('');
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');

console.log('Generated 5 Charlie Ghostnet wallets.');
console.log('Output:', OUT_PATH);
console.log('Back up this file. Fund the 5 addresses on https://faucet.ghostnet.teztnets.com');
