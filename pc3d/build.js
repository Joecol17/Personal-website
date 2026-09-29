// The PC, modelled in millimetres from the parts' published dimensions.
// Axes (case space): X = width (left glass at -X, back chamber at +X),
// Y = up from the floor, Z = depth (front glass at +Z, rear I/O at -Z).

// Lian Li O11 Dynamic Mini V2: 423.6 (D) x 273.3 (W) x 391.95 (H) mm
export const CASE = { W: 273.3, H: 391.95, D: 423.6 };
const HW = CASE.W / 2;
const HD = CASE.D / 2;

// Motherboard tray and ATX board placement
const TRAY_X = 35; // tray plane between the main chamber and the back chamber
const STANDOFF = 6.35;
const PCB_T = 1.6;
const PCB_X = TRAY_X - STANDOFF - PCB_T; // component side of the PCB (faces -X)
const BOARD_TOP = 350; // top edge of the board (Y)
const BOARD_REAR = -206; // rear (I/O) edge of the board (Z)

// Board-space layout (u: mm from the rear edge towards the front, v: mm down from the top edge)
export const LAYOUT = {
  socket: [108, 82],
  dimms: [160, 168.4, 176.8, 185.2], // A1, A2, B1, B2
  slotV: [158, 178.3, 198.6, 218.9, 239.2, 259.5, 279.8], // ATX slot pitch 20.32 mm
  holes: [
    [6.35, 10.16], [163.83, 10.16], [234.95, 10.16],
    [6.35, 165.1], [163.83, 165.1], [234.95, 165.1],
    [6.35, 292.1], [163.83, 292.1], [234.95, 292.1],
  ],
};
const bz = (u) => BOARD_REAR + u;
const by = (v) => BOARD_TOP - v;

