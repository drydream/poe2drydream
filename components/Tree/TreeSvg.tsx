"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  edgePath,
  frameNameFor,
  iconSizeFor,
  renderSizeFor,
  type AllocState,
} from "@/lib/tree/svgUtils";
import { ALL_CLASS_NAMES, getClassStartNode } from "@/lib/tree/pathing";
import type { AdjacencyMap, TreeData, TreeJump } from "@/lib/tree/types";

const PORTRAIT_SIZE = 3000;

function ClassPortrait({
  classIdx,
  ascendancyId,
}: {
  classIdx: number;
  ascendancyId: string | null;
}) {
  const className = ALL_CLASS_NAMES[classIdx];
  if (!className) return null;
  if (classIdx < 6 || classIdx > 11) return null;
  const slug = className.toLowerCase();
  let slot = 0;
  if (ascendancyId) {
    const m = ascendancyId.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 3) slot = n;
    }
  }
  const fx = (slot % 2) * 1500;
  const fy = Math.floor(slot / 2) * 1500;
  return (
    <svg
      x={-PORTRAIT_SIZE / 2}
      y={-PORTRAIT_SIZE / 2}
      width={PORTRAIT_SIZE}
      height={PORTRAIT_SIZE}
      viewBox={`${fx} ${fy} 1500 1500`}
      preserveAspectRatio="xMidYMid meet"
      style={{ opacity: 0.85 }}
    >
      <image
        href={`/assets/background-${slug}.webp`}
        x={0}
        y={0}
        width={3000}
        height={3000}
      />
    </svg>
  );
}

function makeIconIdMap(tree: TreeData): Map<string, string> {
  const m = new Map<string, string>();
  let i = 0;
  for (const path of Object.keys(tree.atlas.skills.icons)) {
    m.set(path, `i${i++}`);
  }
  return m;
}

const TreeDefs = memo(function TreeDefs({ tree }: { tree: TreeData }) {
  const iconIdMap = useMemo(() => makeIconIdMap(tree), [tree]);
  const iconIndex = tree.atlas.skills.icons;
  const frameIndex = tree.atlas.frames.frames;
  return (
    <defs>
      <image
        id="atlas-skills"
        href="/atlas-skills.webp"
        width={tree.atlas.skills.w}
        height={tree.atlas.skills.h}
      />
      <image
        id="atlas-frames"
        href="/atlas-frame.webp"
        width={tree.atlas.frames.w}
        height={tree.atlas.frames.h}
      />
      {Object.entries(iconIndex).map(([path, v]) => {
        const sid = iconIdMap.get(path)!;
        const [, x, y, w, h] = v;
        return (
          <symbol
            key={sid}
            id={sid}
            viewBox={`${x} ${y} ${w} ${h}`}
            overflow="hidden"
            preserveAspectRatio="xMidYMid meet"
          >
            <use href="#atlas-skills" />
          </symbol>
        );
      })}
      {Object.entries(frameIndex).map(([name, v]) => {
        const [x, y, w, h] = v;
        return (
          <symbol
            key={`f-${name}`}
            id={`f-${name}`}
            viewBox={`${x} ${y} ${w} ${h}`}
            overflow="hidden"
            preserveAspectRatio="xMidYMid meet"
          >
            <use href="#atlas-frames" />
          </symbol>
        );
      })}
    </defs>
  );
});

type StaticProps = {
  tree: TreeData;
  jump: TreeJump;
  kindFilter: Record<string, boolean>;
  ascendancyId: string | null;
};

function visibleKindFn(
  kindFilter: Record<string, boolean>,
  ascendancyId: string | null,
) {
  return (n: { kind?: string; asc?: string }) => {
    if (n.kind && kindFilter[n.kind] === false) return false;
    const nodeAsc = n.asc ?? null;
    return nodeAsc === ascendancyId;
  };
}

