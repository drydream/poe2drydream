# poe2drydream

Interactive Path of Exile 2 passive skill tree planner.

Built with Next.js 15 + React 19. Renders the full PoE2 tree via SVG using sprite atlases for icons and frames. Supports class selection, ascendancy selection, click-to-allocate with cascade deallocation, point counter, aggregated stat totals, search, and shareable build URLs.

## Develop

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## Deploy

Push to GitHub, then import the repo on [vercel.com](https://vercel.com). Defaults work — no env vars needed.

## Data

- `public/tree-pre.json` — preprocessed tree (nodes, edges, atlas indexes)
- `public/atlas-skills.webp` — skill-icon sprite atlas
- `public/atlas-frame.webp` — frame sprite atlas
- `public/tree-jump.json` — class/ascendancy positions
- `public/assets/` — class portrait sheets (3000×3000 per class, 4 sub-slots = base + 3 ascendancies)

## Architecture

- `app/page.tsx` — boots tree load, wires URL hash ↔ build state
- `components/Tree/TreeSvg.tsx` — SVG renderer (edges, frames, icons, hit regions, class portrait, ascendancy translation)
- `components/Sidebar/Sidebar.tsx` — class/ascendancy/search/filter/stats HUD
- `components/Tooltip/NodeTooltip.tsx` — floating node tooltip
- `lib/store.ts` — Zustand store
- `lib/tree/codec.ts` — base64-bitset build code
- `lib/tree/pathing.ts` — adjacency-based allocation rules
- `lib/tree/stats.ts` — stat aggregation
- `lib/tree/svgUtils.ts` — frame names, size math, edge arc paths