export function buildPC(THREE, G, T, { hi }) {
  const K = hi ? 3 : 2; // bevel segments
  const root = new THREE.Group();
  const parts = {};
  const anchors = {};
  const fans = [];
  const rgbMats = [];

  // ---------------- Materials ----------------
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, ...o });
  // Everything uses MeshStandardMaterial so the scene compiles to as few shader programs as
  // possible (each extra physical feature is another slow-to-compile program on some GPUs).
  // eslint-disable-next-line no-unused-vars
  const phys = (color, { clearcoat, clearcoatRoughness, anisotropy, specularIntensity, ...o } = {}) => std(color, { roughness: 0.4, ...o });
  const brushed = T.brushed;
  const M = {
    caseSteel: phys(0x121316, { metalness: 0.55, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    caseInner: std(0x0c0d0f, { metalness: 0.4, roughness: 0.6 }),
    alu: phys(0xd4d8dc, { metalness: 1, roughness: 1, roughnessMap: brushed, anisotropy: 0.6 }),
    iceWhite: phys(0xdadde1, { metalness: 0.15, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    iceSilver: phys(0xc9cdd2, { metalness: 1, roughness: 0.9, roughnessMap: brushed, anisotropy: 0.5 }),
    blackPlastic: std(0x111214, { roughness: 0.62 }),
    greyPlastic: std(0xd6d9dc, { roughness: 0.5 }),
    connector: std(0xf1f2f3, { roughness: 0.55 }),
    darkMetal: phys(0x1b1d21, { metalness: 0.85, roughness: 0.38 }),
    anodized: phys(0x141518, { metalness: 0.75, roughness: 0.42, clearcoat: 0.2 }),
    gunmetal: phys(0x2a2d32, { metalness: 1, roughness: 0.9, roughnessMap: brushed, anisotropy: 0.4 }),
    finAlu: std(0x9aa0a8, { metalness: 0.9, roughness: 0.35 }),
    gold: std(0xd9b25c, { metalness: 1, roughness: 0.25 }),
    copper: std(0xc07a4a, { metalness: 1, roughness: 0.28 }),
    brass: std(0xb8964e, { metalness: 1, roughness: 0.35 }),
    fanBlack: std(0x16171a, { roughness: 0.55, side: THREE.DoubleSide }),
    rubber: std(0x0b0b0c, { roughness: 0.85 }),
    sleeve: std(0x1a1a1b, { roughness: 0.75, bumpMap: T.sleeve, bumpScale: 1.2, map: T.sleeve, transparent: true }),
    tubeSleeve: std(0x151515, { roughness: 0.7, bumpMap: T.sleeve, bumpScale: 1, map: T.sleeve }),
    ribbon: phys(0x2b2d31, { metalness: 0.7, roughness: 0.45, clearcoat: 0.3 }),
    pcbGreenDark: std(0x151a1f, { roughness: 0.6 }),
    chip: std(0x1a1b1d, { roughness: 0.4, metalness: 0.2 }),
    pcbEdge: std(0xc2c6cb, { roughness: 0.6 }),
    cablePlastic: std(0x111214, { roughness: 0.6, transparent: true }),
    // glass: a faint tint plus an additive layer that only adds reflections (Fresnel-weighted)
    glassTint: new THREE.MeshBasicMaterial({ color: 0x0d1116, transparent: true, opacity: 0.06, depthWrite: false }),
    glassReflect: phys(0x000000, {
      roughness: 0.02,
      metalness: 0,
      specularIntensity: 0.8,
      envMapIntensity: 0.9,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    frit: std(0x050506, { roughness: 0.3, transparent: true }),
  };

  const rgb = (offset, intensity = 4) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffffff, emissiveIntensity: intensity, roughness: 0.5 });
    m.userData = { offset, intensity };
    rgbMats.push(m);
    return m;
  };

  // ---------------- Helpers ----------------
  const shadowed = (m, cast = true) => {
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };
  const mesh = (geo, mat, parent, at = [0, 0, 0], rot) => {
    const m = shadowed(new THREE.Mesh(geo, mat));
    m.position.set(at[0], at[1], at[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(m);
    return m;
  };
  // rounded box by min/max corners
  const rbox = (x0, x1, y0, y1, z0, z1, r, mat, parent, k = K) =>
    mesh(G.roundedBox(x1 - x0, y1 - y0, z1 - z0, r, k), mat, parent, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
  const box = (x0, x1, y0, y1, z0, z1, mat, parent) =>
    mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, parent, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
  const cylX = (r, len, mat, parent, at, seg = 32) => mesh(new THREE.CylinderGeometry(r, r, len, seg), mat, parent, at, [0, 0, Math.PI / 2]);
  const group = (parent, id) => {
    const g = new THREE.Group();
    if (id) {
      g.userData.part = id;
      parts[id] = g;
    }
    parent.add(g);
    return g;
  };
  const anchor = (id, obj, at) => (anchors[id] = [obj, at]);

  // A 120 mm-class fan: frame, struts, hub and swept blades. Axis along local +Z.
  const bladeGeoCache = {};
  function fan(parent, { size = 120, depth = 25, blades = 9, hub = 20, at = [0, 0, 0], rot = [0, 0, 0], speed = 9, frame = true }) {
    const g = new THREE.Group();
    g.position.set(...at);
    g.rotation.set(...rot);
    parent.add(g);
    const bore = size / 2 - 2.2;
    if (frame) {
      mesh(G.fanFrame(size, depth, bore, 5.5, hi ? 72 : 48), M.fanBlack, g);
      // screw-hole bosses in the corners (both faces)
      const off = size / 2 - 7.5;
      const holeGeo = new THREE.CylinderGeometry(2.4, 2.4, depth + 0.4, 12);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) mesh(holeGeo, M.rubber, g, [sx * off, sy * off, 0], [Math.PI / 2, 0, 0]).castShadow = false;
      // motor mount + four struts on the back face
      mesh(new THREE.CylinderGeometry(hub + 1, hub + 1, 3, 32), M.fanBlack, g, [0, 0, -depth / 2 + 1.5], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const len = bore - hub;
        const s = mesh(new THREE.BoxGeometry(len, 3.2, 2.4), M.fanBlack, g, [Math.cos(a) * (hub + len / 2), Math.sin(a) * (hub + len / 2), -depth / 2 + 1.4]);
        s.rotation.z = a + 0.18;
      }
    }
    const rotor = new THREE.Group();
    rotor.position.z = depth * 0.08;
    g.add(rotor);
    mesh(G.lathe([[0, depth * 0.36], [hub * 0.7, depth * 0.34], [hub, depth * 0.22], [hub, -depth * 0.36], [0, -depth * 0.36]], 40), M.fanBlack, rotor, [0, 0, 0], [Math.PI / 2, 0, 0]);
    const key = `${size}-${blades}-${hub}-${depth}`;
    if (!bladeGeoCache[key]) {
      const list = [];
      for (let i = 0; i < blades; i++) {
        const b = G.fanBlade(hub - 0.5, bore - 1.2, { chordRoot: (2 * Math.PI / blades) * 1.25, chordTip: (2 * Math.PI / blades) * 1.05, depthRoot: depth * 0.62, depthTip: depth * 0.4, camber: depth * 0.08 }, hi ? 8 : 5, hi ? 8 : 5);
        b.rotateZ((i / blades) * Math.PI * 2);
        list.push(b);
      }
      bladeGeoCache[key] = G.merge(list);
    }
    mesh(bladeGeoCache[key], M.fanBlack, rotor);
    fans.push({ rotor, speed, spin: 0 });
    return g;
  }

  // ================= CASE =================
  const caseG = group(root, "case");
  const FLOOR = 14;
  const TOP = CASE.H - 6.5;
  // feet
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rbox(sx * (HW - 30) - 18, sx * (HW - 30) + 18, 0, FLOOR - 2, sz * (HD - 34) - 22, sz * (HD - 34) + 22, 3, M.rubber, caseG, 2);
  // base plate
  rbox(-HW, HW, FLOOR - 2.5, FLOOR + 1.5, -HD, HD, 2, M.caseSteel, caseG);
  // top panel (perforated)
  const topMat = phys(0x16171a, { metalness: 0.5, roughness: 0.5, map: T.perforated("#2a2c30", "#040405", [34, 26]) });
  rbox(-HW, HW, TOP, CASE.H, -HD, HD, 3, topMat, caseG);
  // right side panel (solid steel) with the PSU vent and the linear vent
  rbox(HW - 3, HW, FLOOR, TOP, -HD, HD, 1.5, M.caseSteel, caseG);
  const ventMat = phys(0x0f1012, { metalness: 0.4, roughness: 0.55, map: T.perforated("#1e2024", "#030304", [22, 18]) });
  rbox(HW - 0.2, HW + 2.2, FLOOR + 10, FLOOR + 165, -HD + 18, -20, 2, ventMat, caseG); // bumped-out PSU section
  for (let i = 0; i < 9; i++) box(HW, HW + 0.6, FLOOR + 190 + i * 16, FLOOR + 196 + i * 16, 10, HD - 30, M.caseInner, caseG);
  // rear panel pieces around the I/O and slot openings
  const REAR = -HD;
  box(-HW, HW, FLOOR, TOP, REAR, REAR + 3, M.caseSteel, caseG).receiveShadow = true;
  // I/O shield opening (dark recess) and five expansion slots (vertical GPU bracket)
  box(PCB_X - 44, PCB_X + 2, by(158), BOARD_TOP - 2, REAR - 0.3, REAR + 3.3, M.caseInner, caseG);
  // back-chamber front cover (the front glass only covers the main chamber)
  rbox(TRAY_X, HW, FLOOR, TOP, HD - 3, HD, 1.5, M.caseSteel, caseG);
  // front bottom trim and top/bottom frame rails behind the glass edges
  rbox(-HW, TRAY_X, FLOOR, FLOOR + 6, HD - 8, HD - 3, 1, M.caseSteel, caseG);
  // motherboard tray with rubber grommets
  box(TRAY_X - 1, TRAY_X + 1, FLOOR, TOP, REAR + 3, HD - 3, M.caseInner, caseG);
  const grommets = [
    [TOP - 30, TOP - 12, REAR + 30, REAR + 110], // top (EPS)
    [by(95), by(260), bz(250), bz(262)], // next to the 24-pin
    [FLOOR + 40, FLOOR + 58, -60, 60], // bottom
  ];
  for (const [y0, y1, z0, z1] of grommets) {
    rbox(TRAY_X - 2.2, TRAY_X + 0.5, Math.min(y0, y1), Math.max(y0, y1), z0, z1, 2, M.rubber, caseG, 2);
    box(TRAY_X - 2.4, TRAY_X - 2.1, Math.min(y0, y1) + 3, Math.max(y0, y1) - 3, (z0 + z1) / 2 - 0.4, (z0 + z1) / 2 + 0.4, M.blackPlastic, caseG);
  }
  // 10 degree slanted bottom fan tray (no fans fitted in this build)
  const trayMat = phys(0x131417, { metalness: 0.5, roughness: 0.5, map: T.perforated("#23252a", "#040405", [14, 10]) });
  const slant = rbox(-72, 72, -1.5, 1.5, -HD + 10, HD - 10, 1.2, trayMat, caseG);
  slant.position.set((-HW + 4 + TRAY_X - 2) / 2, FLOOR + 16, 0);
  slant.scale.x = (TRAY_X - 2 - (-HW + 4)) / 144;
  slant.rotation.z = (-10 * Math.PI) / 180;
  // glass panels: left side and front, pillarless corner
  const glass = group(caseG);
  glass.userData.part = "case";
  const glassSide = group(glass);
  const glassFront = group(glass);
  const pane = (parent, w, h, at, rot) => {
    const geo = G.roundedBox(w, h, 4, 1.2, 1);
    const tint = new THREE.Mesh(geo, M.glassTint);
    const refl = new THREE.Mesh(geo, M.glassReflect);
    for (const m of [tint, refl]) {
      m.position.set(...at);
      m.rotation.set(...rot);
      m.renderOrder = 10;
      parent.add(m);
    }
    refl.renderOrder = 11;
  };
  pane(glassSide, CASE.D - 7, TOP - FLOOR, [-HW + 2, (FLOOR + TOP) / 2, -0.5], [0, Math.PI / 2, 0]);
  pane(glassFront, TRAY_X + HW, TOP - FLOOR, [(-HW + TRAY_X) / 2, (FLOOR + TOP) / 2, HD - 2], [0, 0, 0]);
  // black frit bands along the top and bottom glass edges
  box(-HW + 0.2, -HW + 3.8, TOP - 14, TOP, -HD + 3, HD - 4, M.frit, glassSide);
  box(-HW + 0.2, -HW + 3.8, FLOOR, FLOOR + 14, -HD + 3, HD - 4, M.frit, glassSide);
  box(-HW, TRAY_X, TOP - 14, TOP, HD - 4, HD - 0.2, M.frit, glassFront);
  box(-HW, TRAY_X, FLOOR, FLOOR + 14, HD - 4, HD - 0.2, M.frit, glassFront);
  for (const m of [...glassSide.children, ...glassFront.children]) m.castShadow = false;
  anchor("case", caseG, [-HW + 20, TOP - 30, HD - 20]);

  // ================= MOTHERBOARD =================
  const mobo = group(root, "motherboard");
  // standoffs (brass, 6.35 mm) at the ATX hole positions
  const soGeo = new THREE.CylinderGeometry(2.7, 2.7, STANDOFF, 6);
  for (const [u, v] of LAYOUT.holes) {
    mesh(soGeo, M.brass, mobo, [TRAY_X - 1 - STANDOFF / 2, by(v), bz(u)], [0, 0, Math.PI / 2]);
    mesh(new THREE.CylinderGeometry(3.1, 3.1, 1.6, 20), M.iceSilver, mobo, [PCB_X - 0.6, by(v), bz(u)], [0, 0, Math.PI / 2]);
  }
  // PCB: edge body + textured component side
  box(PCB_X, PCB_X + PCB_T, by(305), BOARD_TOP, BOARD_REAR, bz(244), M.pcbEdge, mobo);
  const pcbMat = std(0xcfd3d8, { map: T.pcb(LAYOUT), roughness: 0.42, metalness: 0.05 });
  const pcbFace = mesh(new THREE.PlaneGeometry(244, 305), pcbMat, mobo, [PCB_X - 0.02, by(152.5), bz(122)], [0, -Math.PI / 2, 0]);
  pcbFace.castShadow = false;
  const onBoard = (u0, u1, v0, v1, h, r, mat, lift = 0, parent = mobo) => rbox(PCB_X - lift - h, PCB_X - lift, by(v1), by(v0), bz(u0), bz(u1), r, mat, parent);

  // Rear I/O cover and VRM heatsinks (ICE: white with brushed silver)
  onBoard(0, 30, 0, 150, 40, 3, M.iceWhite);
  onBoard(1, 29, 150, 158, 36, 2, M.iceSilver);
  const vrmFins = [];
  for (let i = 0; i < 10; i++) vrmFins.push(G.placed(G.roundedBox(30, 2.2, 16, 0.8, 1), [PCB_X - 15, by(46 + i * 9.4), bz(38)]));
  for (let i = 0; i < 10; i++) vrmFins.push(G.placed(G.roundedBox(26, 16, 2.2, 0.8, 1), [PCB_X - 13, by(28), bz(52 + i * 9)]));
  mesh(G.merge(vrmFins), M.iceSilver, mobo);
  onBoard(30, 46, 40, 142, 10, 2, M.iceWhite);
  onBoard(46, 142, 20, 36, 10, 2, M.iceWhite);
  onBoard(28, 32, 8, 150, 42, 1, M.iceSilver, 0);
  // onboard RGB strip on the I/O cover
  const rgbStrip = rbox(PCB_X - 41, PCB_X - 38.5, by(146), by(6), bz(3), bz(6), 1, rgb(0, 5), mobo, 1);
  rgbStrip.castShadow = false;
  // 8-pin EPS headers (2x) on the top edge
  for (const u of [32, 56]) onBoard(u, u + 19, 4, 14, 13, 1, M.blackPlastic);
  // AM5 socket + load plate + retention
  const [su, sv] = LAYOUT.socket;
  onBoard(su - 38, su + 38, sv - 42, sv + 42, 1.2, 1, M.blackPlastic);
  onBoard(su - 30, su + 30, sv - 34, sv + 34, 4.2, 1.5, M.iceSilver);
  onBoard(su - 36, su - 30, sv - 38, sv + 38, 5, 1, M.darkMetal);
  cylX(1.2, 60, M.iceSilver, mobo, [PCB_X - 6, by(sv), bz(su + 34)]).rotation.set(0, 0, 0);
  // DIMM slots (4) with latches
  for (const u of LAYOUT.dimms) {
    onBoard(u - 3, u + 3, 18, 155, 7.5, 1, M.greyPlastic);
    onBoard(u - 3.4, u + 3.4, 12, 19, 10, 1, M.connector);
  }
  // PCIe slots: x16 (armoured) at slot 2, x1 slots at 4 and 6
  const slotRow = (v, armour) => {
    onBoard(46, 135, v - 3.8, v + 3.8, 11, 1, armour ? M.iceSilver : M.greyPlastic);
    onBoard(135, 144, v - 4.5, v + 4.5, 11.5, 1.5, M.connector);
  };
  slotRow(LAYOUT.slotV[1], true);
  slotRow(LAYOUT.slotV[3], false);
  slotRow(LAYOUT.slotV[6], false);
  // 24-pin ATX
  onBoard(230, 241, 98, 151, 18, 1.2, M.connector);
  // SATA ports (right-angled on the front edge)
  for (let i = 0; i < 4; i++) onBoard(233, 244, 252 + i * 9, 259 + i * 9, 6, 0.8, M.blackPlastic);
  // bottom-edge headers
  for (const u of [10, 40, 70, 100, 130, 170, 196, 220]) onBoard(u, u + 16, 294, 301, 8, 0.6, M.blackPlastic);
  // chipset heatsink + lower M.2 heatsinks
  onBoard(152, 226, 196, 278, 11, 3, M.iceWhite);
  onBoard(158, 220, 202, 272, 12, 2.5, M.iceSilver, 0);
  onBoard(58, 150, 226, 248, 9, 2.5, M.iceWhite);
  onBoard(58, 150, 252, 272, 9, 2.5, M.iceWhite);
  // CMOS battery
  cylX(10, 3.2, M.iceSilver, mobo, [PCB_X - 2, by(172), bz(192)]);
  // audio caps and a few chokes
  for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(3, 3, 9, 16), M.gold, mobo, [PCB_X - 4.5, by(200 + (i % 3) * 9), bz(14 + Math.floor(i / 3) * 9)], [0, 0, Math.PI / 2]);
  anchor("motherboard", mobo, [PCB_X - 4, by(166), bz(214)]);

  // ================= CPU =================
  const cpu = group(root, "cpu");
  const ihs = new THREE.Group();
  ihs.position.set(PCB_X - 5.2, by(sv), bz(su));
  cpu.add(ihs);
  mesh(G.roundedBox(1.4, 40, 40, 0.5, 1), M.pcbGreenDark, ihs, [0.6, 0, 0]);
  // AM5 IHS with its eight side cut-outs
  const ihsTop = std(0xffffff, { map: T.cpuIHS, metalness: 0.9, roughness: 0.3 });
  const ihsBody = mesh(G.roundedBox(2.4, 34, 34, 1, 2), M.iceSilver, ihs, [-1.2, 0, 0]);
  ihsBody.material = std(0xc9ccd0, { metalness: 1, roughness: 0.32 });
  for (const s of [-1, 1]) {
    mesh(G.roundedBox(2.4, 8, 3, 0.6, 1), ihsBody.material, ihs, [-1.2, s * 12, 18.2]);
    mesh(G.roundedBox(2.4, 8, 3, 0.6, 1), ihsBody.material, ihs, [-1.2, s * 12, -18.2]);
    mesh(G.roundedBox(2.4, 3, 8, 0.6, 1), ihsBody.material, ihs, [-1.2, 18.2, s * 12]);
    mesh(G.roundedBox(2.4, 3, 8, 0.6, 1), ihsBody.material, ihs, [-1.2, -18.2, s * 12]);
  }
  mesh(new THREE.PlaneGeometry(33, 33), ihsTop, ihs, [-2.45, 0, 0], [0, -Math.PI / 2, 0]);
  anchor("cpu", ihs, [-3, 0, 0]);

  // ================= MEMORY (A2 + B2) =================
  const ram = group(root, "ram");
  const ramSide = std(0xffffff, { map: T.ramLabel, roughness: 0.55, metalness: 0.3 });
  const ramBody = phys(0x121315, { metalness: 0.6, roughness: 0.5, clearcoat: 0.2 });
  const sticks = [];
  for (const i of [1, 3]) {
    const u = LAYOUT.dimms[i];
    const stick = new THREE.Group();
    stick.position.set(PCB_X - 7, by(86.5), bz(u));
    ram.add(stick);
    // 133.35 mm long module, heat spreader standing ~35 mm above the slot
    mesh(G.roundedBox(35, 133.35, 6.6, 1.4, K), ramBody, stick, [-17.5, 0, 0]);
    // origami-style top ridge
    mesh(G.roundedBox(3, 131, 4, 1.2, K), phys(0x1c1d20, { metalness: 0.7, roughness: 0.4 }), stick, [-35.5, 0, 0]);
    for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(130, 26), ramSide, stick, [-18, 0, s * 3.35], [0, s > 0 ? 0 : Math.PI, Math.PI / 2]);
    // gold contacts peek out at the slot
    mesh(new THREE.BoxGeometry(1.2, 130, 1.3), M.gold, stick, [0.4, 0, 0]);
    sticks.push(stick);
  }
  anchor("ram", sticks[1], [-38, 50, 0]);

  // ================= M.2 SSD (under the M2A heatsink) =================
  const ssd = group(root, "ssd");
  const ssdBoard = new THREE.Group();
  ssdBoard.position.set(PCB_X - 3, by(151), bz(62));
  ssd.add(ssdBoard);
  mesh(new THREE.BoxGeometry(0.8, 22, 80), M.pcbGreenDark, ssdBoard, [0, 0, 40]);
  mesh(G.roundedBox(1.6, 15, 15, 0.4, 1), M.chip, ssdBoard, [-1.2, 0, 12]);
  mesh(G.roundedBox(1.4, 14, 18, 0.4, 1), M.chip, ssdBoard, [-1.1, 0, 36]);
  mesh(G.roundedBox(1.4, 14, 18, 0.4, 1), M.chip, ssdBoard, [-1.1, 0, 58]);
  mesh(new THREE.PlaneGeometry(76, 19), std(0xffffff, { map: T.ssdLabel, roughness: 0.4 }), ssdBoard, [-2.6, 0, 40], [0, -Math.PI / 2, 0]);
  mesh(new THREE.BoxGeometry(1, 22, 4), M.gold, ssdBoard, [0, 0, -1]);
  const m2Sink = new THREE.Group();
  ssd.add(m2Sink);
  onBoard(58, 150, 140, 162, 8, 2.5, M.iceWhite, 0, m2Sink);
  const finsM2 = [];
  for (let i = 0; i < 9; i++) finsM2.push(G.placed(new THREE.BoxGeometry(2.5, 18, 1.6), [PCB_X - 9, by(151), bz(64 + i * 10)]));
  mesh(G.merge(finsM2), M.iceSilver, m2Sink);
  anchor("ssd", ssdBoard, [-3, 0, 50]);

  // ================= CPU COOLER: ID-COOLING FX360 PRO =================
  const cooler = group(root, "cooler");
  // pump / waterblock 72 x 72 x 50 mm
  const pump = new THREE.Group();
  pump.position.set(PCB_X - 7.7, by(sv), bz(su));
  cooler.add(pump);
  mesh(G.roundedBox(4, 56, 56, 1.5, 2), M.copper, pump, [-2, 0, 0]);
  mesh(G.roundedBox(8, 72, 72, 5, K), M.darkMetal, pump, [-8, 0, 0]);
  mesh(G.roundedBox(34, 72, 72, 12, K), M.anodized, pump, [-29, 0, 0]);
  const cap = mesh(G.lathe([[0, 0], [30, 0], [31, -1], [31, -5], [29.5, -8], [0, -8.5]], 64), M.gunmetal, pump, [-46, 0, 0], [0, 0, Math.PI / 2]);
  cap.rotation.set(0, 0, -Math.PI / 2);
  mesh(G.lathe([[0, 0], [18, 0], [18.5, 0.6], [0, 0.6]], 48), M.alu, pump, [-55.1, 0, 0], [0, 0, -Math.PI / 2]);
  // mounting arms
  for (const s of [-1, 1]) rbox(-14, -8, s * 40 - 5, s * 40 + 5, -30, 30, 2, M.darkMetal, pump, 2);
  // tube fittings on the front side of the block
  for (const s of [-1, 1]) cylX(6.5, 14, M.darkMetal, pump, [-22, s * 16, 40]).rotation.set(Math.PI / 2, 0, 0);
  anchor("cooler", pump, [-58, 0, 0]);

  // radiator 397 x 120 x 27 mm in the roof, three 120 mm fans underneath (exhaust)
  const rad = new THREE.Group();
  cooler.add(rad);
  const RX0 = -HW + 8;
  const RX1 = RX0 + 120;
  const RY1 = TOP - 1;
  const RY0 = RY1 - 27;
  const radMid = (RX0 + RX1) / 2;
  const radCore = std(0xffffff, { map: T.radCore, metalness: 0.6, roughness: 0.45 });
  box(RX0 + 4, RX1 - 4, RY0 + 1, RY1 - 1, -168, 168, radCore, rad);
  for (const s of [-1, 1]) rbox(s > 0 ? RX1 - 5 : RX0, s > 0 ? RX1 : RX0 + 5, RY0, RY1, -176, 176, 1.2, M.darkMetal, rad);
  rbox(RX0, RX1, RY0, RY1, -198.5, -168, 3, M.blackPlastic, rad); // end tank
  rbox(RX0, RX1, RY0, RY1, 168, 198.5, 3, M.blackPlastic, rad); // end tank with ports
  for (const s of [-1, 1]) cylX(7, 12, M.blackPlastic, rad, [radMid + s * 22, RY0 - 5, 186]).rotation.set(0, 0, 0);
  const radFans = [];
  for (let i = 0; i < 3; i++) radFans.push(fan(rad, { at: [radMid, RY0 - 12.5, -120 + i * 120], rot: [Math.PI / 2, 0, 0], speed: 11 + i * 0.4 }));
  // sleeved tubes (FX360 PRO: 465 mm) from the front end tank down to the pump
  const tubePts = (s) => [
    [radMid + s * 22, RY0 - 10, 186],
    [radMid + s * 20, RY0 - 70, 180],
    [radMid + s * 10 + 20, by(sv) + 20, 110],
    [PCB_X - 40 + s * 2, by(sv) + s * 16 + 6, bz(su) + 70],
    [PCB_X - 28.6, by(sv) + s * 16, bz(su) + 48],
  ];
  const tubeGeo = G.merge([-1, 1].map((s) => G.tube(tubePts(s), 5.8, hi ? 90 : 50, hi ? 16 : 10, 1 / 10)));
  mesh(tubeGeo, M.tubeSleeve, cooler);

  // ================= GPU: RTX PRO 6000 Blackwell Workstation Edition (vertical) =================
  // 304 x 137 x 40 mm, fans facing the side glass
  const gpu = group(root, "gpu");
  const GX1 = -74; // back face
  const GX0 = GX1 - 40; // fan face
  const GY0 = 84;
  const GY1 = GY0 + 137;
  const GZ0 = REAR + 8;
  const GZ1 = GZ0 + 304;
  const gCx = (GX0 + GX1) / 2;
  const gCz = (GZ0 + GZ1) / 2;
  const gCy = (GY0 + GY1) / 2;
  // I/O bracket
  box(GX0 + 4, GX1 - 2, GY0 - 10, GY1 + 2, GZ0 - 1.5, GZ0, M.alu, gpu);
  // shell: black frame with a centre band, flow-through fin stacks either side
  const shell = M.anodized;
  rbox(GX0, GX1, GY0, GY0 + 10, GZ0, GZ1, 3, shell, gpu);
  rbox(GX0, GX1, GY1 - 10, GY1, GZ0, GZ1, 3, shell, gpu);
  rbox(GX0, GX1, GY0, GY1, GZ0, GZ0 + 12, 3, shell, gpu);
  rbox(GX0, GX1, GY0, GY1, GZ1 - 12, GZ1, 4, shell, gpu);
  rbox(GX0, GX1, GY0, GY1, gCz - 30, gCz + 10, 3, shell, gpu); // PCB / centre section
  // fin stacks (real fins, merged)
  const fins = [];
  const finSpacing = hi ? 2.1 : 3;
  const regions = [[GZ0 + 12, gCz - 30], [gCz + 10, GZ1 - 12]];
  for (const [z0, z1] of regions)
    for (let z = z0 + 1; z < z1 - 1; z += finSpacing) fins.push(G.placed(new THREE.BoxGeometry(20, 117, 0.35), [GX0 + 28, gCy, z]));
  mesh(G.merge(fins), M.finAlu, gpu);
  // heat pipes across the fin stacks
  for (let i = 0; i < 4; i++) {
    const p = mesh(new THREE.CylinderGeometry(3, 3, 250, 16), M.copper, gpu, [gCx + 12, GY0 + 28 + i * 27, gCz - 12], [Math.PI / 2, 0, 0]);
    p.castShadow = false;
  }
  // two fans on the glass-facing side
  const gpuFans = [];
  const fanZ = regions.map(([z0, z1]) => (z0 + z1) / 2);
  for (const z of fanZ) {
    // fan shroud ring
    mesh(G.lathe([[53.5, 0], [56, 0], [56, -5], [53.5, -5]], 64), shell, gpu, [GX0 + 4, gCy, z], [0, 0, -Math.PI / 2]);
    gpuFans.push(fan(gpu, { size: 106, depth: 14, blades: 7, hub: 21, at: [GX0 + 9, gCy, z], rot: [0, -Math.PI / 2, 0], frame: false, speed: 8 }));
  }
  // centre badge
  mesh(new THREE.PlaneGeometry(58, 8), std(0xffffff, { map: T.gpuLabel, roughness: 0.4, metalness: 0.4 }), gpu, [GX0 - 0.05, gCy, gCz - 12], [0, -Math.PI / 2, Math.PI / 2]);
  // backplate side
  rbox(GX1 - 2, GX1, GY0 + 4, GY1 - 4, gCz - 28, gCz + 8, 1.5, M.gunmetal, gpu);
  // 16-pin 12V-2x6 socket on the top edge
  rbox(gCx - 4, gCx + 8, GY1 - 1, GY1 + 7, gCz - 22, gCz - 2, 1, M.blackPlastic, gpu);
  anchor("gpu", gpu, [GX0 - 4, GY1 - 18, fanZ[1]]);

  // ================= RISER: Lian Li PCIe 5.0 x16 =================
  const riser = group(root, "riser");
  const slotY = by(LAYOUT.slotV[1]);
  const rz0 = bz(50);
  const rz1 = bz(131);
  // male end in the x16 slot
  rbox(PCB_X - 30, PCB_X - 8, slotY - 8, slotY + 8, rz0 - 4, rz1 + 4, 2, M.blackPlastic, riser);
  // female end on the vertical bracket, under the card
  const fx = gCx + 6;
  rbox(fx - 8, fx + 8, GY0 - 20, GY0 - 8, GZ0 + 38, GZ0 + 130, 2, M.blackPlastic, riser);
  box(GX0 - 4, GX1 + 30, GY0 - 26, GY0 - 20, GZ0 - 2, GZ0 + 150, M.caseSteel, riser); // bracket rail
  // flat shielded ribbon
  const ribbonPts = [
    [PCB_X - 30, slotY, 0],
    [PCB_X - 44, slotY - 6, 0],
    [-40, slotY - 40, 0],
    [-46, GY0 + 10, 0],
    [-48, GY0 - 30, 0],
    [fx - 10, GY0 - 38, 0],
    [fx, GY0 - 20, 0],
  ];
  const ribbonGeo = G.ribbon(ribbonPts, rz1 - rz0 - 6, 1.6, new THREE.Vector3(0, 0, 1), hi ? 80 : 50);
  mesh(ribbonGeo, M.ribbon, riser, [0, 0, (rz0 + rz1) / 2]);
  anchor("riser", riser, [-40, slotY - 40, rz1 + 2]);

  // ================= PSU: Lian Li EDGE GOLD 1000 W (back chamber) =================
  // 182 (D) x 86 (W) x 150 (H) mm, fan facing the perforated side panel
  const psu = group(root, "psu");
  const PX0 = TRAY_X + 6;
  const PX1 = PX0 + 86;
  const PY0 = FLOOR + 3;
  const PY1 = PY0 + 150;
  const PZ0 = REAR + 8;
  const PZ1 = PZ0 + 182;
  rbox(PX0, PX1 - 15, PY0, PY1 - 22, PZ0, PZ1, 4, M.anodized, psu);
  // fan face: frame around a 120 mm square opening
  const fcy = PY0 + 64;
  const fcz = (PZ0 + PZ1) / 2;
  rbox(PX1 - 16, PX1, PY0, fcy - 60, PZ0, PZ1, 2, M.anodized, psu);
  rbox(PX1 - 16, PX1, fcy + 60, PY1 - 22, PZ0, PZ1, 2, M.anodized, psu);
  rbox(PX1 - 16, PX1, fcy - 60, fcy + 60, PZ0, fcz - 60, 2, M.anodized, psu);
  rbox(PX1 - 16, PX1, fcy - 60, fcy + 60, fcz + 60, PZ1, 2, M.anodized, psu);
  // the L: connector strip along the top edge, sockets facing up
  rbox(PX0, PX1 - 30, PY1 - 22, PY1, PZ0, PZ1, 3, M.anodized, psu);
  rbox(PX1 - 30, PX1, PY1 - 22, PY1 - 8, PZ0, PZ1, 3, M.gunmetal, psu);
  for (let i = 0; i < 8; i++) rbox(PX0 + 8, PX0 + 50, PY1 - 0.5, PY1 + 1.5, PZ0 + 12 + i * 20, PZ0 + 26 + i * 20, 1, M.blackPlastic, psu, 1);
  // fan grille
  const grille = [];
  for (let r = 12; r <= 58; r += 6.5) grille.push(G.placed(new THREE.TorusGeometry(r, 0.9, 6, 64), [PX1 - 1, fcy, fcz], [0, Math.PI / 2, 0]));
  for (let i = 0; i < 4; i++) grille.push(G.placed(new THREE.BoxGeometry(1.6, 116, 1.6), [PX1 - 1, fcy, fcz], [(i * Math.PI) / 4, 0, 0]));
  mesh(G.merge(grille), M.gunmetal, psu);
  fan(psu, { size: 118, depth: 12, blades: 9, hub: 22, at: [PX1 - 9, fcy, fcz], rot: [0, Math.PI / 2, 0], frame: false, speed: 5 });
  mesh(new THREE.PlaneGeometry(110, 27), std(0xffffff, { map: T.psuLabel, roughness: 0.45 }), psu, [PX0 - 0.1, PY0 + 30, (PZ0 + PZ1) / 2], [0, -Math.PI / 2, 0]);
  anchor("psu", psu, [PX0 - 4, PY1 - 30, PZ1 - 30]);

  // ================= HDD: Seagate BarraCuda 4 TB, 3.5" (back chamber drive cage) =================
  const hdd = group(root, "hdd");
  const cage = new THREE.Group();
  hdd.add(cage);
  const HZ0 = PZ1 + 16;
  // drive cage (two bays)
  box(TRAY_X + 4, TRAY_X + 6, FLOOR + 2, FLOOR + 120, HZ0, HZ0 + 160, M.caseInner, cage);
  box(TRAY_X + 4, HW - 8, FLOOR + 2, FLOOR + 4, HZ0, HZ0 + 160, M.caseInner, cage);
  // the drive: 147 x 101.6 x 26.1 mm, standing on its side
  const DX0 = TRAY_X + 12;
  const drive = new THREE.Group();
  hdd.add(drive);
  rbox(DX0, DX0 + 26.1, FLOOR + 6, FLOOR + 6 + 101.6, HZ0 + 6, HZ0 + 153, 1.5, M.alu, drive);
  mesh(new THREE.PlaneGeometry(120, 82), std(0xffffff, { map: T.hddLabel, roughness: 0.5 }), drive, [DX0 + 26.15, FLOOR + 57, HZ0 + 82], [0, Math.PI / 2, 0]);
  box(DX0 + 2, DX0 + 24, FLOOR + 6, FLOOR + 9, HZ0 + 12, HZ0 + 150, M.pcbGreenDark, drive);
  anchor("hdd", drive, [DX0 - 4, FLOOR + 90, HZ0 + 40]);

  // ================= CABLES (braided, from the EDGE GOLD) =================
  const cables = group(root, "cables");
  const plug = (x0, x1, y0, y1, z0, z1) => rbox(x0, x1, y0, y1, z0, z1, 1.2, M.cablePlastic, cables, 1);
  const wire = 1.55;
  const seg = hi ? 70 : 40;
  const rad8 = hi ? 8 : 6;
  // 24-pin ATX: from the PSU up the back chamber, through the grommet beside the board
  const atxY = by(124.5);
  const atxPts = [
    [PX0 + 20, PY1 + 4, PZ1 - 40],
    [PX0 + 16, PY1 + 40, PZ1 - 10],
    [TRAY_X + 12, atxY - 10, bz(256)],
    [TRAY_X - 8, atxY, bz(256)],
    [PCB_X - 38, atxY, bz(247)],
    [PCB_X - 34, atxY, bz(235.5)],
    [PCB_X - 22, atxY, bz(235.5)],
  ];
  mesh(G.bundle(atxPts, { rows: 12, cols: 2, r: wire, pitch: 4.2, segments: seg, radial: rad8, across: new THREE.Vector3(0, 1, 0), uvScale: 1 / 6 }), M.sleeve, cables);
  plug(PCB_X - 36, PCB_X - 12, atxY - 27, atxY + 27, bz(229.5), bz(241.5));
  // 8-pin EPS: over the top of the board into the first header
  const epsZ = bz(41.5);
  const epsPts = [
    [PX0 + 24, PY1 + 4, PZ0 + 40],
    [PX0 + 20, PY1 + 80, PZ0 + 50],
    [TRAY_X + 8, TOP - 21, epsZ + 20],
    [TRAY_X - 12, TOP - 22, epsZ + 6],
    [PCB_X - 26, BOARD_TOP + 4, epsZ],
    [PCB_X - 24, by(9), epsZ],
    [PCB_X - 12, by(9), epsZ],
  ];
  mesh(G.bundle(epsPts, { rows: 4, cols: 2, r: wire, pitch: 4.2, segments: seg, radial: rad8, across: new THREE.Vector3(0, 0, 1), uvScale: 1 / 6 }), M.sleeve, cables);
  plug(PCB_X - 26, PCB_X - 12.5, by(15), by(3), epsZ - 9.5, epsZ + 9.5);
  // 12V-2x6 (16-pin) to the GPU's top edge
  const gpz = gCz - 12;
  const gpuPts = [
    [PX0 + 30, PY1 + 4, PZ0 + 100],
    [PX0 + 26, PY1 + 50, PZ0 + 150],
    [TRAY_X + 10, by(200), bz(256)],
    [TRAY_X - 12, by(204), bz(256)],
    [gCx + 6, GY1 + 30, gpz + 46],
    [gCx + 2, GY1 + 24, gpz + 6],
    [gCx + 2, GY1 + 14, gpz],
  ];
  mesh(G.bundle(gpuPts, { rows: 6, cols: 2, r: wire, pitch: 4.2, segments: seg, radial: rad8, across: new THREE.Vector3(0, 0, 1), uvScale: 1 / 6 }), M.sleeve, cables);
  plug(gCx - 5, gCx + 9, GY1 + 7, GY1 + 20, gpz - 13, gpz + 13);
  // SATA data + power to the hard drive (back chamber)
  const sataPts = [
    [DX0 - 1, FLOOR + 30, HZ0 + 4],
    [TRAY_X + 4, FLOOR + 60, HZ0 - 6],
    [TRAY_X - 3, by(265), bz(252)],
    [PCB_X - 12, by(265), bz(246)],
    [PCB_X - 5, by(265), bz(241)],
  ];
  mesh(G.ribbon(sataPts, 8, 1.2, new THREE.Vector3(0, 1, 0), 40), M.cablePlastic, cables);
  const sataPwr = [
    [PX0 + 40, PY1 + 4, PZ1 - 20],
    [DX0 + 13, FLOOR + 130, HZ0 - 10],
    [DX0 + 13, FLOOR + 112, HZ0 + 2],
    [DX0 + 13, FLOOR + 96, HZ0 + 2],
  ];
  mesh(G.bundle(sataPwr, { rows: 1, cols: 5, r: 1.1, pitch: 2.6, segments: 30, radial: 6, across: new THREE.Vector3(1, 0, 0), uvScale: 1 / 6 }), M.sleeve, cables);
  anchor("cables", cables, [PCB_X - 44, atxY + 18, bz(247)]);

  // ---------------- Exploded view offsets (mm), in build order ----------------
  const explode = [
    { obj: cpu, off: [-70, 30, 0] },
    { obj: ram, off: [-80, 20, 0] },
    { obj: ssd, off: [-60, 0, 0] },
    { obj: m2Sink, off: [-60, 0, 0] },
    { obj: mobo, off: [-12, 0, 0] },
    { obj: psu, off: [180, 0, 0] },
    { obj: cooler, off: [-40, 190, 0] },
    { obj: riser, off: [-70, -8, 0] },
    { obj: gpu, off: [-150, 0, 0] },
    { obj: hdd, off: [150, 0, 70] },
    { obj: cables, off: [0, 0, 0], fade: [M.sleeve, M.cablePlastic] },
    { obj: glassSide, off: [-120, 0, 0], fade: [M.glassTint, M.glassReflect, M.frit] },
    { obj: glassFront, off: [0, 0, 120], fade: [M.glassTint, M.glassReflect, M.frit] },
  ];

  // Contact shadow on the "floor"
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(CASE.W * 1.9, CASE.D * 1.6), new THREE.MeshBasicMaterial({ map: T.contact, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.2;
  root.add(contact);

  return { root, parts, anchors, fans, rgbMats, explode, M, gpuFans, radFans };
}
