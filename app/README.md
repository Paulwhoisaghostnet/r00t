# r00t wallet summary

Minimal Tezos wallet summary: enter an address, see balance, delegation, and recent XTZ + token activity. Data from [TzKT](https://api.tzkt.io/). Static SPA; no backend.

- **Dev:** `npm install && npm run dev`
- **Build:** `npm run build` → `dist/`
- **Netlify:** Root repo has `netlify.toml`; set base to `app`, publish `app/dist`. To show a support XTZ address, add it in the support section in `src/App.tsx` and redeploy.
