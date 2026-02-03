# Tezos Bible – r00t reference

Single-source reference for building on Tezos in this project. Review before each Tezos-related task; after each task, append any new endpoints, libraries, or testnet steps discovered; if nothing new, add nothing.

---

## 1. Cornerstone sites and repos

| Resource | URL | Purpose |
|----------|-----|---------|
| Tezos docs | https://docs.tezos.com | Official Tezos documentation (dApps, wallets, testnets) |
| Tezos Agora | https://agora.tezos.com | Governance, protocol upgrades |
| Octez | https://octez.tezos.com | Node/RPC/shell reference |
| Beacon docs | https://docs.walletbeacon.io | Wallet connect, sign payload, first dApp |
| Beacon TypeDoc | https://typedocs.walletbeacon.io | Beacon SDK API reference |
| Beacon SDK (GitHub) | https://github.com/airgap-it/beacon-sdk | @airgap/beacon-sdk source |
| Taquito docs | https://taquito.io/docs | Taquito quick start, wallet API, signing |
| Taquito (GitHub) | https://github.com/ecadlabs/taquito | @taquito/taquito source |
| TzKT API | https://api.tzkt.io | Mainnet indexer API (v1) |
| TzKT explorer | https://tzkt.io | Block explorer |
| Baking Bad (TzKT/blog) | https://baking-bad.org/blog | TzKT migration, API practices |
| Teztnets | https://teztnets.com | Long-running testnets (Ghostnet, Shadownet) |
| Ghostnet | https://teztnets.com/ghostnet-about | Ghostnet RPC, faucet, explorer |
| Shadownet | https://teztnets.com/shadownet-about | Shadownet RPC, faucet |
| Etherlink docs | https://docs.etherlink.com | Etherlink L2 (EVM-compatible rollup) |
| Tezos-Etherlink Bridge SDK | https://github.com/baking-bad/tezos-etherlink-bridge-ts-sdk | TypeScript bridge Tezos L1 ↔ Etherlink |
| TezosJ (Java) | https://github.com/TezosRio/TezosJ_plainJava | Java Tezos SDK (Gradle, JAR) |

---

## 2. Libraries for Tezos / Etherlink / jtez

### Tezos (JavaScript / TypeScript)

| Package | npm | Purpose | Use when |
|---------|-----|---------|----------|
| @taquito/taquito | npm i @taquito/taquito | Tezos RPC, wallet ops, contract calls | Signer, balance, transfer, contract interaction |
| @taquito/beacon-wallet | npm i @taquito/beacon-wallet | Taquito wrapper for Beacon | dApp wallet provider with Taquito |
| @taquito/signer | npm i @taquito/signer | InMemorySigner, signing | Backend signer (r00t signer service) |
| @airgap/beacon-sdk | npm i @airgap/beacon-sdk | DAppClient, requestPermissions, requestSignPayload | Wallet connect and sign-message auth in frontend |
| @tzkt/sdk-api | npm i @tzkt/sdk-api | TzKT API client (TypeScript) | Optional; we use fetch + URLSearchParams in app |

### Tezos (other)

| Name | Link | Purpose |
|------|------|---------|
| PyTezos | https://pytezos.org | Python Tezos client |
| LIGO | https://ligolang.org | Smart contract language |
| SmartPy | https://smartpy.io | Smart contract language (Python) |

### Etherlink

| Name | Link | Purpose |
|------|------|---------|
| Etherlink docs | https://docs.etherlink.com | L2 EVM-compatible rollup on Tezos |
| Tezos-Etherlink Bridge TS SDK | https://github.com/baking-bad/tezos-etherlink-bridge-ts-sdk | Bridge XTZ/tokens L1 ↔ Etherlink |
| Beacon | @airgap/beacon-sdk | Same Beacon for Tezos; wallets can target Etherlink where supported |

### jtez (Java)

