const VERSION = 1;

export type BuildCode = {
  classIdx: number;
  ascendancyIdx: number;
  allocated: number[];
};

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeBuild(b: BuildCode): string {
  const count = b.allocated.length;
  const buf = new ArrayBuffer(5 + count * 4);
  const view = new DataView(buf);
  view.setUint8(0, VERSION);
  view.setUint8(1, b.classIdx);
  view.setUint8(2, b.ascendancyIdx);
  view.setUint16(3, count, true);
  for (let i = 0; i < count; i++) {
    view.setUint32(5 + i * 4, b.allocated[i] >>> 0, true);
  }
  return b64urlEncode(new Uint8Array(buf));
}

export function decodeBuild(code: string): BuildCode | null {
  try {
    const bytes = b64urlDecode(code);
    if (bytes.length < 5) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const version = view.getUint8(0);
    if (version !== VERSION) return null;
    const classIdx = view.getUint8(1);
    const ascendancyIdx = view.getUint8(2);
    const count = view.getUint16(3, true);
    if (bytes.length < 5 + count * 4) return null;
    const allocated: number[] = [];
    for (let i = 0; i < count; i++) {
      allocated.push(view.getUint32(5 + i * 4, true));
    }
    return { classIdx, ascendancyIdx, allocated };
  } catch {
    return null;
  }
}
