"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { KIND_INFO } from "@/lib/tree/svgUtils";

export function NodeTooltip() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const tree = useStore((s) => s.tree);
  const hovered = useStore((s) => s.hovered);
  const allocated = useStore((s) => s.allocated);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  if (!tree || hovered == null) return null;
  const n = tree.nodes[String(hovered)];
  if (!n || !n.name) return null;

  const isAlloc = allocated.has(hovered);
  const kindLabel = n.kind ? KIND_INFO[n.kind]?.label ?? n.kind : "";
  const kindColor = n.kind ? KIND_INFO[n.kind]?.color : "var(--gold)";

  return (
    <div
      className="hud"
      style={{
        position: "fixed",
        left: pos.x + 18,
        top: pos.y + 18,
        maxWidth: 360,
        padding: "14px 16px",
        pointerEvents: "none",
        zIndex: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: kindColor,
          marginBottom: 6,
        }}
      >
        {kindLabel}
      </div>
      <h2
        style={{
          fontSize: 19,
          color: "var(--gold-bright)",
          margin: "0 0 10px 0",
          letterSpacing: "0.02em",
        }}
      >
        {n.name}
      </h2>
      {n.asc && (
        <div
          style={{
            display: "inline-block",
            fontSize: 10,
            padding: "2px 7px",
            border: "1px solid var(--gold-deep)",
            color: "var(--gold)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          {n.asc}
        </div>
      )}
      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>
        {n.stats?.map((s, i) => (
          <div key={i} style={{ marginBottom: 3 }}>
            {s}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: "1px solid var(--panel-line)",
          fontSize: 11,
          color: isAlloc ? "var(--gold-bright)" : "var(--ink-dim)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {isAlloc ? "Allocated · click to remove" : "Click to allocate"}
      </div>
    </div>
  );
}