| Name | Link | Purpose |
|------|------|---------|
| TezosJ_plainJava | https://github.com/TezosRio/TezosJ_plainJava | Java SDK: wallets, Conseil; Gradle, JAR 1.4.1 |
| TezosJ_SDK | https://github.com/TezosRio/TezosJ_SDK | Android Java SDK for Tezos |

---

## 3. Publishing on testnets (Ghostnet / Shadownet)

### Ghostnet

| Item | Value |
|------|--------|
| RPC | https://rpc.ghostnet.teztnets.com (also ghostnet.ecadinfra.com, ghostnet.tezos.marigold.dev) |
| TzKT base | https://api.ghostnet.tzkt.io/v1 (explorer: https://ghostnet.tzkt.io) |
| Faucet | https://faucet.ghostnet.teztnets.com |
| Explorer | https://ghostnet.tzkt.io |
| Beacon network | Use preferredNetwork: "ghostnet" (or equivalent in DAppClient options) |

Steps to use Ghostnet in r00t app:

1. In app/src/config.ts set `NETWORK = 'ghostnet' as 'mainnet' | 'ghostnet'` (or keep a switch). TZKT_BASE_URL is derived from NETWORK (api.ghostnet.tzkt.io/v1 for Ghostnet).
2. Beacon DAppClient is created with preferredNetwork: NetworkType.GHOSTNET when NETWORK === 'ghostnet' (see app/src/lib/beacon.ts).
3. Set RPC to `https://rpc.ghostnet.teztnets.com` for signer or Taquito if using backend on testnet.
4. User switches wallet (e.g. Temple) to Ghostnet and gets test XTZ from faucet.
5. Deploy same frontend; no mainnet keys.

