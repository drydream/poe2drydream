# POE2 Interactive Passive Skill Tree — Design

**Date:** 2026-05-26
**Status:** Approved for implementation planning
**Target deploy:** Vercel (Next.js)

## 1. Goal

Build a fully interactive Path of Exile 2 passive skill tree web application using the existing `data.json` (5102 nodes, 1572 groups) and `assets/` (background, frame, line, jewel webps). Users can browse the tree, select a class and ascendancy, allocate passive points, search nodes, and share builds via a compact URL.

## 2. Scope

### In scope (MVP)

- Pan/zoom canvas viewer of full passive tree.
- Class selection (8 classes from `data.json.classes`).
- Ascendancy selection per class.
- Click-to-allocate / click-to-deallocate nodes with reachability rules (POE behavior: cascade-deallocate orphaned nodes).
- Point counter + aggregated stats sidebar.
- Search nodes by name and stat text; click result to focus on canvas.
- Share build via URL hash (compact base64 bitset, our format).
- Hover tooltip with node name, stats, allocation state.
- Visual styling using local `assets/` webps (backgrounds, frames, group decorations, jewel sockets, connection line styling).

### Phase 2 (deferred, NOT MVP)

- POE CDN node icon fetching (`web.poecdn.com/image/Art/2DArt/...`).
- POE-format build code import/export (PoE1-style adapted, pending spec verification).
- Mastery picker (POE2 masteries on notable clusters).
- Jewel socket interactivity (pick jewel, show radius effects).
- Mobile pinch-zoom polish.
- Double-click "path-to" auto-allocation.

### Out of scope

- Server-side rendering of tree (static only).
- User accounts, persistent storage.
- Trading, item integration, character import from GGG API.

## 3. Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript).
- **UI:** React 19.
- **Rendering:** HTML Canvas 2D via `<canvas>` ref + custom render loop driven by `requestAnimationFrame`.
- **State:** Zustand (single store).
- **Styling:** Tailwind v4.
- **Build / deploy:** Vercel default Next.js pipeline; all assets served static from `public/`.
- **Testing:** Vitest for unit tests.

No backend, no database, no external API calls in MVP.

## 4. Project Structure

```
app/
  layout.tsx
  page.tsx                  # main viewer page
components/
  Tree/
    TreeCanvas.tsx          # canvas mount, event delegation
    renderer.ts             # draw loop: bg, edges, nodes, frames, overlays
    hitTest.ts              # screen→world, find node under cursor
    layout.ts               # orbit radii constants, node position resolver
    sprites.ts              # async load + cache of local webp assets
  Sidebar/
    Sidebar.tsx
    ClassPicker.tsx
    AscendancyPicker.tsx
    BuildSummary.tsx        # point count, aggregated stats
    SearchPanel.tsx
    ShareBar.tsx            # copy URL, import textarea, reset
  Tooltip/
    NodeTooltip.tsx         # portal-rendered, positioned in screen coords
lib/
  tree/
    types.ts                # TreeData, Node, Group types
    loadTree.ts             # fetch /data.json once, memoize
    codec.ts                # base64 bitset encode/decode
    pathing.ts              # BFS reachability, canAllocate, deallocateCascade
    stats.ts                # parse + aggregate allocated node stat strings
  store.ts                  # Zustand store
public/
  data.json                 # moved from repo root
  assets/                   # moved from repo root
docs/superpowers/specs/
  2026-05-26-poe2-skilltree-design.md
```

## 5. Canvas Rendering Pipeline

### Layers (back → front)

1. World background — tiled `background.webp`.
2. Group backgrounds — `group-background.webp` scaled per group bounding radius.
3. Edges — line segments between connected nodes (from `nodes[id].out`), styled by allocation state: dim (unallocated), bright (both endpoints allocated), highlight (path).
4. Node fills — circle with size and color by node type: keystone > notable > small; ascendancy nodes styled distinctly.
5. Node frames — `frame.webp` overlay matching node type and state (allocated / unallocated / hovered).
6. Jewel sockets — `jewel.webp`; on hover, show `jewel-radius.webp` as preview.
7. Hover / selection ring.
8. Class portrait backgrounds — `background-{class}.webp` near the class start node region.

