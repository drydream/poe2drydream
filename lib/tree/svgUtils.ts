import type { TreeData, TreeNode, Edge } from "./types";

export type AllocState = "unallocated" | "canAllocate" | "allocated";

export function frameNameFor(
  n: TreeNode,
  state: AllocState,
): string | null {
  const isAsc = !!n.asc;
  switch (n.kind) {
    case "keystone":
      return state === "allocated"
        ? "KeystoneFrameAllocated"
        : state === "canAllocate"
          ? "KeystoneFrameCanAllocate"
          : "KeystoneFrameUnallocated";
    case "notable":
      if (isAsc) {
        return state === "allocated"
          ? "AscendancyFrameNotableAllocated"
          : state === "canAllocate"
            ? "AscendancyFrameNotableCanAllocate"
            : "AscendancyFrameNotableUnallocated";
      }
      return state === "allocated"
        ? "NotableFrameAllocated"
        : state === "canAllocate"
          ? "NotableFrameCanAllocate"
          : "NotableFrameUnallocated";
    case "jewel":
      return state === "allocated"
        ? "JewelFrameAllocated"
        : state === "canAllocate"
          ? "JewelFrameCanAllocate"
          : "JewelFrameUnallocated";
    case "ascstart":
      return "AscendancyStartNode";
    case "asc":
      return state === "allocated"
        ? "AscendancyFrameNormalAllocated"
        : state === "canAllocate"
          ? "AscendancyFrameNormalCanAllocate"
          : "AscendancyFrameNormalUnallocated";
    case "small":
      return state === "allocated"
        ? "PSSkillFrameActive"
        : state === "canAllocate"
          ? "PSSkillFrameHighlighted"
          : "PSSkillFrame";
    default:
      return null;
  }
}

export function renderSizeFor(
  n: TreeNode,
  frameIndex: Record<string, [number, number, number, number]>,
): [number, number] {
  const fn = frameNameFor(n, "unallocated");
  if (fn) {
    const fr = frameIndex[fn];
    if (fr) return [fr[2] * 2, fr[3] * 2];
  }
  if (n.kind === "mastery") return [180, 180];
  if (n.kind === "classstart") return [320, 320];
  return [100, 100];
}

export function iconSizeFor(
  n: TreeNode,
  fw: number,
  fh: number,
): [number, number] {
  if (n.kind === "keystone") return [fw * 0.62, fh * 0.62];
  if (n.kind === "notable") return [fw * 0.62, fh * 0.62];
  if (n.kind === "ascstart") return [fw * 0.85, fh * 0.85];
  if (n.kind === "small") return [fw * 0.65, fh * 0.65];
  if (n.kind === "asc") return [fw * 0.55, fh * 0.55];
  if (n.kind === "jewel") return [fw * 0.5, fh * 0.5];
  return [fw * 0.6, fh * 0.6];
}

export const PHANTOM_DIST = 3000;

export function edgePath(tree: TreeData, e: Edge): string | null {
  const a = tree.nodes[String(e.f)];
  const b = tree.nodes[String(e.t)];
  if (!a || !b || a.x == null || b.x == null || a.y == null || b.y == null)
    return null;
  if (Math.hypot(a.x - b.x, a.y - b.y) > PHANTOM_DIST) return null;
  if (e.ox !== undefined && e.oy !== undefined) {
    const r = Math.hypot(a.x - e.ox, a.y - e.oy);
    const angA = Math.atan2(a.y - e.oy, a.x - e.ox);
    const angB = Math.atan2(b.y - e.oy, b.x - e.ox);
    let delta = angB - angA;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    const sweep = delta > 0 ? 1 : 0;
    return `M${a.x},${a.y} A${r},${r} 0 0 ${sweep} ${b.x},${b.y}`;
  }
  return `M${a.x},${a.y} L${b.x},${b.y}`;
}

export const KIND_INFO: Record<
  string,
  { label: string; color: string }
> = {
  classstart: { label: "Class start", color: "#e6c068" },
  ascstart: { label: "Ascendancy start", color: "#f5d28a" },
  keystone: { label: "Keystone", color: "#c84838" },
  notable: { label: "Notable", color: "#dfa84a" },
  mastery: { label: "Mastery", color: "#7cc3d6" },
  jewel: { label: "Jewel socket", color: "#9bb04a" },
  asc: { label: "Ascendancy node", color: "#b89cd9" },
  small: { label: "Small", color: "#a07a3a" },
};
