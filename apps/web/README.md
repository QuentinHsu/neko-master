This is the `@neko-master/web` frontend, built with [Rsbuild](https://rsbuild.dev/) and React 19.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

The dev server proxies `/api` to `http://localhost:3001` by default. Set `API_URL` if your collector listens elsewhere.

## Learn More

Useful commands:

- `pnpm dev` - start the Rsbuild dev server on port `3000`
- `pnpm build` - create a production bundle in `dist/`
- `pnpm start` - serve the built bundle with the local static/proxy server

Production startup uses [`server.mjs`](/Volumes/workspace/code/github/open-source/neko-master/apps/web/server.mjs), which serves `dist/`, falls back to `index.html` for SPA routes, and proxies `/api` to the collector.
