import type { AdjacencyMap, TreeData, TreeJump } from "./types";
import { ALL_CLASS_NAMES } from "./pathing";

let cached: Promise<{
  tree: TreeData;
  jump: TreeJump;
  adj: AdjacencyMap;
}> | null = null;

function renameClassStartsToPoe2(tree: TreeData, jump: TreeJump): void {
  for (const n of Object.values(tree.nodes)) {
    if (n.kind !== "classstart" || !n.classStartIndex) continue;
    const poe2Idx = Math.max(...n.classStartIndex);
    if (poe2Idx >= 6 && poe2Idx <= 11) {
      n.name = ALL_CLASS_NAMES[poe2Idx].toUpperCase();
    }
  }
  for (let i = 0; i < jump.classes.length; i++) {
    if (i < 6 && i + 6 < jump.classes.length) {
      jump.classes[i].name = jump.classes[i + 6].name;
    }
  }
}

function buildAdjacency(tree: TreeData): AdjacencyMap {
  const adj: AdjacencyMap = new Map();
  const add = (a: number, b: number) => {
    let set = adj.get(a);
    if (!set) {
      set = new Set();
      adj.set(a, set);
    }
    set.add(b);
  };
  for (const e of tree.edges) {
    if (e.f === "root") continue;
    const from = typeof e.f === "string" ? Number(e.f) : e.f;
    const to = typeof e.t === "string" ? Number(e.t) : e.t;
    if (Number.isNaN(from) || Number.isNaN(to)) continue;
    add(from, to);
    add(to, from);
  }
  return adj;
}

export function loadTreeAll(): Promise<{
  tree: TreeData;
  jump: TreeJump;
  adj: AdjacencyMap;
}> {
  if (!cached) {
    cached = Promise.all([
      fetch("/tree-pre.json").then((r) => r.json() as Promise<TreeData>),
      fetch("/tree-jump.json").then((r) => r.json() as Promise<TreeJump>),
    ]).then(([tree, jump]) => {
      renameClassStartsToPoe2(tree, jump);
      return { tree, jump, adj: buildAdjacency(tree) };
    });
  }
  return cached;
}
