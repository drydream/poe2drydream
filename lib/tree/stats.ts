import type { TreeData } from "./types";

export function aggregateStats(
  tree: TreeData,
  allocated: Set<number>,
): { label: string; total: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const id of allocated) {
    const n = tree.nodes[String(id)];
    if (!n?.stats) continue;
    for (const s of n.stats) {
      const m = s.match(/^([+-]?\d+(?:\.\d+)?)%?\s*(.+)$/);
      if (m) {
        const num = parseFloat(m[1]);
        const label = m[2].trim();
        const entry = map.get(label) ?? { total: 0, count: 0 };
        entry.total += num;
        entry.count += 1;
        map.set(label, entry);
      } else {
        const entry = map.get(s) ?? { total: 0, count: 0 };
        entry.count += 1;
        map.set(s, entry);
      }
    }
  }
  return Array.from(map.entries())
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.count - a.count);
}