### Viewport

State: `{ tx: number, ty: number, scale: number }`. Pan via mouse drag (left or right button). Zoom via wheel, anchored at cursor position. Scale clamped to `[0.1, 2.0]`.

### Coordinates

Most nodes have pre-computed `x, y` in `data.json` (POE-style orbital placement already resolved). Fallback: compute from `group + orbit + orbitIndex` using orbit-radii constants matching POE1 convention (extracted from data or hard-coded array `[0, 82, 162, 335, 493, 662, 846]` — verify during impl).

### Redraw

- `requestAnimationFrame` driven loop.
- Dirty flag set on: viewport change, allocation change, hover change.
- Skip frames when not dirty.

### Culling

Per-frame: compute world bbox from viewport, iterate only nodes whose `x, y` falls inside (plus margin for node radius and group bg).

### Hit testing

On mouse move: invert viewport transform to get world coord, iterate visible nodes, distance check against radius. O(visible_n); acceptable at 5k nodes. Spatial index (quadtree) only if profiling demands.

### Sprite loading

`sprites.ts` exposes `loadSprite(path): Promise<HTMLImageElement>`. Loaded into a `Map<string, HTMLImageElement>` cache. Renderer skips sprite-dependent layers gracefully (still draws shapes) until each sprite resolves.

## 6. State and Allocation Logic

### Store shape

```ts
type Store = {
  tree: TreeData | null;
  classIdx: number;
  ascendancy: string | null;       // e.g. "Witch1", null = base only
  allocated: Set<number>;          // skill IDs
  hovered: number | null;
  viewport: { tx: number; ty: number; scale: number };
  search: string;

  setClass(idx: number): void;
  setAscendancy(id: string | null): void;
  toggle(nodeId: number): void;
  setHover(id: number | null): void;
  setViewport(v: Viewport): void;
  loadFromHash(hash: string): void;
  reset(): void;
};
```

### Allocation rule

A node is allocatable iff it is connected (via `in`/`out`) to an already-allocated node OR is the class start node for the currently selected class. Class start determined by inspecting nodes for `isClassStart` / matching `classStartIndex` (verify field during impl from data.json sample).

### Toggle behavior

- If unallocated and can-allocate → add to set.
- If allocated → remove from set, then run `deallocateCascade`: BFS from class start through remaining `allocated`, any nodes not reached are removed (POE standard behavior).

### Pathing helpers

- `canAllocate(state, id): boolean` — any neighbor of `id` is in `state.allocated`, or `id` is the class start.
- `deallocateCascade(state, removedId): Set<number>` — returns new allocated set after pruning unreachable nodes.

### Stats aggregation

Iterate `allocated` → concat `node.stats` arrays. Group by canonicalized stat text (strip leading numbers, normalize whitespace), sum the leading numeric value if present. Display in `BuildSummary`.

### URL sync

- On store mutation that affects build (`classIdx`, `ascendancy`, `allocated`): debounce 300ms, encode, then `history.replaceState(null, '', '#b=' + code)`.
- On mount: read `location.hash`, decode, populate store. Decode failures show a non-blocking warning toast and start with empty build.

## 7. UI Shell

Layout: full-viewport canvas. Sidebar overlays the left edge, collapsible (chevron button). Tooltip is a portal-rendered absolute `<div>` positioned in screen coordinates.

### Sidebar sections (top → bottom)

- **Class picker:** grid of 8 class portrait buttons from `data.json.classes`. Clicking sets class and resets `allocated` (with confirm if non-empty).
- **Ascendancy picker:** dropdown listing the current class's ascendancies. Selecting reveals that ascendancy subtree zone; setting to none hides it.
- **Build summary:** "X / N points used" (N derived from level cap; for MVP show only used count). Aggregated stats list.
- **Search:** text input. Live filter nodes whose `name` or `stats[]` text matches (case-insensitive). Result list shows name + group; clicking pans/zooms canvas to that node and briefly highlights it.
- **Share:** copy-URL button, import textarea (paste full URL or `#b=...` code, parse and load), reset button.

