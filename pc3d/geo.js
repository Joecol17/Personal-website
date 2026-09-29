// Small geometry toolkit for the PC model. The trimmed three.js bundle only ships the
// core classes, so the shapes normally taken from three's addons (rounded boxes,
// tubes, lathes, merged geometry) are built here directly on BufferGeometry.

export function createGeo(THREE) {
  const { BufferGeometry, Float32BufferAttribute, Vector3 } = THREE;

  function fromArrays(pos, nor, uv, index) {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    if (index) g.setIndex(index);
    return g;
  }

  // Box with evenly rounded edges and corners (radius r, k segments per bevel).
  function roundedBox(w, h, d, r, k = 3) {
    r = Math.max(0.0001, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
    const n = 2 * k + 1;
    const g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
    const p = g.attributes.position;
    const no = g.attributes.normal;
    const size = [w, h, d];
    const edge = 0.5 - 0.5 / n;
    const u = [0, 0, 0];
    const dir = [0, 0, 0];
    for (let i = 0; i < p.count; i++) {
      u[0] = p.getX(i);
      u[1] = p.getY(i);
      u[2] = p.getZ(i);
      const face = [Math.abs(no.getX(i)), Math.abs(no.getY(i)), Math.abs(no.getZ(i))];
      let len = 0;
      for (let a = 0; a < 3; a++) {
        const s = Math.sign(u[a]) || 1;
        if (face[a] > 0.5) dir[a] = s;
        else {
          const t = Math.max(0, (Math.abs(u[a]) - 0.5 / n) / edge);
          dir[a] = s * Math.tan(Math.min(t, 1) * Math.PI / 4);
        }
        len += dir[a] * dir[a];
      }
      len = Math.sqrt(len);
      const out = [0, 0, 0];
      for (let a = 0; a < 3; a++) {
        const inner = Math.max(-0.5, Math.min(0.5, u[a] * n)) * (size[a] - 2 * r);
        const nn = dir[a] / len;
        out[a] = (face[a] > 0.5 ? Math.sign(u[a]) * (size[a] / 2 - r) : inner) + r * nn;
        dir[a] = nn;
      }
      p.setXYZ(i, out[0], out[1], out[2]);
      no.setXYZ(i, dir[0], dir[1], dir[2]);
    }
    return g;
  }

  // Revolve a [radius, y] profile around the Y axis.
  function lathe(profile, segments = 48, phiStart = 0, phiLength = Math.PI * 2) {
    const pos = [];
    const uv = [];
    const idx = [];
    const rows = profile.length;
    let total = 0;
    const lens = [0];
    for (let i = 1; i < rows; i++) {
      total += Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]);
      lens.push(total);
    }
    for (let s = 0; s <= segments; s++) {
      const phi = phiStart + (s / segments) * phiLength;
      const sin = Math.sin(phi);
      const cos = Math.cos(phi);
      for (let i = 0; i < rows; i++) {
        const [r, y] = profile[i];
        pos.push(r * sin, y, r * cos);
        uv.push(s / segments, total ? lens[i] / total : 0);
      }
    }
    for (let s = 0; s < segments; s++)
      for (let i = 0; i < rows - 1; i++) {
        const a = s * rows + i;
        const b = (s + 1) * rows + i;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = fromArrays(pos, new Array(pos.length).fill(0), uv, idx);
    g.computeVertexNormals();
    return g;
  }

  // Centripetal Catmull-Rom through control points, resampled evenly by arc length.
  function samplePath(pts, count) {
    const P = pts.map((p) => (p.isVector3 ? p.clone() : new Vector3(p[0], p[1], p[2])));
    const dense = [];
    const per = 24;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[Math.min(P.length - 1, i + 2)];
      const d0 = Math.max(1e-4, Math.pow(p0.distanceToSquared(p1), 0.25));
      const d1 = Math.max(1e-4, Math.pow(p1.distanceToSquared(p2), 0.25));
      const d2 = Math.max(1e-4, Math.pow(p2.distanceToSquared(p3), 0.25));
      for (const c of ["x", "y", "z"]) {
        // tangents of the non-uniform Catmull-Rom (as in three's CatmullRomCurve3)
        let t1 = (p1[c] - p0[c]) / d0 - (p2[c] - p0[c]) / (d0 + d1) + (p2[c] - p1[c]) / d1;
        let t2 = (p2[c] - p1[c]) / d1 - (p3[c] - p1[c]) / (d1 + d2) + (p3[c] - p2[c]) / d2;
        t1 *= d1;
        t2 *= d1;
        const c0 = p1[c];
        const c2 = -3 * p1[c] + 3 * p2[c] - 2 * t1 - t2;
        const c3 = 2 * p1[c] - 2 * p2[c] + t1 + t2;
        for (let s = 0; s < per; s++) {
          const t = s / per;
          const k = i * per + s;
          dense[k] = dense[k] || new Vector3();
          dense[k][c] = c0 + t1 * t + c2 * t * t + c3 * t * t * t;
        }
      }
    }
    dense.push(P[P.length - 1].clone());
    const cum = [0];
    for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + dense[i].distanceTo(dense[i - 1]));
    const L = cum[cum.length - 1];
    const out = [];
    let j = 0;
    for (let i = 0; i <= count; i++) {
      const target = (i / count) * L;
      while (j < cum.length - 2 && cum[j + 1] < target) j++;
      const f = (target - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      out.push(dense[j].clone().lerp(dense[j + 1], Math.min(1, Math.max(0, f))));
    }
    return { points: out, length: L };
  }

  // Parallel-transport frames along a sampled path. With `side` given, the frame is
  // anchored at the END of the path so the cross-section's width lines up with `side`
  // where the cable plugs in (e.g. 12 wires of a 24-pin stacked along Y).
  function frames(points, side) {
    const n = points.length;
    const T = [];
    for (let i = 0; i < n; i++) {
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(n - 1, i + 1)];
      T.push(b.clone().sub(a).normalize());
    }
    const N = new Array(n);
    const B = new Array(n);
    const start = side ? n - 1 : 0;
    const step = side ? -1 : 1;
    const t0 = T[start];
    let n0;
    if (side) n0 = new Vector3().crossVectors(side.clone().normalize(), t0);
    if (!n0 || n0.lengthSq() < 1e-8) n0 = new Vector3().crossVectors(t0, Math.abs(t0.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0));
    N[start] = n0.normalize();
    for (let i = start + step; i >= 0 && i < n; i += step) {
      const prev = T[i - step];
      const nn = N[i - step].clone();
      const axis = new Vector3().crossVectors(prev, T[i]);
      if (axis.lengthSq() > 1e-12) {
        axis.normalize();
        nn.applyAxisAngle(axis, Math.acos(Math.max(-1, Math.min(1, prev.dot(T[i])))));
      }
      N[i] = nn;
    }
    for (let i = 0; i < n; i++) B[i] = new Vector3().crossVectors(T[i], N[i]).normalize();
    return { T, N, B };
  }

  // Sweep a cross-section along a path. shape: {r} for round, or {w, h} for a flat ribbon.
  function sweep(points, fr, shape, radial = 10, uvScale = 1) {
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    const ring = [];
    if (shape.r) {
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        ring.push([Math.cos(a) * shape.r, Math.sin(a) * shape.r, Math.cos(a), Math.sin(a)]);
      }
    } else {
      const w = shape.w / 2;
      const h = shape.h / 2;
      const c = [[w, -h], [w, h], [-w, h], [-w, -h], [w, -h]];
      const ns = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      for (let e = 0; e < 4; e++) {
        ring.push([c[e][0], c[e][1], ns[e][0], ns[e][1]]);
        ring.push([c[e + 1][0], c[e + 1][1], ns[e][0], ns[e][1]]);
      }
    }
    const rl = ring.length;
    let dist = 0;
    for (let i = 0; i < points.length; i++) {
      if (i) dist += points[i].distanceTo(points[i - 1]);
      const p = points[i];
      const n = fr.N[i];
      const b = fr.B[i];
      for (let j = 0; j < rl; j++) {
        const [x, y, nx, ny] = ring[j];
        pos.push(p.x + n.x * y + b.x * x, p.y + n.y * y + b.y * x, p.z + n.z * y + b.z * x);
        nor.push(n.x * ny + b.x * nx, n.y * ny + b.y * nx, n.z * ny + b.z * nx);
        uv.push(dist * uvScale, j / (rl - 1));
      }
    }
    const step = shape.r ? 1 : 2;
    for (let i = 0; i < points.length - 1; i++)
      for (let j = 0; j < rl - 1; j += step) {
        const a = i * rl + j;
        const b = (i + 1) * rl + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    return fromArrays(pos, nor, uv, idx);
  }

  function tube(pts, r, segments = 64, radial = 12, uvScale = 1) {
    const { points } = samplePath(pts, segments);
    return sweep(points, frames(points), { r }, radial, uvScale);
  }

  // A cable bundle: rows x cols round wires following one centre path.
  // `across` is the world direction the rows spread along where the cable ends (at the plug).
  function bundle(pts, { rows, cols, r, pitch, segments = 60, radial = 8, across, uvScale = 1 }) {
    const { points } = samplePath(pts, segments);
    const fr = frames(points, across);
    const geos = [];
    for (let a = 0; a < rows; a++)
      for (let b = 0; b < cols; b++) {
        // rows spread along B (the `across` direction at the plug), columns along N
        const ob = (a - (rows - 1) / 2) * pitch;
        const on = (b - (cols - 1) / 2) * pitch;
        const wp = points.map((p, i) => p.clone().addScaledVector(fr.B[i], ob).addScaledVector(fr.N[i], on));
        geos.push(sweep(wp, fr, { r }, radial, uvScale));
      }
    return merge(geos);
  }

  function ribbon(pts, w, h, side, segments = 60) {
    const { points } = samplePath(pts, segments);
    return sweep(points, frames(points, side), { w, h }, 0, 1 / w);
  }

  // Merge geometries (indexed or not) that share position/normal/uv.
  function merge(list) {
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    let off = 0;
    for (let g of list) {
      const P = g.attributes.position;
      const N = g.attributes.normal;
      const U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        pos.push(P.getX(i), P.getY(i), P.getZ(i));
        nor.push(N.getX(i), N.getY(i), N.getZ(i));
        if (U) uv.push(U.getX(i), U.getY(i));
        else uv.push(0, 0);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
      else for (let i = 0; i < P.count; i++) idx.push(i + off);
      off += P.count;
      g.dispose();
    }
    return fromArrays(pos, nor, uv, idx);
  }

  // Copy of a geometry moved/rotated: [x,y,z], [rx,ry,rz]
  function placed(g, at = [0, 0, 0], rot = [0, 0, 0], scale) {
    const m = new THREE.Matrix4().compose(
      new Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      scale ? new Vector3(...scale) : new Vector3(1, 1, 1)
    );
    return g.applyMatrix4(m);
  }

  // Square fan frame (size x size x depth, along Z) with a round bore.
  function fanFrame(size, depth, bore, cornerR, seg = 64) {
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    const h = size / 2;
    const outer = (a) => {
      // point on a rounded square in direction a
      const c = Math.cos(a);
      const s = Math.sin(a);
      const t = h / Math.max(Math.abs(c), Math.abs(s));
      let x = c * t;
      let y = s * t;
      const inner = h - cornerR;
      if (Math.abs(x) > inner && Math.abs(y) > inner) {
        // project onto the corner arc
        const cx = Math.sign(x) * inner;
        const cy = Math.sign(y) * inner;
        // intersect ray with circle around (cx, cy)
        const b = c * cx + s * cy;
        const q = cx * cx + cy * cy - cornerR * cornerR;
        const tt = b + Math.sqrt(Math.max(0, b * b - q));
        x = c * tt;
        y = s * tt;
      }
      return [x, y];
    };
    const ringAt = (z, nz) => {
      const start = pos.length / 3;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const [ox, oy] = outer(a);
        pos.push(ox, oy, z, Math.cos(a) * bore, Math.sin(a) * bore, z);
        nor.push(0, 0, nz, 0, 0, nz);
        uv.push(ox / size + 0.5, oy / size + 0.5, 0.5 + Math.cos(a) * bore / size, 0.5 + Math.sin(a) * bore / size);
      }
      for (let i = 0; i < seg; i++) {
        const a = start + i * 2;
        if (nz > 0) idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
        else idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    };
    ringAt(depth / 2, 1);
    ringAt(-depth / 2, -1);
    // walls
    const wall = (inner) => {
      const start = pos.length / 3;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        let x;
        let y;
        let nx;
        let ny;
        if (inner) {
          x = Math.cos(a) * bore;
          y = Math.sin(a) * bore;
          nx = -Math.cos(a);
          ny = -Math.sin(a);
        } else {
          [x, y] = outer(a);
          const [x2, y2] = outer(a + 0.001);
          nx = y2 - y;
          ny = -(x2 - x);
          const l = Math.hypot(nx, ny) || 1;
          nx /= l;
          ny /= l;
        }
        pos.push(x, y, depth / 2, x, y, -depth / 2);
        nor.push(nx, ny, 0, nx, ny, 0);
        uv.push(i / seg, 0, i / seg, 1);
      }
      for (let i = 0; i < seg; i++) {
        const a = start + i * 2;
        if (inner) idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
        else idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    };
    wall(true);
    wall(false);
    return fromArrays(pos, nor, uv, idx);
  }

  // One twisted, cambered fan blade as a thin sheet (render double-sided).
  function fanBlade(r0, r1, { chordRoot = 0.95, chordTip = 0.72, sweep = 0.35, depthRoot = 15, depthTip = 9, camber = 2.2 } = {}, nr = 8, nc = 8) {
    const pos = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= nr; i++) {
      const f = i / nr;
      const r = r0 + (r1 - r0) * f;
      const chord = chordRoot + (chordTip - chordRoot) * f;
      const depth = depthRoot + (depthTip - depthRoot) * f;
      const sw = sweep * f * f;
      for (let j = 0; j <= nc; j++) {
        const g = j / nc - 0.5;
        // round the tip corners a little
        const tipRound = f > 0.85 ? 1 - Math.pow((f - 0.85) / 0.15, 2) * 0.35 * (1 - Math.cos(g * Math.PI * 2)) : 1;
        const a = sw + g * chord * tipRound;
        const z = -g * depth + camber * (1 - 4 * g * g);
        pos.push(Math.cos(a) * r, Math.sin(a) * r, z);
        uv.push(f, j / nc);
      }
    }
    for (let i = 0; i < nr; i++)
      for (let j = 0; j < nc; j++) {
        const a = i * (nc + 1) + j;
        const b = a + nc + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = fromArrays(pos, new Array(pos.length).fill(0), uv, idx);
    g.computeVertexNormals();
    return g;
  }

  return { roundedBox, lathe, tube, bundle, ribbon, merge, placed, fanFrame, fanBlade, samplePath };
}
