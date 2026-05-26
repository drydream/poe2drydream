"use client";

import { create } from "zustand";
import type { AdjacencyMap, TreeData, TreeJump } from "./tree/types";
import {
  canAllocate,
  deallocateCascade,
  getClassStartNode,
} from "./tree/pathing";
import { decodeBuild, encodeBuild } from "./tree/codec";

export type Viewport = { tx: number; ty: number; scale: number };

type Store = {
  tree: TreeData | null;
  jump: TreeJump | null;
  adj: AdjacencyMap | null;
  classIdx: number;
  ascendancyId: string | null;
  allocated: Set<number>;
  hovered: number | null;
  viewport: Viewport;
  search: string;
  showFlavour: boolean;
  kindFilter: Record<string, boolean>;

  setData: (tree: TreeData, jump: TreeJump, adj: AdjacencyMap) => void;
  setClass: (idx: number) => void;
  setAscendancyId: (id: string | null) => void;
  toggle: (id: number) => void;
  setHover: (id: number | null) => void;
  setViewport: (v: Viewport) => void;
  setSearch: (q: string) => void;
  toggleKind: (kind: string) => void;
  reset: () => void;
  loadFromHash: (hash: string) => void;
  encode: () => string;
};

const DEFAULT_KINDS: Record<string, boolean> = {
  classstart: true,
  ascstart: true,
  keystone: true,
  notable: true,
  mastery: true,
  jewel: true,
  asc: true,
  small: true,
};

export const useStore = create<Store>((set, get) => ({
  tree: null,
  jump: null,
  adj: null,
  classIdx: 6, // PoE2 Warrior by default
  ascendancyId: null,
  allocated: new Set(),
  hovered: null,
  viewport: { tx: 0, ty: 0, scale: 0.5 },
  search: "",
  showFlavour: true,
  kindFilter: { ...DEFAULT_KINDS },

  setData: (tree, jump, adj) => {
    set({ tree, jump, adj });
    const start = getClassStartNode(tree, get().classIdx);
    if (start != null && get().allocated.size === 0) {
      set({ allocated: new Set([start]) });
    }
  },

  setClass: (idx) => {
    const t = get().tree;
    if (!t) {
      set({ classIdx: idx, ascendancyId: null, allocated: new Set() });
      return;
    }
    const start = getClassStartNode(t, idx);
    set({
      classIdx: idx,
      ascendancyId: null,
      allocated: start != null ? new Set([start]) : new Set(),
    });
  },

  setAscendancyId: (id) => set({ ascendancyId: id }),

  toggle: (id) => {
    const { tree, adj, allocated, classIdx } = get();
    if (!tree || !adj) return;
    const start = getClassStartNode(tree, classIdx);
    if (id === start) return;
    if (allocated.has(id)) {
      const next = deallocateCascade(adj, allocated, start, id);
      set({ allocated: next });
    } else if (canAllocate(adj, allocated, start, id)) {
      const next = new Set(allocated);
      next.add(id);
      set({ allocated: next });
    }
  },

  setHover: (id) => set({ hovered: id }),
  setViewport: (v) => set({ viewport: v }),
  setSearch: (q) => set({ search: q }),

  toggleKind: (kind) =>
    set((s) => ({
      kindFilter: { ...s.kindFilter, [kind]: !s.kindFilter[kind] },
    })),

  reset: () => {
    const t = get().tree;
    if (!t) return;
    const start = getClassStartNode(t, get().classIdx);
    set({ allocated: start != null ? new Set([start]) : new Set() });
  },

  loadFromHash: (hash) => {
    const m = hash.match(/[#&]b=([A-Za-z0-9_-]+)/);
    if (!m) return;
    const code = decodeBuild(m[1]);
    if (!code) return;
    const tree = get().tree;
    let ascendancyId: string | null = null;
    if (tree && code.ascendancyIdx > 0) {
      const ascList = ascendanciesForClass(tree, code.classIdx);
      ascendancyId = ascList[code.ascendancyIdx - 1] ?? null;
    }
    set({
      classIdx: code.classIdx,
      ascendancyId,
      allocated: new Set(code.allocated),
    });
  },

  encode: () => {
    const { classIdx, ascendancyId, allocated, tree } = get();
    let ascendancyIdx = 0;
    if (tree && ascendancyId) {
      const ascList = ascendanciesForClass(tree, classIdx);
      const i = ascList.indexOf(ascendancyId);
      if (i >= 0) ascendancyIdx = i + 1;
    }
    return encodeBuild({
      classIdx,
      ascendancyIdx,
      allocated: Array.from(allocated),
    });
  },
}));

// Some PoE2 classes share their ascendancy ID prefix with the legacy PoE1 class name.
const EXTRA_ASC_PREFIXES: Record<number, string[]> = {
  8: ["Ranger"], // Huntress inherits Deadeye/Pathfinder under legacy "Ranger" prefix
};

export function ascendanciesForClass(
  tree: TreeData,
  classIdx: number,
): string[] {
  const set = new Set<string>();
  for (const n of Object.values(tree.nodes)) {
    if (n.kind === "ascstart" && n.asc) set.add(n.asc);
  }
  const className = CLASS_NAMES_BY_IDX[classIdx];
  if (!className) return Array.from(set);
  const prefixes = [className, ...(EXTRA_ASC_PREFIXES[classIdx] ?? [])];
  return Array.from(set)
    .filter((a) => prefixes.some((p) => a.toLowerCase().startsWith(p.toLowerCase())))
    .sort();
}

const CLASS_NAMES_BY_IDX = [
  "Marauder",
  "Witch",
  "Ranger",
  "Duelist",
  "Shadow",
  "Templar",
  "Warrior",
  "Sorceress",
  "Huntress",
  "Mercenary",
  "Monk",
  "Druid",
];
