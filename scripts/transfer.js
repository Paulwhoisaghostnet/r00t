#!/usr/bin/env node
/**
 * Call the signer service to send XTZ. Usage:
 *   SIGNER_URL=https://... node scripts/transfer.js --to=tz1... --amount=5
 * Optional: SIGNER_AUTH_TOKEN=... for Bearer auth.
 * Amount is in XTZ (e.g. --amount=5 means 5 XTZ).
 */

const args = process.argv.slice(2);
let to, amount;
for (const a of args) {
  if (a.startsWith('--to=')) to = a.slice(5).trim();
  if (a.startsWith('--amount=')) amount = Number(a.slice(9));
}
const signerUrl = process.env.SIGNER_URL?.replace(/\/$/, '');
const authToken = process.env.SIGNER_AUTH_TOKEN;

if (!signerUrl) {
  console.error('Set SIGNER_URL (e.g. http://localhost:3333 or your deployed signer)');
  process.exit(1);
}
if (!to || !/^(tz[123]|KT1)[a-zA-Z0-9]{33}$/.test(to)) {
  console.error('Provide a valid Tezos address: --to=tz1...');
  process.exit(1);
}
if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Provide amount in XTZ: --amount=5');
  process.exit(1);
}

const amountMutez = Math.round(amount * 1_000_000);
const headers = { 'Content-Type': 'application/json' };
if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

fetch(`${signerUrl}/transfer`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ to, amountMutez }),
})
  .then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(body.error || res.statusText || res.status);
      process.exit(1);
    }
    console.log(body.opHash || body);
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