**Nimrod Ghostnet self-test:** Fund NIMROD_WALLET at the faucet (open https://faucet.ghostnet.teztnets.com, use "Fund any address", enter `tz1MrLSKWNZjY7ugAUUstDaAASuZVNXEuxQ7`; captcha may require a one-time manual step). Then run signer with `RPC_URL=https://rpc.ghostnet.teztnets.com` and POST /transfer 1 XTZ to self to unlock the upgraded module.

### Shadownet

| Item | Value |
|------|--------|
| RPC | https://rpc.shadownet.teztnets.com |
| Faucet | https://faucet.shadownet.teztnets.com |
| Note | Newer testnet; Ghostnet still primary for general dApp testing. Check teztnets.com for TzKT/explorer for Shadownet. |

### Generic (any Tezos chain testnet)

1. Set TzKT base URL and RPC for that chain.
2. Configure wallet/Beacon for that network.
3. Use that chain’s faucet for test XTZ.
4. Deploy frontend with that config; do not use mainnet keys.

---

## 4. TzKT key query paths

Base URLs:

- Mainnet: `https://api.tzkt.io/v1`
- Ghostnet: `https://api.ghostnet.tzkt.io/v1` (explorer UI is ghostnet.tzkt.io; API is api.ghostnet.tzkt.io)

### Accounts

| Endpoint | Method | Key params | Notes |
|----------|--------|------------|-------|
| /accounts/{address} | GET | — | balance (mutez), type, firstActivityTime, delegate.address, delegate.alias |

### Operations

| Endpoint | Method | Key params | Notes |
|----------|--------|------------|-------|
| /operations/{hash} | GET | — | Returns array of ops in group (transaction, reveal, etc.). Use for payment verification. |
| /operations/transactions | GET | sender, target, anyof.sender.target, level.ge, level.le, limit, sort.desc | Transactions. target.eq used in sync-revenue-register. |

### Blocks

| Endpoint | Method | Key params | Notes |
|----------|--------|------------|-------|
| /blocks | GET | level.in (comma-separated), limit, sort.desc | level.in for timestamps; limit=1&sort.desc=level for head. |

### Token transfers

| Endpoint | Method | Key params | Notes |
|----------|--------|------------|-------|
| /tokens/transfers | GET | from, to, anyof.from.to, level.ge, level.le, limit, sort.desc | FA1.2/FA2 transfers; we use from + level.ge for time window. |

### Contracts (future)

| Endpoint | Method | Key params | Notes |
|----------|--------|------------|-------|
| /contracts | GET | — | Contract metadata. |
| /contracts/{address}/storage | GET | — | Contract storage. |
| /bigmaps/{id}/keys | GET | — | Big_map keys. |

---

## 5. API cheat sheet

### TzKT (used in app/src/lib/tzkt.ts and scripts/sync-revenue-register.js)

| Path | Method | Key query params | Response (short) | Example |
|------|--------|------------------|------------------|---------|
| /operations/{hash} | GET | — | Array of { type, target?.address, amount } | Verify payment to NIMROD_WALLET |
| /accounts/{address} | GET | — | balance (mutez), type, firstActivityTime, delegate | Account info for wallet summary |
| /operations/transactions | GET | anyof.sender.target, sender, target, limit, sort.desc | Array of tx (id, level, timestamp, hash, sender, target, amount, fee) | Recent txs; incoming to wallet (target.eq) |
| /blocks | GET | level.in, limit OR limit=1&sort.desc=level | { level, timestamp }[] | Block timestamps; head level |
| /tokens/transfers | GET | anyof.from.to, from, to, level.ge, level.le, limit, sort.desc | Array of transfer (id, level, from, to, amount, token) | Token transfers; 24h/30d windows |

### Beacon (app/src/lib/beacon.ts)

| Method | Purpose | Ref |
|--------|---------|-----|
| requestPermissions() | Connect wallet; returns permission with address | docs.walletbeacon.io, first dApp |
| getActiveAccount() | Get current connected address without prompting | — |
| clearActiveAccount() | Disconnect | — |
| requestSignPayload({ signingType, payload }) | Sign message (RAW or MICHELINE) to prove ownership | https://docs.walletbeacon.io/guides/sign-payload; Taquito: taquito.io/docs/signing |

SigningType: RAW (arbitrary string; not all wallets same sig), MICHELINE (hex 05-prefixed), OPERATION (hex 03).

**Wallet auth (r00t):** After requestPermissions(), call requestSignPayload({ signingType: SigningType.RAW, payload: 'r00t Cockpit auth ' + date }) so the user proves they control the wallet. Only treat as “connected” when both permissions and sign succeed; if sign is refused, return null so no address is set. Use NetworkType.GHOSTNET or NetworkType.MAINNET in DAppClient preferredNetwork when creating the client (from config NETWORK).

### Signer (r00t backend)

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| /balance | GET | (optional Authorization: Bearer TOKEN) | { address, balanceMutez, balanceXtz } |
| /transfer | POST | { to, amountMutez } or { to, amountXtz } | { opHash, success } or 4xx/5xx |

### Tezos RPC (via Taquito in signer)

Used in signer for balance (tezos.tz.getBalance) and transfer (tezos.wallet.transfer + RpcForger). No direct HTTP to RPC in app; see Taquito docs and RPC_URL in signer (.env).

---

## 6. Workflow

- **Before each Tezos-related task:** Read this bible (docs/tezos-bible.md).
- **After each task:** If you discovered new endpoints, libraries, or testnet steps that belong here, append them to this file. If nothing new, add nothing.
- **Studying:** To build a local database of TzKT data (gitignored) and export subsets to project folders, use the skill `.cursor/skills/tzkt-studying/` and run `node scripts/study-tzkt.js [mainnet|ghostnet] [--limit N]`.
- **Subagents:** Charlie (Ghostnet testing), Skrib (bible + nimrod docs), Verifier (validate + run tests), Code Reviewer (review changes), Test Writer (write test suites), **Tezos Expert** (Tezos pathways, languages, dApp/contract design). Full list and invocation: **docs/subagents.md**. Rules: `.cursor/rules/charlie.mdc`, `.cursor/rules/skr1b3.mdc`; all subagents in `.cursor/agents/*.md`.
