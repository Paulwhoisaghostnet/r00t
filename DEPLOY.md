# Deploy r00t wallet summary (Netlify)

When you're ready to put the app live:

1. **Site name:** The repo name "r00t" may be taken on Netlify. Pick a project/site name—it becomes the URL (`<name>.netlify.app`). Suggestions: **r00t-wallet**, **nimrod-wallet**, **r00t-tezos**, or **root-tezos-wallet** (spelled out).
2. **Connect the repo** to [Netlify](https://app.netlify.com): New site → Import from Git → choose this repo and branch.
2. **Build settings** are in `netlify.toml`; Netlify will pick them up:
   - **Base directory:** `app`
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `app/dist`
3. **Deploy.** The SPA redirect (/* → /index.html) is already configured.

No env vars required for the static app. The support section already shows Nimrod's wallet and the human's wallet (pay-the-human) from `app/src/config.ts`.
