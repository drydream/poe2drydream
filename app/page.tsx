"use client";

import { useEffect, useRef, useState } from "react";
import { TreeSvg } from "@/components/Tree/TreeSvg";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { NodeTooltip } from "@/components/Tooltip/NodeTooltip";
import { Guide } from "@/components/Guide/Guide";
import { loadTreeAll } from "@/lib/tree/loadTree";
import { useStore } from "@/lib/store";

function HoverDebug() {
  const hovered = useStore((s) => s.hovered);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 99,
        background: "rgba(0,0,0,0.7)",
        color: "#ffd98a",
        font: "12px monospace",
        padding: "4px 8px",
        border: "1px solid #8a6a2a",
        pointerEvents: "none",
      }}
    >
      hover: {String(hovered)}
    </div>
  );
}

const DEST = "https://natwarth.github.io/poe2-skilltree/";
function destUrl() {
  return DEST + window.location.hash;
}

function Redirect({ onDismiss }: { onDismiss: () => void }) {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (seconds <= 0) {
      window.location.href = destUrl();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        color: "#ffd98a",
        fontFamily: "Georgia, serif",
        textAlign: "center",
        padding: 32,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: "bold" }}>
        A better version exists
      </div>
      <div style={{ fontSize: 16, color: "#c8aa6e", maxWidth: 480 }}>
        natwarth&apos;s PoE2 Skill Tree Planner has more features, better
        performance, and full support for all classes and ascendancies. You are
        being redirected there now.
      </div>
      <div style={{ fontSize: 64, fontWeight: "bold", color: "#e8d06e" }}>
        {seconds}
      </div>
      <div style={{ fontSize: 13, color: "#888" }}>
        Redirecting to{" "}
        <a
          href="https://natwarth.github.io/poe2-skilltree/"
          style={{ color: "#ffd98a" }}
        >
          natwarth.github.io/poe2-skilltree/
        </a>
      </div>
      <button
        onClick={() => (window.location.href = destUrl())}
        style={{
          marginTop: 8,
          padding: "10px 24px",
          background: "#8a6a2a",
          border: "1px solid #ffd98a",
          color: "#ffd98a",
          cursor: "pointer",
          fontSize: 14,
          fontFamily: "inherit",
        }}
      >
        Go now
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "#666",
          cursor: "pointer",
          fontSize: 12,
          textDecoration: "underline",
        }}
      >
        Stay on this page anyway
      </button>
    </div>
  );
}

export default function Page() {
  const initialized = useRef(false);
  const hashSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRedirect, setShowRedirect] = useState(true);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadTreeAll().then(({ tree, jump, adj }) => {
      useStore.getState().setData(tree, jump, adj);
      const hash = window.location.hash;
      if (hash.includes("b=")) {
        useStore.getState().loadFromHash(hash);
      }
      useStore.getState().setViewport({
        scale: 0.32,
        tx: window.innerWidth / 2,
        ty: window.innerHeight / 2,
      });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const unsub = useStore.subscribe((s, prev) => {
      if (
        s.classIdx === prev.classIdx &&
        s.ascendancyId === prev.ascendancyId &&
        s.allocated === prev.allocated
      )
        return;
      if (hashSyncTimer.current) clearTimeout(hashSyncTimer.current);
      hashSyncTimer.current = setTimeout(() => {
        if (!useStore.getState().tree) return;
        const code = useStore.getState().encode();
        history.replaceState(null, "", `#b=${code}`);
      }, 300);
    });
    return unsub;
  }, []);

  return (
    <main style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <TreeSvg />
      <Sidebar />
      <Guide />
      <NodeTooltip />
      <HoverDebug />
      {loading && (
        <div id="loading">
          <div>Forging the Atlas of Passives</div>
          <div className="dot" />
        </div>
      )}
      {showRedirect && <Redirect onDismiss={() => setShowRedirect(false)} />}
    </main>
  );
}