const TreeStatic = memo(function TreeStatic({
  tree,
  jump,
  kindFilter,
  ascendancyId,
}: StaticProps) {
  const iconIdMap = useMemo(() => makeIconIdMap(tree), [tree]);
  const visible = visibleKindFn(kindFilter, ascendancyId);
  const frameIndex = tree.atlas.frames.frames;
  const iconIndex = tree.atlas.skills.icons;

  const edges: React.JSX.Element[] = [];
  for (let i = 0; i < tree.edges.length; i++) {
    const e = tree.edges[i];
    if (e.f === "root") continue;
    const a = tree.nodes[String(e.f)];
    const b = tree.nodes[String(e.t)];
    if (!a || !b) continue;
    if (!visible(a) || !visible(b)) continue;
    const d = edgePath(tree, e);
    if (!d) continue;
    edges.push(<path key={i} d={d} className="edge" />);
  }

  const fallbacks: React.JSX.Element[] = [];
  const frames: React.JSX.Element[] = [];
  const icons: React.JSX.Element[] = [];

  const kinds = [
    "small",
    "asc",
    "jewel",
    "mastery",
    "notable",
    "ascstart",
    "keystone",
    "classstart",
  ];

  for (const k of kinds) {
    for (const [idStr, n] of Object.entries(tree.nodes)) {
      if (idStr === "root") continue;
      if (n.kind !== k) continue;
      if (n.x == null || n.y == null) continue;
      if (!visible(n)) continue;
      const [fw, fh] = renderSizeFor(n, frameIndex);
      const fx = n.x - fw / 2;
      const fy = n.y - fh / 2;
      const fn = frameNameFor(n, "unallocated");
      if (fn && frameIndex[fn]) {
        frames.push(
          <use
            key={`f-${idStr}`}
            href={`#f-${fn}`}
            x={fx}
            y={fy}
            width={fw}
            height={fh}
          />,
        );
      } else if (n.kind === "mastery") {
        fallbacks.push(
          <g key={`fb-${idStr}`} className="fallback">
            <circle cx={n.x} cy={n.y} r={fw * 0.3} className="fb-mastery" />
            <circle cx={n.x} cy={n.y} r={fw * 0.16} className="fb-mastery-c" />
          </g>,
        );
      } else if (n.kind === "classstart") {
        fallbacks.push(
          <circle
            key={`fb-${idStr}`}
            cx={n.x}
            cy={n.y}
            r={fw * 0.32}
            className="fb-classstart"
          />,
        );
      }
      if (n.icon && iconIndex[n.icon]) {
        const sid = iconIdMap.get(n.icon)!;
        const [iw, ih] = iconSizeFor(n, fw, fh);
        icons.push(
          <use
            key={`i-${idStr}`}
            href={`#${sid}`}
            x={n.x - iw / 2}
            y={n.y - ih / 2}
            width={iw}
            height={ih}
          />,
        );
      }
    }
  }

  const labels: React.JSX.Element[] = [];
  for (const c of jump.classes.slice(6, 12)) {
    if (c.x === 0 && c.y === 0) continue;
    const dist = Math.hypot(c.x, c.y) || 1;
    const offY = c.y - 290 * (c.y / dist);
    labels.push(
      <text key={`cl-${c.name}-${c.x}-${c.y}`} x={c.x} y={offY} className="startlabel">
        {c.name}
      </text>,
    );
  }
  for (const a of jump.ascendancies) {
    labels.push(
      <text
        key={`asc-${a.name}-${a.x}-${a.y}`}
        x={a.x}
        y={a.y - 1300}
        className="asclabel"
      >
        {a.name}
      </text>,
    );
  }

  return (
    <>
      <g>{edges}</g>
      <g>{fallbacks}</g>
      <g>{frames}</g>
      <g>{icons}</g>
      <g>{labels}</g>
    </>
  );
});

