"use client";

import { useMemo } from "react";
import { ascendanciesForClass, useStore } from "@/lib/store";
import { aggregateStats } from "@/lib/tree/stats";
import {
  ALL_CLASS_NAMES,
  POE2_CLASS_INDICES,
} from "@/lib/tree/pathing";
import { KIND_INFO } from "@/lib/tree/svgUtils";

export function Sidebar() {
  const tree = useStore((s) => s.tree);
  const classIdx = useStore((s) => s.classIdx);
  const ascendancyId = useStore((s) => s.ascendancyId);
  const allocated = useStore((s) => s.allocated);
  const search = useStore((s) => s.search);
  const kindFilter = useStore((s) => s.kindFilter);
  const setClass = useStore((s) => s.setClass);
  const setAscendancyId = useStore((s) => s.setAscendancyId);
  const setSearch = useStore((s) => s.setSearch);
  const toggleKind = useStore((s) => s.toggleKind);
  const reset = useStore((s) => s.reset);
  const setViewport = useStore((s) => s.setViewport);
  const setHover = useStore((s) => s.setHover);

  const stats = useMemo(
    () => (tree ? aggregateStats(tree, allocated).slice(0, 40) : []),
    [tree, allocated],
  );

  const searchResults = useMemo(() => {
    if (!tree || search.trim().length < 2) return [];
    const q = search.toLowerCase();
    const results: { id: number; name: string; stat: string }[] = [];
    for (const [nidStr, n] of Object.entries(tree.nodes)) {
      if (!n.name) continue;
      const nameHit = n.name.toLowerCase().includes(q);
      const statHit = n.stats?.some((s) => s.toLowerCase().includes(q));
      if (nameHit || statHit) {
        results.push({
          id: Number(nidStr),
          name: n.name,
          stat: n.stats?.[0] ?? "",
        });
        if (results.length >= 50) break;
      }
    }
    return results;
  }, [tree, search]);

  const focus = (id: number) => {
    if (!tree) return;
    const n = tree.nodes[String(id)];
    if (!n || n.x == null || n.y == null) return;
    const scale = 1.5;
    setViewport({
      scale,
      tx: window.innerWidth / 2 - n.x * scale,
      ty: window.innerHeight / 2 - n.y * scale,
    });
    setHover(id);
  };

  const copyShare = async () => {
    const code = useStore.getState().encode();
    const url = `${location.origin}${location.pathname}#b=${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      prompt("Copy this URL:", url);
    }
  };

  const jump = useStore((s) => s.jump);
  const ascendancies = tree ? ascendanciesForClass(tree, classIdx) : [];
  const ascName = (id: string) =>
    jump?.ascendancies.find((a) => a.id === id)?.name ?? id;

  const KINDS_ORDER = [
    "classstart",
    "ascstart",
    "keystone",
    "notable",
    "mastery",
    "jewel",
    "asc",
    "small",
  ];

  return (
    <>
      <div id="title" className="hud">
        <h1>Passive Skill Tree</h1>
        <div className="sub">Path of Exile 2 · Planner</div>
      </div>

      <aside style={sidebarStyle} className="hud">
        <section style={section}>
          <h3 style={h3}>Class</h3>
          <select
            value={classIdx}
            onChange={(e) => setClass(Number(e.target.value))}
            style={input}
          >
            {POE2_CLASS_INDICES.map((i) => (
              <option key={i} value={i}>
                {ALL_CLASS_NAMES[i]}
              </option>
            ))}
          </select>
        </section>

        {ascendancies.length > 0 && (
          <section style={section}>
            <h3 style={h3}>Ascendancy</h3>
            <select
              value={ascendancyId ?? ""}
              onChange={(e) =>
                setAscendancyId(e.target.value === "" ? null : e.target.value)
              }
              style={input}
            >
              <option value="">— None —</option>
              {ascendancies.map((a) => (
                <option key={a} value={a}>
                  {ascName(a)}
                </option>
              ))}
            </select>
          </section>
        )}

        <section style={section}>
          <h3 style={h3}>Build</h3>
          <div style={{ color: "var(--ink)", fontSize: 13, marginBottom: 8 }}>
            {Math.max(0, allocated.size - 1)} points allocated
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset} style={btn}>
              Reset
            </button>
            <button onClick={copyShare} style={btn}>
              Copy Link
            </button>
          </div>
        </section>

        <section style={section}>
          <h3 style={h3}>Search</h3>
          <input
            type="text"
            placeholder="node or modifier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={input}
          />
          <div style={{ maxHeight: 180, overflow: "auto", marginTop: 6 }}>
            {searchResults.map((r) => (
              <div
                key={r.id}
                onClick={() => focus(r.id)}
                style={resultRow}
              >
                <strong style={{ color: "var(--gold-bright)" }}>{r.name}</strong>
                <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{r.stat}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={section}>
          <h3 style={h3}>Filters</h3>
          {KINDS_ORDER.map((k) => {
            const info = KIND_INFO[k];
            const off = kindFilter[k] === false;
            return (
              <div
                key={k}
                onClick={() => toggleKind(k)}
                style={{ ...filterRow, opacity: off ? 0.4 : 1 }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    background: info.color,
                    borderRadius: 99,
                    border: "1px solid #1a1408",
                  }}
                />
                <span style={{ flex: 1 }}>{info.label}</span>
              </div>
            );
          })}
        </section>

        <section style={section}>
          <h3 style={h3}>Stats</h3>
          <div style={{ maxHeight: 260, overflow: "auto" }}>
            {stats.length === 0 && (
              <div style={{ color: "var(--ink-dim)" }}>None.</div>
            )}
            {stats.map((s, i) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                {s.total !== 0 && (
                  <span style={{ color: "var(--gold-bright)" }}>
                    {s.total > 0 ? "+" : ""}
                    {s.total}{" "}
                  </span>
                )}
                <span>{s.label}</span>
                {s.count > 1 && (
                  <span style={{ color: "var(--ink-dim)" }}> (×{s.count})</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </>
  );
}

const sidebarStyle: React.CSSProperties = {
  top: 80,
  left: 18,
  bottom: 18,
  width: 320,
  overflowY: "auto",
  padding: 14,
};
const section: React.CSSProperties = {
  marginBottom: 16,
  paddingBottom: 12,
  borderBottom: "1px solid var(--panel-line)",
};
const h3: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  color: "var(--gold)",
  textTransform: "uppercase",
  marginBottom: 8,
};
const input: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--panel-line)",
  padding: "6px 8px",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};
const btn: React.CSSProperties = {
  background: "transparent",
  color: "var(--gold)",
  border: "1px solid var(--gold-deep)",
  padding: "6px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};
const resultRow: React.CSSProperties = {
  padding: "6px 4px",
  borderBottom: "1px solid var(--panel-line)",
  cursor: "pointer",
  fontSize: 12,
};
const filterRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  cursor: "pointer",
  padding: "4px 0",
  fontSize: 12.5,
  userSelect: "none",
};
