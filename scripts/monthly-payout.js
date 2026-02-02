#!/usr/bin/env node
/**
 * Monthly lump payment: send Nimrod wallet balance (minus reserve for fees) to the human.
 * Run from repo root: SIGNER_URL=http://localhost:3333 node scripts/monthly-payout.js
 * Optional: SIGNER_AUTH_TOKEN=...
 * Reserve: 0.5 XTZ left in wallet for fees.
 */

const HUMAN_WALLET = 'tz1cgZ6PWKoER3gvW3jGKPHgBkRnpj8XzLm2';
const RESERVE_MUTEZ = 500_000; // 0.5 XTZ

const signerUrl = process.env.SIGNER_URL?.replace(/\/$/, '');
const authToken = process.env.SIGNER_AUTH_TOKEN;

if (!signerUrl) {
  console.error('Set SIGNER_URL (e.g. http://localhost:3333)');
  process.exit(1);
}

const headers = {};
if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

async function main() {
  const balanceRes = await fetch(`${signerUrl}/balance`, { headers });
  if (!balanceRes.ok) {
    console.error('Balance failed:', balanceRes.status, await balanceRes.text());
    process.exit(1);
  }
  const { balanceMutez } = await balanceRes.json();
  const toSend = balanceMutez - RESERVE_MUTEZ;
  if (toSend <= 0) {
    console.log('Balance too low to send (reserve 0.5 XTZ). Balance:', balanceMutez / 1e6, 'XTZ');
    return;
  }

  const transferRes = await fetch(`${signerUrl}/transfer`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: HUMAN_WALLET, amountMutez: toSend }),
  });
  const body = await transferRes.json().catch(() => ({}));
  if (!transferRes.ok) {
    console.error('Transfer failed:', body.error || transferRes.statusText);
    process.exit(1);
  }
  console.log('Sent', (toSend / 1e6).toFixed(4), 'XTZ to human. Op hash:', body.opHash || body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
