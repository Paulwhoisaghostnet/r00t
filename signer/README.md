# r00t signer

Small service that holds Nimrod's Tezos secret key and signs/broadcasts transfers on request. No per-tx human signing.

**Wallet (2025-02-02):** Nimrod's wallet was replaced with a new generated wallet. The new address is funded by the user with 20 XTZ and the Tezos domain. The secret key lives only in the signer env (`NIMROD_SECRET_KEY` in `.env`); it is not shared unless Nimrod or the user decides otherwise.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `NIMROD_SECRET_KEY`:
   - **Option A:** If you have the secret for Nimrod's current wallet, paste it in `.env`.
   - **Option B:** Run `node scripts/gen-keypair.js` once; fund the printed address with 20 XTZ (and transfer the Tezos domain to it); set `NIMROD_SECRET_KEY` to the printed secret.
3. Optional: set `SIGNER_AUTH_TOKEN` so only callers with `Authorization: Bearer <token>` can use the API.
4. Optional: set `RPC_URL` (default mainnet) and `PORT` (default 3333).

The signer uses the **RPC forger** (the node forges the operation bytes) so that signing matches the node; the default local forger can produce bytes that fail validation on some RPCs. Your RPC must support the `forge/operations` endpoint.

## Run locally

```bash
npm install
npm start
```

## Endpoints

- `POST /transfer` — body `{ "to": "tz1...", "amountMutez": 1000000 }` or `"amountXtz": 1`. Returns `{ "opHash", "success" }`.
- `GET /balance` — returns `{ "address", "balanceMutez", "balanceXtz" }` for the signer's wallet.

If `SIGNER_AUTH_TOKEN` is set, send `Authorization: Bearer <token>` for both.

## Deploy

Deploy to Railway, Fly.io, Render, or any Node host. Set env vars there (never commit `.env`). Then set `SIGNER_URL` when using the transfer script (e.g. `SIGNER_URL=https://your-signer.up.railway.app`).

## Transfer script (repo root)

From r00t root:

```bash
SIGNER_URL=http://localhost:3333 node scripts/transfer.js --to=tz1cgZ6PWKoER3gvW3jGKPHgBkRnpj8XzLm2 --amount=5
```

Optional: `SIGNER_AUTH_TOKEN=<token>` for bearer auth.

## Monthly lump payout (repo root)

Nimrod receives export payments to its wallet and pays the human once per month in a lump sum:

```bash
SIGNER_URL=http://localhost:3333 node scripts/monthly-payout.js
```

Sends (balance − 0.5 XTZ reserve) to the human wallet. Run monthly (or when you want to turn over accumulated XTZ).
