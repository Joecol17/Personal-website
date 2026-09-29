// Minimal Radiance .hdr (RGBE) loader. Returns a half-float equirectangular DataTexture;
// the renderer pre-filters it (PMREM) automatically when used as scene.environment.

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
function toHalf(v) {
  f32[0] = v;
  const x = u32[0];
  const sign = (x >> 16) & 0x8000;
  const e = ((x >> 23) & 0xff) - 112;
  const m = x & 0x7fffff;
  if (e <= 0) return e < -10 ? sign : sign | ((m | 0x800000) >> (14 - e));
  if (e >= 31) return sign | 0x7c00;
  return sign | (e << 10) | (m >> 13);
}

export async function loadHDR(THREE, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HDR ${res.status}`);
  const b = new Uint8Array(await res.arrayBuffer());
  let p = 0;
  const line = () => {
    let s = "";
    while (p < b.length && b[p] !== 10) s += String.fromCharCode(b[p++]);
    p++;
    return s;
  };
  if (!line().startsWith("#?")) throw new Error("Not a Radiance file");
  while (line() !== "" && p < b.length);
  const m = line().match(/-Y (\d+) \+X (\d+)/);
  if (!m) throw new Error("Unsupported HDR orientation");
  const h = +m[1];
  const w = +m[2];
  const row = new Uint8Array(w * 4);
  const data = new Uint16Array(w * h * 4);
  const one = toHalf(1);
  for (let y = 0; y < h; y++) {
    if (b[p] === 2 && b[p + 1] === 2 && ((b[p + 2] << 8) | b[p + 3]) === w) {
      // new-style run-length encoded scanline, one channel at a time
      p += 4;
      for (let c = 0; c < 4; c++) {
        let x = 0;
        while (x < w) {
          let n = b[p++];
          if (n > 128) {
            n -= 128;
            const v = b[p++];
            while (n--) row[4 * x++ + c] = v;
          } else while (n--) row[4 * x++ + c] = b[p++];
        }
      }
    } else {
      row.set(b.subarray(p, p + w * 4));
      p += w * 4;
    }
    // three.js expects the bottom row first
    const out = (h - 1 - y) * w * 4;
    for (let x = 0; x < w; x++) {
      const e = row[4 * x + 3];
      const f = e ? Math.pow(2, e - 136) : 0;
      data[out + 4 * x] = toHalf(row[4 * x] * f);
      data[out + 4 * x + 1] = toHalf(row[4 * x + 1] * f);
      data[out + 4 * x + 2] = toHalf(row[4 * x + 2] * f);
      data[out + 4 * x + 3] = one;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, undefined, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