### Interactions

- Hover node → tooltip (name, stats, state badge: Allocated / Path / Available / Locked).
- Click node → toggle allocate.
- Right-click drag OR left-click-and-drag on empty canvas → pan.
- Wheel → zoom (anchored at cursor).
- Esc → close any open dropdown / clear hover.

### Responsive

Desktop is primary target. On narrow viewports the sidebar slides over the canvas; basic touch pan supported. Pinch-zoom polish is Phase 2.

## 8. Build Code Format (Compact Base64 Bitset)

Binary layout (little-endian):

```
offset  type   field
  0     u8     version (= 1)
  1     u8     classIdx
  2     u8     ascendancyIdx     # 0 = none, else 1-based index into class.ascendancies
  3     u16    count             # number of allocated skill IDs
  5     u16[]  skillIds          # count entries, each 2 bytes
```

Encode: serialize as `Uint8Array`, convert to base64url (no padding), prepend `#b=`.

Decode: strip prefix, base64url-decode to bytes, validate version, parse fields. Unknown skill IDs (e.g., from a future tree version) are silently discarded — forward-compatibility.

Size estimate: typical 120-node end-game build → 4 + 240 = 244 bytes → ~326 chars base64url. Fits easily in any URL.

## 9. Testing

- **Unit (Vitest):**
  - `codec.ts`: random round-trip encode/decode preserves set; unknown-version errors; truncated input errors.
  - `pathing.ts`: allocate root succeeds, allocate disconnected node fails, deallocate intermediate node prunes downstream.
  - `stats.ts`: aggregation sums equal stats, leaves unparseable stats as-is, normalizes whitespace.
- **Integration:** load real `data.json`; decode a known fixed hash and assert the expected set of allocated node names.
- **Manual / browser:** smoke test of pan, zoom, alloc, share, import on Chrome desktop before declaring MVP done. No automated e2e for MVP.

## 10. Performance Budget

- **Cold load:** `data.json` is 5 MB raw; serve gzipped (~1.0–1.5 MB). Show a loader while fetching + parsing.
- **Render:** target 60 fps pan/zoom on a mid-range laptop. 30 fps acceptable worst case. Profile and add quadtree if hit-test or culling becomes the hot path.
- **JS bundle:** &lt; 500 KB gzipped (excluding `data.json`).
- **Memory:** sprite cache caps at all webps in `assets/` (~10 MB decoded). Acceptable.

## 11. Deployment

- Vercel via default Next.js detection. No `vercel.json` needed unless edge-runtime tweaks are required.
- `public/data.json` and `public/assets/*` served as static files from Vercel's CDN.
- No environment variables, no secrets, no server functions.
- `README.md` updated: install (`npm install`), dev (`npm run dev`), build (`npm run build`), deploy notes.

## 12. Risks and Mitigations

- **Orbit radii unknown:** PoE2 may use different orbit constants than PoE1. *Mitigation:* prefer pre-computed `x, y` in `data.json`; if missing for some nodes, derive constants empirically from a sample of nodes that have both.
- **Class-start identification:** field name not yet confirmed in `data.json`. *Mitigation:* inspect a class's start node during implementation kickoff; document and adapt.
- **`data.json` size on cold load:** 5 MB is heavy. *Mitigation:* gzip is automatic on Vercel; consider streaming parse or precompiling to a binary format only if measured load times exceed 3 s.
- **Canvas 2D perf at 5k nodes:** acceptable in theory, but unverified for this dataset. *Mitigation:* implement culling from day one, profile early, fall back to PixiJS if 30 fps cannot be held.
- **PoE2 official build-code format unknown:** *Mitigation:* the MVP uses our own compact format; PoE-format import/export deferred to Phase 2.

## 13. Open Questions for Implementation

(Resolve at the start of implementation, not blocking the plan.)

1. Exact orbit radii constants — empirical from `data.json` sample.
2. Class-start node field name in `data.json`.
3. Per-class total point budget (skill points from leveling) — display as denominator in build summary.
4. Jewel socket node identification — likely via `jewelSlots` top-level array; verify shape.
