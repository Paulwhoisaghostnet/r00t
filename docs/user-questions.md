# User questions each module answers

Product principle: interpret TzKT data in ways **more meaningful than raw TzKT**. Every module should answer a clear “so what?” question. We do **not** implement tax code; we provide market-oriented metrics and filters.

---

## Wallet summary (free)

- What is this address’s balance and delegation?
- What recent XTZ and token activity does it have?
- (Paid export) Let me download a CSV of recent transactions after I pay.

---

## Trader tree (free 24h / upgraded 30d + downstream)

- **Free**: Who did this wallet send NFTs/tokens to in the last 24 hours? (one hop)
- **Upgraded**: Same question for the last 30 days, plus where did those recipients send tokens next? (tree: A → B → C → …)

---

## Collection metrics (planned)

- What tokens does this wallet own, with **cost basis** per token?
- What is my total cost, unrealized gain/loss, and **potential sales revenue** for my whole collection—or filtered by:
  - date range (e.g. tokens I collected in 2024),
  - creator / contract,
  - token type?

These “unique ways to filter and display collection stats” do not exist elsewhere; that’s the differentiator. No tax advice; market metrics only.