function AllocOverlay({
  tree,
  adj,
  start,
  ascendancyId,
}: {
  tree: TreeData;
  adj: AdjacencyMap;
  start: number | null;
  ascendancyId: string | null;
}) {
  const allocated = useStore((s) => s.allocated);
  const frameIndex = tree.atlas.frames.frames;

  const elems = useMemo(() => {
    const edges: React.JSX.Element[] = [];
    const allocFrames: React.JSX.Element[] = [];
    const canAllocFrames: React.JSX.Element[] = [];

    const visibleAsc = (asc?: string) => (asc ?? null) === ascendancyId;

    for (let i = 0; i < tree.edges.length; i++) {
      const e = tree.edges[i];
      if (e.f === "root") continue;
      const a = tree.nodes[String(e.f)];
      const b = tree.nodes[String(e.t)];
      if (!a || !b) continue;
      if (!visibleAsc(a.asc) || !visibleAsc(b.asc)) continue;
      const aId = typeof e.f === "string" ? Number(e.f) : e.f;
      const bId = e.t;
      if (!allocated.has(aId) || !allocated.has(bId)) continue;
      const d = edgePath(tree, e);
      if (!d) continue;
      edges.push(<path key={i} d={d} className="edge edge-alloc" />);
    }

    for (const id of allocated) {
      const n = tree.nodes[String(id)];
      if (!n || n.x == null || n.y == null) continue;
      if (!visibleAsc(n.asc)) continue;
      const [fw, fh] = renderSizeFor(n, frameIndex);
      const fx = n.x - fw / 2;
      const fy = n.y - fh / 2;
      const fn = frameNameFor(n, "allocated");
      if (fn && frameIndex[fn]) {
        allocFrames.push(
          <use
            key={`af-${id}`}
            href={`#f-${fn}`}
            x={fx}
            y={fy}
            width={fw}
            height={fh}
          />,
        );
      }
      if (n.kind !== "classstart") {
        const r = Math.max(fw, fh) * 0.42;
        allocFrames.push(
          <circle
            key={`ar-${id}`}
            cx={n.x}
            cy={n.y}
            r={r}
            className="alloc-ring"
          />,
        );
      }
    }

    const canAllocSet = new Set<number>();
    if (start != null) {
      if (allocated.has(start) || allocated.size === 0) {
        for (const allocId of allocated) {
          const nbrs = adj.get(allocId);
          if (!nbrs) continue;
          for (const nb of nbrs) {
            if (!allocated.has(nb)) canAllocSet.add(nb);
          }
        }
        if (!allocated.has(start)) canAllocSet.add(start);
      }
    }
    for (const id of canAllocSet) {
      const n = tree.nodes[String(id)];
      if (!n || n.x == null || n.y == null) continue;
      if (!visibleAsc(n.asc)) continue;
      const [fw, fh] = renderSizeFor(n, frameIndex);
      const fx = n.x - fw / 2;
      const fy = n.y - fh / 2;
      const fn = frameNameFor(n, "canAllocate");
      if (fn && frameIndex[fn]) {
        canAllocFrames.push(
          <use
            key={`cf-${id}`}
            href={`#f-${fn}`}
            x={fx}
            y={fy}
            width={fw}
            height={fh}
          />,
        );
      }
    }

    return { edges, allocFrames, canAllocFrames };
  }, [tree, allocated, adj, start, ascendancyId, frameIndex]);

  return (
    <>
      <g>{elems.edges}</g>
      <g>{elems.canAllocFrames}</g>
      <g>{elems.allocFrames}</g>
    </>
  );
}

function HoverRing({
  tree,
  ascendancyId,
}: {
  tree: TreeData;
  ascendancyId: string | null;
}) {
  const hovered = useStore((s) => s.hovered);
  if (hovered == null) return null;
  const n = tree.nodes[String(hovered)];
  if (!n || n.x == null || n.y == null) return null;
  if ((n.asc ?? null) !== ascendancyId) return null;
  const [fw, fh] = renderSizeFor(n, tree.atlas.frames.frames);
  const r = Math.max(fw, fh) * 0.62;
  return <circle cx={n.x} cy={n.y} r={r} className="hover-ring" />;
}

type HitProps = {
  tree: TreeData;
  kindFilter: Record<string, boolean>;
  ascendancyId: string | null;
  dragMovedRef: React.RefObject<boolean>;
};

const HitLayer = memo(function HitLayer({
  tree,
  kindFilter,
  ascendancyId,
  dragMovedRef,
}: HitProps) {
  const visible = visibleKindFn(kindFilter, ascendancyId);
  const frameIndex = tree.atlas.frames.frames;
  const els: React.JSX.Element[] = [];
  for (const [idStr, n] of Object.entries(tree.nodes)) {
    if (idStr === "root") continue;
    if (n.x == null || n.y == null) continue;
    if (!visible(n)) continue;
    const [fw, fh] = renderSizeFor(n, frameIndex);
    const r = Math.max(fw, fh) * 0.5;
    const id = Number(idStr);
    els.push(
      <circle
        key={idStr}
        cx={n.x}
        cy={n.y}
        r={r}
        className="hit"
        onMouseEnter={() => useStore.getState().setHover(id)}
        onMouseLeave={() => useStore.getState().setHover(null)}
        onClick={() => {
          if (dragMovedRef.current) return;
          useStore.getState().toggle(id);
        }}
      />,
    );
  }
  return <g>{els}</g>;
});

