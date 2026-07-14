# calendar-demo

## Verification

- **Do not do browser/UI automation testing (puppeteer, headless clicks, screenshots).** The user tests interactively themselves. Verify changes with `bun run typecheck` and `bunx eslint .` only, and describe what to check manually.
- The dev deployment DB is shared with the user's live session — never create, modify, or delete data in it for testing.

## Code style

- **Never lint, auto-fix, format, or otherwise modify `src/components/ui/**`** — these are stock shadcn (base-ui flavored) components and stay vendored as-is. They are excluded in `eslint.config.js`; keep them excluded and don't "clean up" warnings inside them.
- `convex/_generated/**` is codegen — never edit or lint it either.

## Convex

- Local development uses the **dev deploy key** in `.env.local` (`CONVEX_DEPLOY_KEY`, deployment `moonlit-goshawk-257`). `bunx convex dev` picks it up automatically — never run `bunx convex login` or log out the current CLI profile; it belongs to a different account.
- Production deploys happen only through Vercel, whose build runs `bunx convex deploy --cmd 'bun run build'` with a prod `CONVEX_DEPLOY_KEY`. Never run `convex deploy` locally.
- Convex schema/function changes ship by pushing to `main`.
