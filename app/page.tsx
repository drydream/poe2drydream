"use client";

import { useEffect, useRef, useState } from "react";
import { TreeSvg } from "@/components/Tree/TreeSvg";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { NodeTooltip } from "@/components/Tooltip/NodeTooltip";
import { Guide } from "@/components/Guide/Guide";
import { loadTreeAll } from "@/lib/tree/loadTree";
import { useStore } from "@/lib/store";

export default function Page() {
  const initialized = useRef(false);
  const hashSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);

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
      {loading && (
        <div id="loading">
          <div>Forging the Atlas of Passives</div>
          <div className="dot" />
        </div>
      )}
    </main>
  );
}
