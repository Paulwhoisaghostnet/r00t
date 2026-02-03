---
name: tzkt-studying
description: Queries TzKT for Tezos blockchain data and incrementally builds a local gitignored database of immutable records. Supports exporting selected subsets to live project folders for published work. Use when the user says "study", "study TzKT", "build a database of Tezos data", or when preparing TzKT-derived data for export into a project.
---

# TzKT Studying

When you **study**, you query TzKT for recent (or requested) blockchain data and append it to a local database. The database stays gitignored. You can later **export** chosen parts of it into project folders that get published.

## Where things live

| Item | Path | Git |
|------|------|-----|
| Study database | `.study/tzkt/` | Ignored (never committed) |
| Export target | Any project folder (e.g. `docs/published/tzkt-export/`, or another repo) | Not ignored in that project so it can be committed |
| Study script | `scripts/study-tzkt.js` | Committed |
| Bible (TzKT endpoints) | `docs/tezos-bible.md` | Committed |

## Study workflow

1. **Read cursor:** Load `.study/tzkt/meta.json` if present. It holds `lastLevel` (and optionally `lastTimestamp`) per network for incremental fetch.
2. **Query TzKT:** Use `docs/tezos-bible.md` (section 4–5) for endpoints. Typical incremental queries:
   - Blocks: `GET /blocks?level.ge={lastLevel}&limit=100&sort.asc=level`
   - Transactions: `GET /operations/transactions?level.ge={lastLevel}&limit=100&sort.asc=id`
   - Token transfers: `GET /tokens/transfers?level.ge={lastLevel}&limit=100&sort.asc=id`
3. **Append to DB:** Write new records into `.study/tzkt/{network}/` as NDJSON (one JSON object per line), e.g. `blocks.ndjson`, `transactions.ndjson`, `token_transfers.ndjson`. Deduplicate by `id` or `level`+`hash` when merging.
4. **Update cursor:** Write back `meta.json` with the new `lastLevel` (and head level if you fetched it).

Run study on a schedule or on demand. Prefer small batches (e.g. 100–500 records) so the DB grows slowly and stays usable.

## Export workflow

1. **Choose subset:** By network, level range, address, operation type, or list of hashes. Filter from `.study/tzkt/{network}/*.ndjson` (or from in-memory load of those files).
2. **Copy to project folder:** Write the subset to the target path (e.g. `docs/published/tzkt-export/` in this repo, or a path in another project). Use stable filenames (e.g. `blocks.json`, `transactions.json`) or a small manifest that lists files and filters used.
3. **Do not** export from `.study` in a way that commits the whole DB; only the chosen export directory in the target project may be committed.

## Conventions

- **Networks:** Use subdirs `mainnet` and `ghostnet` under `.study/tzkt/`. Base URLs: `https://api.tzkt.io/v1`, `https://ghostnet.tzkt.io/v1`.
- **Format:** NDJSON for append-friendly storage. Use `id` or `level` for ordering and dedup.
- **Meta:** `.study/tzkt/meta.json` shape: `{ "mainnet": { "lastLevel": number }, "ghostnet": { "lastLevel": number } }`.

## When to apply

- User says "study", "study TzKT", "build the study database", or asks to "add TzKT data to the study".
- User wants to "export" TzKT knowledge or "copy study data to the project" (or to a published folder).
- Before adding new TzKT-derived features, check if studying has already collected relevant data; prefer reusing or exporting from the study DB when possible.

## Reference

- TzKT endpoints and params: [docs/tezos-bible.md](../../docs/tezos-bible.md) (sections 4–5). Review before writing study or export logic.
- For schema details and example meta/NDJSON shapes, see [reference.md](reference.md).
