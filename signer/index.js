/**
 * Nimrod signer service: holds NIMROD_SECRET_KEY, signs and broadcasts Tezos transfers.
 * Env: NIMROD_SECRET_KEY, optional SIGNER_AUTH_TOKEN, RPC_URL, PORT.
 * Loads .env from signer directory when present.
 */

import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3333;
const RPC_URL = process.env.RPC_URL || 'https://mainnet.api.tez.ie';
const AUTH_TOKEN = process.env.SIGNER_AUTH_TOKEN || '';
const SECRET_KEY = (process.env.NIMROD_SECRET_KEY || '').trim();

const TEZOS_ADDRESS_REGEX = /^(tz[123]|KT1)[a-zA-Z0-9]{33}$/;

function authMiddleware(req, res, next) {
  if (!AUTH_TOKEN) return next();
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireSecret(req, res, next) {
  if (!SECRET_KEY || !SECRET_KEY.startsWith('edsk')) {
    return res.status(503).json({ error: 'NIMROD_SECRET_KEY not configured' });
  }
  next();
}

app.get('/balance', authMiddleware, requireSecret, async (req, res) => {
  try {
    const { InMemorySigner } = await import('@taquito/signer');
    const { TezosToolkit } = await import('@taquito/taquito');
    const tezos = new TezosToolkit(RPC_URL);
    tezos.setProvider({ signer: await InMemorySigner.fromSecretKey(SECRET_KEY) });
    const pkh = await tezos.signer.publicKeyHash();
    const balance = await tezos.tz.getBalance(pkh);
    const balanceMutez = balance.toNumber();
    res.json({
      address: pkh,
      balanceMutez,
      balanceXtz: balanceMutez / 1_000_000,
    });
  } catch (err) {
    console.error('GET /balance error', err);
    res.status(500).json({ error: err.message || 'Failed to get balance' });
  }
});

app.post('/transfer', authMiddleware, requireSecret, async (req, res) => {
  let to = req.body?.to;
  let amountMutez = req.body?.amountMutez;
  const amountXtz = req.body?.amountXtz;
  if (amountXtz != null && (amountMutez == null || amountMutez === 0)) {
    amountMutez = Math.round(Number(amountXtz) * 1_000_000);
  }
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "to" address' });
  }
  to = to.trim();
  if (!TEZOS_ADDRESS_REGEX.test(to)) {
    return res.status(400).json({ error: 'Invalid Tezos address (tz1/tz2/tz3/KT1)' });
  }
  const amount = Number(amountMutez);
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'Missing or invalid amountMutez / amountXtz' });
  }
  if (amount === 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }
  try {
    const { InMemorySigner } = await import('@taquito/signer');
    const { TezosToolkit, RpcForger } = await import('@taquito/taquito');
    const tezos = new TezosToolkit(RPC_URL);
    tezos.setProvider({
      signer: await InMemorySigner.fromSecretKey(SECRET_KEY),
      forger: tezos.getFactory(RpcForger)(),
    });
    const op = await tezos.wallet.transfer({ to, amount, mutez: true }).send();
    await op.confirmation(1);
    res.json({ opHash: op.hash, success: true });
  } catch (err) {
    console.error('POST /transfer error', err);
    res.status(500).json({ error: err.message || 'Transfer failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Signer listening on port ${PORT}`);
  if (!SECRET_KEY) console.warn('NIMROD_SECRET_KEY not set – /transfer and /balance will return 503');
});
