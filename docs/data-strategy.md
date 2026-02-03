# Data strategy: client-side first, no full TzKT scrape

Collection metrics and tree-style queries need historical transfer data. TzKT has it, but **a full scrape is massive**; Netlify and GitHub give us **limited storage**, so we do not plan a central DB of all TzKT data.

## Chosen approach (for now)

- **Client-side only, bounded**
  - The app fetches from TzKT on demand.
  - Optionally cache results in **IndexedDB** (or similar) for the **user’s wallet** and any **“remembered” wallets** in that browser.
  - Clear model: “local cache”; if the user clears storage or uses another device, we re-fetch.
- **No server-side DB** for user data on Netlify/GitHub. Static site + TzKT API only.

## If we need longer-lived history later

- Introduce a **small rolling buffer** (e.g. last N weeks of processed summaries per wallet) and **archive** older slices to the GitHub repo (e.g. static JSON) so they’re still reachable but not in the hot path.
- Do **not** plan on storing a full TzKT mirror.

## Summary

Start with **client-side interpretation + optional IndexedDB cache** for the wallets the user cares about. Add a rolling buffer + repo archive only if we hit a concrete need that TzKT + client cannot satisfy in one session.
