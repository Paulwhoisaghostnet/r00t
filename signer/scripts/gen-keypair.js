#!/usr/bin/env node
/**
 * One-time script: generate a new Tezos keypair (mnemonic + address + secret key).
 * Fund the printed address, then set NIMROD_SECRET_KEY to the printed secret in the signer env.
 * Run from signer/: node scripts/gen-keypair.js
 */

import bip39 from 'bip39';
import { InMemorySigner } from '@taquito/signer';

const mnemonic = bip39.generateMnemonic(128); // 12 words
const signer = InMemorySigner.fromMnemonic({ mnemonic, curve: 'ed25519' });
const pkh = await signer.publicKeyHash();
const sk = await signer.secretKey();

console.log('--- New Tezos keypair (Option B: new wallet) ---');
console.log('Address (fund this):', pkh);
console.log('Secret key (set as NIMROD_SECRET_KEY):', sk);
console.log('Mnemonic (store offline if you want recovery):', mnemonic);
console.log('---');
console.log('Next: fund the address, then set NIMROD_SECRET_KEY in the signer service env.');
