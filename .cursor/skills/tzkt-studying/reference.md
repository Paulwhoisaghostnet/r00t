# TzKT study database reference

## Directory layout

```
.study/tzkt/
├── meta.json                 # Cursors per network: { "mainnet": { "lastLevel": N }, "ghostnet": { "lastLevel": N } }
├── mainnet/
│   ├── blocks.ndjson         # One block object per line (level, timestamp, ...)
│   ├── transactions.ndjson   # One transaction object per line (id, level, hash, sender, target, amount, ...)
│   └── token_transfers.ndjson
└── ghostnet/
    ├── blocks.ndjson
    ├── transactions.ndjson
    └── token_transfers.ndjson
```

## meta.json example

```json
{
  "mainnet": { "lastLevel": 4500000 },
  "ghostnet": { "lastLevel": 800000 }
}
```

## NDJSON rules

- One UTF-8 JSON object per line; no trailing comma between lines.
- Prefer TzKT response shapes as-is (id, level, timestamp, hash, sender, target, amount, etc.) so exports stay compatible with TzKT docs.
- Dedup on append by `id` (operations/transfers) or `level` (blocks).

## Export target examples

- This repo: `docs/published/tzkt-export/` (create and add a README there describing the export; do not gitignore that folder in the repo).
- Other project: `path/to/project/data/tzkt/` or `path/to/project/docs/tzkt-export/`. Only the exported files are committed in that project.

## Study script usage

From repo root:

```bash
node scripts/study-tzkt.js [mainnet|ghostnet] [--limit N]
```

- Fetches blocks and transactions (and optionally token transfers) from `lastLevel` for the given network, appends to `.study/tzkt/{network}/*.ndjson`, updates `meta.json`. Default limit 100.
