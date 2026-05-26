import type { AdjacencyMap, TreeData } from "./types";

export const ALL_CLASS_NAMES = [
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

// PoE2-only class indices into ALL_CLASS_NAMES (drop PoE1 legacy: Marauder, Witch, Ranger, Duelist, Shadow, Templar)
export const POE2_CLASS_INDICES = [6, 7, 8, 9, 10, 11];

export const POE2_CLASS_NAMES = POE2_CLASS_INDICES.map(
  (i) => ALL_CLASS_NAMES[i],
);

export const CLASS_NAMES = ALL_CLASS_NAMES;

export function getClassStartNode(
  tree: TreeData,
  classIdx: number,
): number | null {
  for (const [nidStr, n] of Object.entries(tree.nodes)) {
    if (n.classStartIndex && n.classStartIndex.includes(classIdx)) {
      const nid = Number(nidStr);
      if (!Number.isNaN(nid)) return nid;
    }
  }
  return null;
}

export function getNeighbors(adj: AdjacencyMap, id: number): number[] {
  const set = adj.get(id);
  return set ? Array.from(set) : [];
}

export function canAllocate(
  adj: AdjacencyMap,
  allocated: Set<number>,
  start: number | null,
  id: number,
): boolean {
  if (id === start) return true;
  if (allocated.has(id)) return false;
  const nbrs = adj.get(id);
  if (!nbrs) return false;
  for (const nb of nbrs) {
    if (nb === start || allocated.has(nb)) return true;
  }
  return false;
}

export function reachableFromStart(
  adj: AdjacencyMap,
  allocated: Set<number>,
  start: number | null,
): Set<number> {
  const out = new Set<number>();
  if (start == null) return out;
  if (!allocated.has(start)) return out;
  const queue: number[] = [start];
  out.add(start);
  while (queue.length) {
    const cur = queue.shift()!;
    const nbrs = adj.get(cur);
    if (!nbrs) continue;
    for (const nb of nbrs) {
      if (allocated.has(nb) && !out.has(nb)) {
        out.add(nb);
        queue.push(nb);
      }
    }
  }
  return out;
}

export function deallocateCascade(
  adj: AdjacencyMap,
  allocated: Set<number>,
  start: number | null,
  removed: number,
): Set<number> {
  const next = new Set(allocated);
  next.delete(removed);
  if (start == null) return next;
  if (!next.has(start)) {
    return new Set([start]);
  }
  return reachableFromStart(adj, next, start);
}
