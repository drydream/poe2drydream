"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  edgePath,
  frameNameFor,
  iconSizeFor,
  renderSizeFor,
  PHANTOM_DIST,
  type AllocState,
} from "@/lib/tree/svgUtils";
import { ALL_CLASS_NAMES, getClassStartNode } from "@/lib/tree/pathing";

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
  // Determine which frame in the 3000x3000 sheet to crop:
  //   Class0 = base class, Class1/2/3 = ascendancies (in order ascendancy1/2/3)
  let slot = 0;
  if (ascendancyId) {
    const m = ascendancyId.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 3) slot = n;
    }
  }
  // Sheet layout (1500x1500 per slot in a 3000x3000 sheet):
  //   slot 0 → (0,0), 1 → (1500,0), 2 → (0,1500), 3 → (1500,1500)
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

export function TreeSvg() {
  const tree = useStore((s) => s.tree);
  const jump = useStore((s) => s.jump);
  const adj = useStore((s) => s.adj);
  const allocated = useStore((s) => s.allocated);
  const hovered = useStore((s) => s.hovered);
  const classIdx = useStore((s) => s.classIdx);
  const ascendancyId = useStore((s) => s.ascendancyId);
  const viewport = useStore((s) => s.viewport);
  const kindFilter = useStore((s) => s.kindFilter);
  const setViewport = useStore((s) => s.setViewport);
  const setHover = useStore((s) => s.setHover);
  const toggle = useStore((s) => s.toggle);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    active: boolean;
    sx: number;
    sy: number;
    vtx: number;
    vty: number;
    moved: boolean;
  }>({ active: false, sx: 0, sy: 0, vtx: 0, vty: 0, moved: false });
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

  const allocStateFor = (id: number): AllocState => {
    if (allocated.has(id)) return "allocated";
    if (!adj || !tree) return "unallocated";
    if (id === start) return "canAllocate";
    const nbrs = adj.get(id);
    if (!nbrs) return "unallocated";
    for (const nb of nbrs) {
      if (nb === start || allocated.has(nb)) return "canAllocate";
    }
    return "unallocated";
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      vtx: viewport.tx,
      vty: viewport.ty,
      moved: false,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
      setViewport({
        ...useStore.getState().viewport,
        tx: dragRef.current.vtx + dx,
        ty: dragRef.current.vty + dy,
      });
    };
    const onUp = () => {
      dragRef.current.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setViewport]);

  const onWheel = (e: React.WheelEvent) => {
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
  };

  const handleNodeClick = (id: number) => {
    if (dragRef.current.moved) return;
    toggle(id);
  };

  if (!tree || !jump) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#07070a" }} />
    );
  }

  const frameIndex = tree.atlas.frames.frames;
  const iconIndex = tree.atlas.skills.icons;
  const SKILLS_W = tree.atlas.skills.w;
  const SKILLS_H = tree.atlas.skills.h;
  const FRAMES_W = tree.atlas.frames.w;
  const FRAMES_H = tree.atlas.frames.h;

  const iconIdMap = new Map<string, string>();
  let nextIconId = 0;
  for (const path of Object.keys(iconIndex)) {
    iconIdMap.set(path, `i${nextIconId++}`);
  }

  const visibleKind = (n: { kind?: string; asc?: string }) => {
    if (n.kind && kindFilter[n.kind] === false) return false;
    if (n.asc && n.asc !== ascendancyId) return false;
    return true;
  };

  let ascCx = 0;
  let ascCy = 0;
  if (ascendancyId) {
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
    if (Number.isFinite(minX)) {
      ascCx = (minX + maxX) / 2;
      ascCy = (minY + maxY) / 2;
    }
  }

  const edgeEls: React.JSX.Element[] = [];
  const ascEdgeEls: React.JSX.Element[] = [];
  for (let i = 0; i < tree.edges.length; i++) {
    const e = tree.edges[i];
    if (e.f === "root") continue;
    const a = tree.nodes[String(e.f)];
    const b = tree.nodes[String(e.t)];
    if (!a || !b) continue;
    if (!visibleKind(a) || !visibleKind(b)) continue;
    const d = edgePath(tree, e);
    if (!d) continue;
    const aId = typeof e.f === "string" ? Number(e.f) : e.f;
    const bId = e.t;
    const bothAlloc = allocated.has(aId) && allocated.has(bId);
    const isAsc = !!a.asc || !!b.asc;
    const el = (
      <path
        key={i}
        d={d}
        className={bothAlloc ? "edge edge-alloc" : "edge"}
      />
    );
    if (isAsc) ascEdgeEls.push(el);
    else edgeEls.push(el);
  }

  const nodeKinds: Array<string> = [
    "small",
    "asc",
    "jewel",
    "mastery",
    "notable",
    "ascstart",
    "keystone",
    "classstart",
  ];
  const byKind: Record<string, string[]> = {};
  for (const k of nodeKinds) byKind[k] = [];
  for (const [id, n] of Object.entries(tree.nodes)) {
    if (id === "root") continue;
    if (n.x == null) continue;
    if (!visibleKind(n)) continue;
    (byKind[n.kind ?? "small"] ?? byKind.small).push(id);
  }

  const frameEls: React.JSX.Element[] = [];
  const iconEls: React.JSX.Element[] = [];
  const fallbackEls: React.JSX.Element[] = [];
  const labelEls: React.JSX.Element[] = [];
  const hitEls: React.JSX.Element[] = [];
  const overlayEls: React.JSX.Element[] = [];
  const ascFrameEls: React.JSX.Element[] = [];
  const ascIconEls: React.JSX.Element[] = [];
  const ascFallbackEls: React.JSX.Element[] = [];
  const ascHitEls: React.JSX.Element[] = [];
  const ascOverlayEls: React.JSX.Element[] = [];

  for (const k of nodeKinds) {
    for (const idStr of byKind[k]) {
      const n = tree.nodes[idStr];
      const id = Number(idStr);
      if (n.x == null || n.y == null) continue;
      const isAsc = !!n.asc;
      const tFrame = isAsc ? ascFrameEls : frameEls;
      const tIcon = isAsc ? ascIconEls : iconEls;
      const tFallback = isAsc ? ascFallbackEls : fallbackEls;
      const tHit = isAsc ? ascHitEls : hitEls;
      const tOverlay = isAsc ? ascOverlayEls : overlayEls;
      const state = allocStateFor(id);
      const [fw, fh] = renderSizeFor(n, frameIndex);
      const fx = n.x - fw / 2;
      const fy = n.y - fh / 2;
      const fn = frameNameFor(n, state);

      if (fn && frameIndex[fn]) {
        tFrame.push(
          <use
            key={`f-${id}`}
            href={`#f-${fn}`}
            x={fx}
            y={fy}
            width={fw}
            height={fh}
          />,
        );
      } else if (n.kind === "mastery") {
        const r = fw * 0.3;
        const r2 = fw * 0.16;
        tFallback.push(
          <g key={`fb-${id}`} className="fallback">
            <circle cx={n.x} cy={n.y} r={r} className="fb-mastery" />
            <circle cx={n.x} cy={n.y} r={r2} className="fb-mastery-c" />
          </g>,
        );
      } else if (n.kind === "classstart") {
        tFallback.push(
          <circle
            key={`fb-${id}`}
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
        const ix = n.x - iw / 2;
        const iy = n.y - ih / 2;
        const dim =
          state === "unallocated" && n.kind !== "ascstart"
            ? { opacity: 0.55 }
            : undefined;
        tIcon.push(
          <use
            key={`i-${id}`}
            href={`#${sid}`}
            x={ix}
            y={iy}
            width={iw}
            height={ih}
            style={dim}
          />,
        );
      }

      if (allocated.has(id) && n.kind !== "classstart") {
        const r = Math.max(fw, fh) * 0.42;
        tOverlay.push(
          <circle
            key={`alloc-${id}`}
            cx={n.x}
            cy={n.y}
            r={r}
            className="alloc-ring"
          />,
        );
      }

      if (hovered === id) {
        const r = Math.max(fw, fh) * 0.55;
        tOverlay.push(
          <circle
            key={`hov-${id}`}
            cx={n.x}
            cy={n.y}
            r={r}
            className="hover-ring"
          />,
        );
      }

      const hitR = Math.max(fw, fh) * 0.5;
      tHit.push(
        <circle
          key={`h-${id}`}
          cx={n.x}
          cy={n.y}
          r={hitR}
          className="hit"
          onMouseEnter={() => setHover(id)}
          onMouseLeave={() => setHover(null)}
          onClick={() => handleNodeClick(id)}
        />,
      );
    }
  }

  for (const c of jump.classes.slice(6, 12)) {
    if (c.x === 0 && c.y === 0) continue;
    const dist = Math.hypot(c.x, c.y) || 1;
    const offY = c.y - 290 * (c.y / dist);
    labelEls.push(
      <text
        key={`cl-${c.name}-${c.x}-${c.y}`}
        x={c.x}
        y={offY}
        className="startlabel"
      >
        {c.name}
      </text>,
    );
  }
  for (const a of jump.ascendancies) {
    labelEls.push(
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
    <svg
      ref={svgRef}
      width={size.w}
      height={size.h}
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(ellipse 80% 60% at 50% 50%, #1a1810 0%, #050507 65%, #000 100%)",
        cursor: dragRef.current.active ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        <image
          id="atlas-skills"
          href="/atlas-skills.webp"
          width={SKILLS_W}
          height={SKILLS_H}
        />
        <image
          id="atlas-frames"
          href="/atlas-frame.webp"
          width={FRAMES_W}
          height={FRAMES_H}
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
      <g
        transform={`translate(${viewport.tx} ${viewport.ty}) scale(${viewport.scale})`}
      >
        <ClassPortrait classIdx={classIdx} ascendancyId={ascendancyId} />
        <g>{edgeEls}</g>
        <g>{fallbackEls}</g>
        <g>{frameEls}</g>
        <g>{iconEls}</g>
        <g>{overlayEls}</g>
        <g>{labelEls}</g>
        <g>{hitEls}</g>
        {ascendancyId && (
          <g transform={`translate(${-ascCx} ${-ascCy})`}>
            <g>{ascEdgeEls}</g>
            <g>{ascFallbackEls}</g>
            <g>{ascFrameEls}</g>
            <g>{ascIconEls}</g>
            <g>{ascOverlayEls}</g>
            <g>{ascHitEls}</g>
          </g>
        )}
      </g>
    </svg>
  );
}
