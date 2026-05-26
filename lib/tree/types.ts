export type NodeKind =
  | "small"
  | "notable"
  | "keystone"
  | "mastery"
  | "jewel"
  | "asc"
  | "ascstart"
  | "classstart";

export type TreeNode = {
  skill?: number;
  name?: string;
  icon?: string;
  stats?: string[];
  x?: number;
  y?: number;
  group?: number;
  orbit?: number;
  orbitIndex?: number;
  kind?: NodeKind;
  asc?: string;
  classStartIndex?: number[];
  flavour?: string[];
  ol?: boolean;
  nw?: boolean;
  ch?: boolean;
};

export type Edge = {
  f: number | "root";
  t: number;
  o?: number;
  ox?: number;
  oy?: number;
};

export type AtlasIcon = [string, number, number, number, number]; // [prefix, x, y, w, h]
export type AtlasFrame = [number, number, number, number]; // [x, y, w, h]

export type TreeBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type TreeData = {
  nodes: Record<string, TreeNode>;
  edges: Edge[];
  bounds: TreeBounds;
  atlas: {
    skills: { w: number; h: number; icons: Record<string, AtlasIcon> };
    frames: { w: number; h: number; frames: Record<string, AtlasFrame> };
  };
};

export type JumpClass = { name: string; x: number; y: number };
export type JumpAscendancy = { name: string; x: number; y: number };

export type TreeJump = {
  classes: JumpClass[];
  ascendancies: JumpAscendancy[];
  kind_count: Record<string, number>;
};

export type AdjacencyMap = Map<number, Set<number>>;
