# Deploy r00t wallet summary (Netlify)

When you're ready to put the app live:

1. **Push the code to your remote.** Netlify builds from the remote repo, so it must have code. From the r00t folder:
   ```bash
   git remote add origin <your-repo-URL>   # e.g. https://github.com/yourusername/r00t.git
   git push -u origin main
   ```
   (If you created the remote with a README, you may need to pull and merge first, or force-push if the remote is meant to be replaced.)
2. **Site name:** The repo name "r00t" may be taken on Netlify. Pick a project/site name—it becomes the URL (`<name>.netlify.app`). Suggestions: **r00t-wallet**, **nimrod-wallet**, **r00t-tezos**, or **root-tezos-wallet** (spelled out).
3. **Connect the repo** to [Netlify](https://app.netlify.com): New site → Import from Git → choose this repo and branch.
4. **Build settings** are in `netlify.toml`; Netlify will pick them up:
   - **Base directory:** `app`
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `app/dist`
5. **Deploy.** The SPA redirect (/* → /index.html) is already configured.

No env vars required for the static app. The support section already shows Nimrod's wallet and the human's wallet (pay-the-human) from `app/src/config.ts`.
