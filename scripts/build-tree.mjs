#!/usr/bin/env node
// Transform poe2-skilltree-export-0.5.0/data.json + assets/{skills,frame}.json
// → public/tree-pre.json + public/tree-jump.json
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "poe2-skilltree-export-0.5.0");
const OUT_PUB = join(ROOT, "public");
const OUT_ASSETS = join(OUT_PUB, "assets");

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  writeFileSync(p, JSON.stringify(obj));
}

function deriveKind(n) {
  if (n.classStartIndex !== undefined) return "classstart";
  if (n.isAscendancyStart) return "ascstart";
  if (n.isJewelSocket) return "jewel";
  if (n.isMastery) return "mastery";
  if (n.isKeystone) return "keystone";
  if (n.isNotable) return "notable";
  if (n.ascendancyId) return "asc";
  return "small";
}

function buildAtlasSkills(skillsJson) {
  const icons = {};
  for (const [key, val] of Object.entries(skillsJson.frames)) {
    const colon = key.indexOf(":");
    if (colon < 0) continue;
    const prefix = key.slice(0, colon);
    const path = key.slice(colon + 1);
    const { x, y, w, h } = val.frame;
    icons[path] = [prefix, x, y, w, h];
  }
  const size = skillsJson.meta?.size ?? { w: 0, h: 0 };
  return { w: size.w, h: size.h, icons };
}

function buildAtlasFrames(frameJson) {
  const frames = {};
  for (const [key, val] of Object.entries(frameJson.frames)) {
    const colon = key.indexOf(":");
    const name = colon >= 0 ? key.slice(colon + 1) : key;
    const { x, y, w, h } = val.frame;
    frames[name] = [x, y, w, h];
  }
  const size = frameJson.meta?.size ?? { w: 0, h: 0 };
  return { w: size.w, h: size.h, frames };
}

function buildTreePre(data, atlasSkills, atlasFrames) {
  const nodes = {};
  for (const [id, n] of Object.entries(data.nodes)) {
    const kind = deriveKind(n);
    const out = {
      skill: n.skill,
      name: n.name,
      icon: n.icon,
      stats: n.stats || [],
      x: n.x,
      y: n.y,
      group: n.group,
      orbit: n.orbit,
      orbitIndex: n.orbitIndex,
      kind,
    };
    if (n.ascendancyId) out.asc = n.ascendancyId;
    if (n.classStartIndex !== undefined) out.classStartIndex = n.classStartIndex;
    if (n.flavourText) {
      out.flavour = Array.isArray(n.flavourText) ? n.flavourText : [n.flavourText];
    }
    nodes[id] = out;
  }

  const edges = data.edges.map((e) => {
    const edge = { f: e.from, t: e.to };
    if (e.orbit !== undefined) edge.o = e.orbit;
    if (e.orbitX !== undefined) edge.ox = e.orbitX;
    if (e.orbitY !== undefined) edge.oy = e.orbitY;
    return edge;
  });

  const bounds = {
    minX: data.min_x,
    minY: data.min_y,
    maxX: data.max_x,
    maxY: data.max_y,
  };

  return {
    nodes,
    edges,
    bounds,
    atlas: { skills: atlasSkills, frames: atlasFrames },
  };
}

function buildTreeJump(data) {
  const classes = data.classes.map((c) => ({ name: c.name, x: 0, y: 0 }));
  for (const n of Object.values(data.nodes)) {
    if (!n.classStartIndex) continue;
    for (const idx of n.classStartIndex) {
      if (idx >= 0 && idx < classes.length) {
        classes[idx].x = n.x;
        classes[idx].y = n.y;
      }
    }
  }

  const ascendancies = [];
  const ascByClass = new Map();
  for (const c of data.classes) {
    if (!c.ascendancies) continue;
    for (const a of c.ascendancies) {
      if (a.name) ascByClass.set(a.id, a.name);
    }
  }

  const ascStartNodes = new Map();
  for (const n of Object.values(data.nodes)) {
    if (n.isAscendancyStart && n.ascendancyId) {
      ascStartNodes.set(n.ascendancyId, n);
    }
  }
  for (const [id, name] of ascByClass) {
    const sn = ascStartNodes.get(id);
    if (!sn) continue;
    ascendancies.push({ id, name, x: sn.x, y: sn.y });
  }
  ascendancies.sort((a, b) => a.id.localeCompare(b.id));

  const kind_count = {};
  for (const n of Object.values(data.nodes)) {
    const k = deriveKind(n);
    kind_count[k] = (kind_count[k] || 0) + 1;
  }

  return { classes, ascendancies, kind_count };
}

function copyAssets() {
  mkdirSync(OUT_ASSETS, { recursive: true });
  const srcAssets = join(SRC, "assets");
  for (const f of readdirSync(srcAssets)) {
    copyFileSync(join(srcAssets, f), join(OUT_ASSETS, f));
  }
  // Sprite sheets the app references from /public root
  copyFileSync(join(srcAssets, "skills.webp"), join(OUT_PUB, "atlas-skills.webp"));
  copyFileSync(join(srcAssets, "frame.webp"), join(OUT_PUB, "atlas-frame.webp"));
}

function main() {
  console.log("Reading source data…");
  const data = readJson(join(SRC, "data.json"));
  const skillsJson = readJson(join(SRC, "assets", "skills.json"));
  const frameJson = readJson(join(SRC, "assets", "frame.json"));

  console.log("Building atlas…");
  const atlasSkills = buildAtlasSkills(skillsJson);
  const atlasFrames = buildAtlasFrames(frameJson);

  console.log("Building tree-pre.json…");
  const pre = buildTreePre(data, atlasSkills, atlasFrames);
  writeJson(join(OUT_PUB, "tree-pre.json"), pre);

  console.log("Building tree-jump.json…");
  const jump = buildTreeJump(data);
  writeJson(join(OUT_PUB, "tree-jump.json"), jump);

  console.log("Copying assets…");
  copyAssets();

  console.log(
    `Done: ${Object.keys(pre.nodes).length} nodes, ${pre.edges.length} edges, ${jump.ascendancies.length} ascendancies, kinds=${JSON.stringify(jump.kind_count)}`
  );
}

main();