export function TreeSvg() {
  const tree = useStore((s) => s.tree);
  const jump = useStore((s) => s.jump);
  const adj = useStore((s) => s.adj);
  const classIdx = useStore((s) => s.classIdx);
  const ascendancyId = useStore((s) => s.ascendancyId);
  const viewport = useStore((s) => s.viewport);
  const kindFilter = useStore((s) => s.kindFilter);
  const setViewport = useStore((s) => s.setViewport);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    active: boolean;
    sx: number;
    sy: number;
    vtx: number;
    vty: number;
    moved: boolean;
  }>({ active: false, sx: 0, sy: 0, vtx: 0, vty: 0, moved: false });
  const dragMovedRef = useRef(false);
  const [size, setSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const update = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const start = useMemo(
    () => (tree ? getClassStartNode(tree, classIdx) : null),
    [tree, classIdx],
  );

  const ascCenter = useMemo(() => {
    if (!ascendancyId || !tree) return { cx: 0, cy: 0 };
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const n of Object.values(tree.nodes)) {
      if (n.asc === ascendancyId && n.x != null && n.y != null) {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
    }
    if (!Number.isFinite(minX)) return { cx: 0, cy: 0 };
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }, [tree, ascendancyId]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const v = useStore.getState().viewport;
    dragRef.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      vtx: v.tx,
      vty: v.ty,
      moved: false,
    };
    dragMovedRef.current = false;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        dragRef.current.moved = true;
        dragMovedRef.current = true;
      }
      const v = useStore.getState().viewport;
      setViewport({
        scale: v.scale,
        tx: dragRef.current.vtx + dx,
        ty: dragRef.current.vty + dy,
      });
    };
    const onUp = () => {
      dragRef.current.active = false;
      // Defer clearing dragMovedRef so click handler can read it
      setTimeout(() => {
        dragMovedRef.current = false;
      }, 0);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setViewport]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const v = useStore.getState().viewport;
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      const newScale = Math.max(0.05, Math.min(3, v.scale * factor));
      const wx = (sx - v.tx) / v.scale;
      const wy = (sy - v.ty) / v.scale;
      setViewport({
        scale: newScale,
        tx: sx - wx * newScale,
        ty: sy - wy * newScale,
      });
    },
    [setViewport],
  );

  if (!tree || !jump || !adj) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#07070a" }} />
    );
  }

  return (
    <svg
      ref={svgRef}
      width={size.w}
      height={size.h}
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(ellipse 80% 60% at 50% 50%, #1a1810 0%, #050507 65%, #000 100%)",
        cursor: "grab",
        touchAction: "none",
      }}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <TreeDefs tree={tree} />
      <g
        transform={`translate(${viewport.tx} ${viewport.ty}) scale(${viewport.scale})`}
      >
        <ClassPortrait classIdx={classIdx} ascendancyId={ascendancyId} />
        <NonAscGroup
          tree={tree}
          jump={jump}
          adj={adj}
          start={start}
          ascendancyId={ascendancyId}
          kindFilter={kindFilter}
          dragMovedRef={dragMovedRef}
        />
        {ascendancyId && (
          <g transform={`translate(${-ascCenter.cx} ${-ascCenter.cy})`}>
            <AscGroup
              tree={tree}
              jump={jump}
              adj={adj}
              start={start}
              ascendancyId={ascendancyId}
              kindFilter={kindFilter}
              dragMovedRef={dragMovedRef}
            />
          </g>
        )}
      </g>
    </svg>
  );
}

type GroupProps = {
  tree: TreeData;
  jump: TreeJump;
  adj: AdjacencyMap;
  start: number | null;
  ascendancyId: string | null;
  kindFilter: Record<string, boolean>;
  dragMovedRef: React.RefObject<boolean>;
};

function NonAscGroup(props: GroupProps) {
  return (
    <>
      <TreeStatic
        tree={props.tree}
        jump={props.jump}
        kindFilter={props.kindFilter}
        ascendancyId={null}
      />
      <AllocOverlay
        tree={props.tree}
        adj={props.adj}
        start={props.start}
        ascendancyId={null}
      />
      <HoverRing tree={props.tree} ascendancyId={null} />
      <HitLayer
        tree={props.tree}
        kindFilter={props.kindFilter}
        ascendancyId={null}
        dragMovedRef={props.dragMovedRef}
      />
    </>
  );
}

function AscGroup(props: GroupProps) {
  return (
    <>
      <TreeStatic
        tree={props.tree}
        jump={props.jump}
        kindFilter={props.kindFilter}
        ascendancyId={props.ascendancyId}
      />
      <AllocOverlay
        tree={props.tree}
        adj={props.adj}
        start={props.start}
        ascendancyId={props.ascendancyId}
      />
      <HoverRing tree={props.tree} ascendancyId={props.ascendancyId} />
      <HitLayer
        tree={props.tree}
        kindFilter={props.kindFilter}
        ascendancyId={props.ascendancyId}
        dragMovedRef={props.dragMovedRef}
      />
    </>
  );
}
