# r00t Cockpit

Tezos analytics cockpit: multiple **modules** on one site. Data from [TzKT](https://api.tzkt.io/). Static SPA; no backend.

## Modules

- **Wallet summary (free)** – Enter an address; see balance, delegation, recent XTZ and token activity. Paid export: send XTZ to Nimrod, verify op hash, download CSV.
- **Trader tree** – **Free:** last 24h, one hop (who did this address send tokens to?). **Upgraded:** connect wallet, pay 1 XTZ to Nimrod for 30 days’ access; then build a 30-day tree (root → recipients → their recipients) for any address.

## Run

- **Dev:** `npm install && npm run dev`
- **Build:** `npm run build` → `dist/`
- **Deploy:** Repo root has `netlify.toml`; base directory `app`, publish `app/dist`. Push to remote only when ready for production.

## Implemented

- Wallet connect (Beacon SDK): Connect / Disconnect in header.
- Upgraded Trader tree: payment check (on-chain: did connected wallet pay Nimrod in last 30 days?); 30-day block window; multi-hop tree (2 levels, 50 nodes cap); simple tree viz.
