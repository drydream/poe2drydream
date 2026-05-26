"use client";

import { useState } from "react";

const STEPS = [
  { n: 1, title: "Choose Class", body: "Pick a class from the sidebar." },
  {
    n: 2,
    title: "Choose Ascendancy",
    body: "Pick an ascendancy (optional). Its subtree appears at the tree center.",
  },
  {
    n: 3,
    title: "Allocate Passives",
    body: "Click any node connected to an allocated one. Click again to deallocate (orphans cascade).",
  },
  {
    n: 4,
    title: "Allocate Ascendancy",
    body: "Allocate the ascendancy start node first, then path outward through ascendancy passives.",
  },
  {
    n: 5,
    title: "Skip Mastery Nodes",
    body: "Don't pick mastery nodes — they're a bug and shouldn't appear in the tree.",
  },
];

export function Guide() {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="hud"
      style={{
        position: "fixed",
        top: 14,
        right: 18,
        zIndex: 10,
        padding: open ? "12px 14px 14px" : "8px 12px",
        minWidth: open ? 280 : 0,
        maxWidth: 320,
      }}
    >
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--gold)",
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          How to Use
        </span>
        <span style={{ color: "var(--ink-dim)", fontSize: 14 }}>
          {open ? "−" : "+"}
        </span>
      </div>
      {open && (
        <ol
          style={{
            margin: "12px 0 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {STEPS.map((s) => (
            <li
              key={s.n}
              style={{
                display: "flex",
                gap: 10,
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  flex: "0 0 22px",
                  height: 22,
                  borderRadius: 99,
                  border: "1px solid var(--gold-deep)",
                  color: "var(--gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {s.n}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "var(--gold-bright)",
                    fontVariant: "small-caps",
                    letterSpacing: "0.04em",
                    marginBottom: 2,
                  }}
                >
                  {s.title}
                </div>
                <div style={{ color: "var(--ink)" }}>{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
