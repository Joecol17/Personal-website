// Interactive 3D desk setup: orbit, inspect parts, explode the PC, and type on the keyboard.
// three.js is only downloaded once the section gets close to the screen.

const stage = document.querySelector(".setup-stage");
const panel = document.querySelector(".setup-panel");

const PARTS = [
  { id: "monitor", name: "Monitor", kind: "Display",
    text: "Where everything comes together. Mine's running a terminal: type on your keyboard and watch it appear on screen.",
    tip: "Check your refresh rate in display settings. Plenty of 144 Hz monitors are left running at 60 Hz." },
  { id: "keyboard", name: "Mechanical keyboard", kind: "Input",
    text: "Each key has its own switch underneath. Go on, type something: the keys on mine press down with yours.",
    tip: "Different switches feel different: linear, tactile or clicky. Try before you buy." },
  { id: "mouse", name: "Mouse", kind: "Input",
    text: "An optical sensor tracks the surface thousands of times a second. It follows your cursor while it's over the scene.",
    tip: "Lower in-game sensitivity with a bigger mouse mat usually means better aim." },
  { id: "case", name: "Case", kind: "Enclosure",
    text: "Holds everything together and controls airflow. The tempered-glass side panel slides off when you explode the build.",
    tip: "Plan your cable management before you start. It's much harder once the GPU is in." },
  { id: "cpu", name: "CPU + cooler", kind: "Processor",
    text: "The CPU runs every instruction; the tower cooler and fan pull heat away so it can hold its boost clocks.",
    tip: "A pea-sized dot of thermal paste is plenty. The mounting pressure spreads it." },
  { id: "gpu", name: "Graphics card", kind: "GPU",
    text: "Thousands of small cores working in parallel to draw every frame. Usually the biggest and hungriest part in the build.",
    tip: "Check case clearance and PSU wattage before buying a new GPU." },
  { id: "ram", name: "Memory (RAM)", kind: "Memory",
    text: "Fast, temporary storage for whatever the CPU is working on right now. Two sticks run in dual channel.",
    tip: "Turn on XMP/EXPO in the BIOS, otherwise RAM runs slower than the speed on the box." },
  { id: "motherboard", name: "Motherboard", kind: "Mainboard",
    text: "The backbone that connects every component and carries power and data between them.",
    tip: "Use slots A2 and B2 for two sticks of RAM. The manual will say which ones." },
  { id: "storage", name: "Storage", kind: "SSD",
    text: "An NVMe M.2 SSD on the board for the OS and games, plus a 2.5\" SATA SSD for extra space.",
    tip: "Put the OS on NVMe. It boots in seconds compared with a hard drive." },
  { id: "psu", name: "Power supply", kind: "PSU",
    text: "Converts mains AC into the stable DC voltages every other part relies on.",
    tip: "Never cheap out on the PSU. A good 80+ rated unit protects everything else." },
  { id: "fans", name: "Case fans", kind: "Cooling",
    text: "Three intakes at the front, one exhaust at the back. The RGB is purely for style.",
    tip: "Aim for slightly more intake than exhaust (positive pressure) to keep dust out." },
];

let started = false;
const io = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && !started) {
      started = true;
      io.disconnect();
      boot().catch((err) => {
        console.error(err);
        stage.classList.add("is-fallback");
      });
    }
  },
  { rootMargin: "600px 0px" }
);
if (stage) io.observe(stage);

async function boot() {
  const THREE = await import("./vendor/three.bundle.min.js");
  const gsap = window.gsap;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = stage.querySelector(".setup-canvas");
  const hotspotLayer = stage.querySelector(".setup-hotspots");

  // ---------- Renderer, scene, camera ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    stage.classList.add("is-fallback");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
  const HOME = { pos: new THREE.Vector3(0.32, 1.05, 2.3), target: new THREE.Vector3(0.26, 0.3, 0) };
  camera.position.copy(HOME.pos);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.45;
  controls.minAzimuthAngle = -1.2;
  controls.maxAzimuthAngle = 1.2;
  controls.rotateSpeed = 0.6;
  // Let vertical swipes scroll the page on touch screens; horizontal drags rotate
  canvas.style.touchAction = "pan-y";

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2018, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(1.6, 3, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -1.6;
  key.shadow.camera.right = 1.6;
  key.shadow.camera.top = 1.2;
  key.shadow.camera.bottom = -1.2;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.8);
  rim.position.set(-2, 1.5, -2);
  scene.add(rim);

  // ---------- Helpers ----------
  const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...opts });
  const M = {
    desk: mat(0x3b2a20, { roughness: 0.75 }),
    deskEdge: mat(0x2a1d16),
    dark: mat(0x16181d, { roughness: 0.5, metalness: 0.3 }),
    darker: mat(0x0d0f12, { roughness: 0.45, metalness: 0.4 }),
    metal: mat(0x9aa3ad, { roughness: 0.35, metalness: 0.8 }),
    pcb: mat(0x121821, { roughness: 0.7 }),
    keyBase: mat(0x1b1e24, { roughness: 0.4, metalness: 0.2 }),
    mat: mat(0x14161a, { roughness: 0.95 }),
    white: mat(0xe9edf2, { roughness: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb6c8, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide }),
  };
  const rgbMats = [];
  const rgb = (offset = 0, intensity = 2.2) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x4f9dff, emissiveIntensity: intensity, roughness: 0.4 });
    m.userData = { offset, intensity };
    rgbMats.push(m);
    return m;
  };

  function box(w, h, d, material, parent, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cyl(rt, rb, h, material, parent, seg = 32) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const part = (id, parent) => {
    const g = new THREE.Group();
    g.userData.part = id;
    parent.add(g);
    return g;
  };

  // ---------- Desk ----------
  const world = new THREE.Group();
  scene.add(world);
  const desk = box(2.3, 0.045, 0.95, M.desk, world, 0.15, -0.0225, -0.05);
  desk.castShadow = false;
  box(2.3, 0.012, 0.95, M.deskEdge, world, 0.15, -0.051, -0.05);
  [[-0.95, 0.35], [1.25, 0.35], [-0.95, -0.45], [1.25, -0.45]].forEach(([x, z]) =>
    box(0.05, 0.7, 0.05, M.darker, world, x, -0.4, z)
  );

  // ---------- Monitor with a live terminal screen ----------
  const monitor = part("monitor", world);
  monitor.position.set(-0.22, 0, -0.28);
  box(0.28, 0.012, 0.18, M.dark, monitor, 0, 0.006, 0);
  box(0.045, 0.3, 0.03, M.dark, monitor, 0, 0.16, -0.02);
  box(1.02, 0.6, 0.035, M.darker, monitor, 0, 0.53, 0.01);
  box(0.9, 0.5, 0.03, M.dark, monitor, 0, 0.53, -0.015);

  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 1024;
  screenCanvas.height = 576;
  const sctx = screenCanvas.getContext("2d");
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 4;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.555), screenMat);
  screen.position.set(0, 0.53, 0.0285);
  monitor.add(screen);
  const glow = new THREE.PointLight(0x4f9dff, 0.35, 1.2);
  glow.position.set(0, 0.5, 0.35);
  monitor.add(glow);

  const screenState = { lines: [], typed: "", on: true };
  const intro = [
    ["$ neofetch", "#7ee0c3"],
    ["joseph@datum", "#4f9dff"],
    ["Role     Apprentice Infrastructure Engineer", "#c9d1d9"],
    ["Degree   BSc (Hons) DTS: Network Engineer", "#c9d1d9"],
    ["Certs    Cisco Ethical Hacker · IT Essentials", "#c9d1d9"],
    ["", ""],
    ["Type on your keyboard. Press ` for the full terminal.", "#6e7681"],
  ];
  function drawScreen(blink = true) {
    const c = sctx;
    c.fillStyle = "#0b0f14";
    c.fillRect(0, 0, 1024, 576);
    if (!screenState.on) {
      c.fillStyle = "#050607";
      c.fillRect(0, 0, 1024, 576);
      screenTex.needsUpdate = true;
      return;
    }
    // title bar
    c.fillStyle = "#161b22";
    c.fillRect(0, 0, 1024, 44);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(28 + i * 26, 22, 8, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = "#8b949e";
    c.font = "22px 'JetBrains Mono', ui-monospace, monospace";
    c.fillText("joseph@datum: ~", 430, 30);
    c.font = "26px 'JetBrains Mono', ui-monospace, monospace";
    const all = [...intro, ...screenState.lines];
    const visible = all.slice(-13);
    visible.forEach(([text, col], i) => {
      c.fillStyle = col || "#c9d1d9";
      c.fillText(text, 32, 92 + i * 36);
    });
    const y = 92 + visible.length * 36;
    c.fillStyle = "#7ee0c3";
    c.fillText("$", 32, y);
    c.fillStyle = "#e6edf3";
    const typed = screenState.typed.slice(-50);
    c.fillText(typed, 62, y);
    if (blink && Math.floor(performance.now() / 530) % 2 === 0) {
      const w = c.measureText(typed).width;
      c.fillStyle = "#4f9dff";
      c.fillRect(64 + w, y - 22, 14, 28);
    }
    screenTex.needsUpdate = true;
  }
  drawScreen();

  // ---------- Keyboard ----------
  const keyboard = part("keyboard", world);
  keyboard.position.set(-0.2, 0, 0.2);
  const U = 0.0355;
  const layout = [
    [["Backquote", "`"], ["Digit1", "1"], ["Digit2", "2"], ["Digit3", "3"], ["Digit4", "4"], ["Digit5", "5"], ["Digit6", "6"], ["Digit7", "7"], ["Digit8", "8"], ["Digit9", "9"], ["Digit0", "0"], ["Minus", "-"], ["Equal", "="], ["Backspace", "⌫", 2]],
    [["Tab", "tab", 1.5], ["KeyQ", "Q"], ["KeyW", "W"], ["KeyE", "E"], ["KeyR", "R"], ["KeyT", "T"], ["KeyY", "Y"], ["KeyU", "U"], ["KeyI", "I"], ["KeyO", "O"], ["KeyP", "P"], ["BracketLeft", "["], ["BracketRight", "]"], ["Backslash", "\\", 1.5]],
    [["CapsLock", "caps", 1.75], ["KeyA", "A"], ["KeyS", "S"], ["KeyD", "D"], ["KeyF", "F"], ["KeyG", "G"], ["KeyH", "H"], ["KeyJ", "J"], ["KeyK", "K"], ["KeyL", "L"], ["Semicolon", ";"], ["Quote", "'"], ["Enter", "enter", 2.25]],
    [["ShiftLeft", "shift", 2.25], ["KeyZ", "Z"], ["KeyX", "X"], ["KeyC", "C"], ["KeyV", "V"], ["KeyB", "B"], ["KeyN", "N"], ["KeyM", "M"], ["Comma", ","], ["Period", "."], ["Slash", "/"], ["ShiftRight", "shift", 2.75]],
    [["ControlLeft", "ctrl", 1.25], ["MetaLeft", "", 1.25], ["AltLeft", "alt", 1.25], ["Space", "", 6.25], ["AltRight", "alt", 1.25], ["Fn", "fn", 1.25], ["ContextMenu", "", 1.25], ["ControlRight", "ctrl", 1.25]],
  ];
  const kbW = 15 * U + 0.025;
  const kbD = 5 * U + 0.025;
  box(kbW, 0.022, kbD, M.keyBase, keyboard, 0, 0.011, 0);
  const underglow = new THREE.Mesh(new THREE.BoxGeometry(kbW - 0.01, 0.004, kbD - 0.01), rgb(0.3, 1.2));
  underglow.position.y = 0.0225;
  keyboard.add(underglow);

  const keyMeshes = {};
  const keyGeoCache = {};
  const keySide = mat(0x23262d, { roughness: 0.55 });
  function legendMaterial(label) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const c = cv.getContext("2d");
    c.fillStyle = "#2b2f37";
    c.fillRect(0, 0, 64, 64);
    if (label) {
      c.fillStyle = "#d7dde5";
      c.font = `${label.length > 1 ? 15 : 26}px Inter, Arial, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(label, 32, 34);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0x4f9dff, emissiveIntensity: 0 });
  }
  layout.forEach((row, r) => {
    let x = -7.5 * U;
    row.forEach(([code, label, w = 1]) => {
      const kw = w * U - 0.005;
      const geo = keyGeoCache[w] || (keyGeoCache[w] = new THREE.BoxGeometry(kw, 0.012, U - 0.005));
      const top = legendMaterial(label);
      const mesh = new THREE.Mesh(geo, [keySide, keySide, top, keySide, keySide, keySide]);
      mesh.position.set(x + (w * U) / 2, 0.029, -2 * U + r * U);
      mesh.castShadow = true;
      mesh.userData.restY = mesh.position.y;
      mesh.userData.top = top;
      keyboard.add(mesh);
      keyMeshes[code] = mesh;
      x += w * U;
    });
  });

  function pressKey(code, down) {
    const k = keyMeshes[code];
    if (!k) return;
    const y = down ? k.userData.restY - 0.006 : k.userData.restY;
    if (gsap) {
      gsap.to(k.position, { y, duration: down ? 0.05 : 0.18, ease: down ? "power2.out" : "back.out(3)", overwrite: true });
      gsap.to(k.userData.top, { emissiveIntensity: down ? 1.4 : 0, duration: down ? 0.05 : 0.6, overwrite: true });
    } else {
      k.position.y = y;
      k.userData.top.emissiveIntensity = down ? 1.4 : 0;
    }
  }

  // ---------- Mouse + mat ----------
  const mouseGroup = part("mouse", world);
  mouseGroup.position.set(0.33, 0, 0.2);
  box(0.36, 0.004, 0.3, M.mat, mouseGroup, 0, 0.002, 0).castShadow = false;
  const mouse = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.04, 8, 16), M.dark);
  mouse.rotation.x = Math.PI / 2;
  mouse.scale.set(1, 1, 0.55);
  mouse.position.y = 0.02;
  mouse.castShadow = true;
  mouseGroup.add(mouse);
  const wheel = cyl(0.007, 0.007, 0.006, rgb(0.6, 1.5), mouse, 16);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0, -0.03, -0.022);

  // ---------- Tower ----------
  const tower = part("case", world);
  tower.position.set(0.88, 0, -0.12);
  tower.rotation.y = 1.1; // turn the glass side towards the viewer
  const TW = 0.23;
  const TH = 0.48;
  const TD = 0.46;
  const tCenter = new THREE.Group();
  tCenter.position.y = TH / 2 + 0.01;
  tower.add(tCenter);
  // feet
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(0.03, 0.01, 0.03, M.darker, tower, sx * 0.08, 0.005, sz * 0.18));
  // panels (+x side, top, bottom, back, front)
  box(0.006, TH, TD, M.dark, tCenter, TW / 2, 0, 0);
  box(TW, 0.006, TD, M.dark, tCenter, 0, TH / 2, 0);
  box(TW, 0.006, TD, M.dark, tCenter, 0, -TH / 2, 0);
  box(TW, TH, 0.006, M.dark, tCenter, 0, 0, -TD / 2);
  box(TW, TH, 0.012, M.darker, tCenter, 0, 0, TD / 2);
  box(0.008, TH - 0.06, 0.004, rgb(0, 2.5), tCenter, -TW / 2 + 0.03, 0, TD / 2 + 0.008);
  const powerBtn = cyl(0.009, 0.009, 0.004, rgb(0.5, 3), tCenter, 16);
  powerBtn.position.set(0, TH / 2 + 0.004, TD / 2 - 0.05);

  // glass side panel (-x, facing the camera)
  const glassPart = part("glass", tCenter);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.004, TH, TD), M.glass);
  glass.position.x = -TW / 2;
  glassPart.add(glass);
  glassPart.userData.part = "case";

  const interior = new THREE.PointLight(0x4f9dff, 0.9, 0.7);
  interior.position.set(-0.02, 0.05, 0.05);
  tCenter.add(interior);

  // motherboard
  const mobo = part("motherboard", tCenter);
  box(0.004, 0.3, 0.3, M.pcb, mobo, TW / 2 - 0.008, 0.06, -0.05);
  box(0.012, 0.05, 0.02, M.metal, mobo, TW / 2 - 0.015, 0.17, -0.16); // VRM heatsink
  box(0.012, 0.02, 0.09, M.metal, mobo, TW / 2 - 0.015, 0.2, -0.07);
  box(0.01, 0.06, 0.06, M.metal, mobo, TW / 2 - 0.014, -0.05, 0.06); // chipset
  for (let i = 0; i < 3; i++) box(0.006, 0.006, 0.12, M.darker, mobo, TW / 2 - 0.012, -0.02 - i * 0.03, -0.08); // pcie slots

  // CPU cooler (tower heatsink + fan)
  const cpu = part("cpu", tCenter);
  box(0.004, 0.045, 0.045, M.metal, cpu, TW / 2 - 0.012, 0.1, -0.06);
  const sink = new THREE.Group();
  sink.position.set(TW / 2 - 0.06, 0.1, -0.06);
  cpu.add(sink);
  for (let i = 0; i < 12; i++) box(0.085, 0.09, 0.0025, M.metal, sink, 0, 0, -0.04 + i * 0.0072);
  const cpuFan = makeFan(0.045, 0.2);
  cpuFan.group.position.set(0, 0, 0.05);
  sink.add(cpuFan.group);

  // RAM
  const ram = part("ram", tCenter);
  for (let i = 0; i < 2; i++) {
    const stick = new THREE.Group();
    stick.position.set(TW / 2 - 0.028, 0.105, 0.035 + i * 0.016);
    ram.add(stick);
    box(0.036, 0.1, 0.006, M.darker, stick, 0, 0, 0);
    box(0.006, 0.098, 0.007, rgb(0.15 + i * 0.1, 2.2), stick, -0.02, 0, 0);
  }

  // GPU
  const gpu = part("gpu", tCenter);
  const gpuBody = new THREE.Group();
  gpuBody.position.set(TW / 2 - 0.075, -0.03, -0.03);
  gpu.add(gpuBody);
  box(0.13, 0.045, 0.28, M.darker, gpuBody, 0, 0, 0);
  box(0.13, 0.004, 0.28, M.metal, gpuBody, 0, 0.024, 0); // backplate
  box(0.004, 0.035, 0.24, rgb(0.45, 2.4), gpuBody, -0.066, 0, 0);
  [-0.07, 0.07].forEach((z) => {
    const f = makeFan(0.045, 0.45);
    f.group.rotation.x = Math.PI / 2;
    f.group.position.set(0, -0.024, z);
    gpuBody.add(f.group);
  });

  // Storage: M.2 on the board + a 2.5" SSD on the floor
  const storage = part("storage", tCenter);
  box(0.004, 0.02, 0.08, mat(0x0e3b2e), storage, TW / 2 - 0.012, 0.03, 0.01);
  box(0.07, 0.008, 0.1, M.white, storage, -0.02, -TH / 2 + 0.012, 0.13);

  // PSU at the bottom
  const psu = part("psu", tCenter);
  box(0.15, 0.085, 0.15, M.darker, psu, 0.02, -TH / 2 + 0.05, -0.13);
  box(0.002, 0.06, 0.1, M.metal, psu, -0.056, -TH / 2 + 0.05, -0.13);

  // Case fans: three intakes at the front, one exhaust at the back
  const fans = part("fans", tCenter);
  const allFans = [cpuFan];
  [-0.14, 0, 0.14].forEach((y, i) => {
    const f = makeFan(0.062, 0.1 + i * 0.12);
    f.group.position.set(0, y, TD / 2 - 0.025);
    fans.add(f.group);
    allFans.push(f);
  });
  const rear = makeFan(0.055, 0.7);
  rear.group.position.set(0, 0.14, -TD / 2 + 0.02);
  fans.add(rear.group);
  allFans.push(rear);

  function makeFan(r, hueOffset) {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 10, 40), rgb(hueOffset, 2.6));
    group.add(ring);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.14, 6, 4), M.darker);
    frame.rotation.z = Math.PI / 4;
    frame.scale.set(1.25, 1.25, 1);
    group.add(frame);
    const rotor = new THREE.Group();
    group.add(rotor);
    const hub = cyl(r * 0.3, r * 0.3, r * 0.25, M.darker, rotor, 20);
    hub.rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(r * 0.62, r * 0.28, 0.002), M.dark);
      blade.position.x = r * 0.55;
      const holder = new THREE.Group();
      holder.rotation.z = (i / 7) * Math.PI * 2;
      blade.rotation.x = 0.35;
      holder.add(blade);
      rotor.add(holder);
    }
    return { group, rotor, speed: 9 + Math.random() * 4 };
  }

  // A mug, because every desk has one
  const mug = new THREE.Group();
  mug.position.set(0.47, 0, -0.33);
  world.add(mug);
  const mugBody = cyl(0.04, 0.036, 0.1, M.white, mug);
  mugBody.position.y = 0.05;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 20, Math.PI), M.white);
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.04, 0.05, 0);
  mug.add(handle);

  // ---------- Exploded view ----------
  const explodeTargets = [
    [glassPart, { x: -0.42, y: 0.04 }],
    [gpu, { x: -0.26, y: -0.03 }],
    [cpu, { x: -0.3, y: 0.12 }],
    [ram, { x: -0.2, y: 0.2 }],
    [storage, { x: -0.18, y: -0.02 }],
    [psu, { x: -0.2, y: -0.08 }],
    [fans, { x: -0.06, z: 0.1 }],
    [mobo, { x: 0.04 }],
  ].map(([obj, off]) => ({ obj, off, home: obj.position.clone() }));
  let exploded = false;
  function setExploded(on) {
    exploded = on;
    stage.classList.toggle("is-exploded", on);
    explodeTargets.forEach(({ obj, off, home }, i) => {
      const to = { x: home.x + (on ? off.x || 0 : 0), y: home.y + (on ? off.y || 0 : 0), z: home.z + (on ? off.z || 0 : 0) };
      if (gsap && !reduceMotion) gsap.to(obj.position, { ...to, duration: 1.1, delay: (on ? i : explodeTargets.length - i) * 0.05, ease: "expo.inOut" });
      else obj.position.set(to.x, to.y, to.z);
    });
    stage.querySelector('[data-action="explode"]').textContent = on ? "Rebuild PC" : "Explode PC";
    stage.querySelector('[data-action="explode"]').setAttribute("aria-pressed", String(on));
  }

  // ---------- Power (RGB, fans, screen) ----------
  let powered = true;
  function setPower(on) {
    powered = on;
    screenState.on = on;
    drawScreen();
    const btn = stage.querySelector('[data-action="power"]');
    btn.textContent = on ? "Power off" : "Power on";
    btn.setAttribute("aria-pressed", String(!on));
    glow.visible = on;
    interior.visible = on;
    rgbMats.forEach((m) => (m.emissiveIntensity = on ? m.userData.intensity : 0));
  }

  // ---------- Hotspots ----------
  const anchors = {
    monitor: [monitor, [0, 0.86, 0.02]],
    keyboard: [keyboard, [0.12, 0.05, 0]],
    mouse: [mouseGroup, [0, 0.05, 0]],
    case: [tower, [-0.02, TH + 0.06, TD / 2 - 0.02]],
    cpu: [sink, [-0.05, 0.05, 0]],
    gpu: [gpuBody, [-0.07, 0.01, 0.08]],
    ram: [ram, [TW / 2 - 0.05, 0.17, 0.043]],
    motherboard: [mobo, [TW / 2 - 0.01, -0.07, -0.16]],
    storage: [storage, [-0.02, -TH / 2 + 0.03, 0.13]],
    psu: [psu, [-0.06, -TH / 2 + 0.06, -0.08]],
    fans: [fans, [-0.02, -0.14, TD / 2 - 0.02]],
  };
  const views = {
    monitor: { dist: 1.25, dir: [0.1, 0.25, 1] },
    keyboard: { dist: 0.75, dir: [0, 0.9, 0.9] },
    mouse: { dist: 0.6, dir: [0.2, 0.9, 0.8] },
    case: { dist: 1.2, dir: [-0.35, 0.45, 1] },
  };
  const INSIDE = new Set(["cpu", "gpu", "ram", "motherboard", "storage", "psu", "fans"]);
  const hotspots = PARTS.map((p, i) => {
    const b = document.createElement("button");
    b.className = "hotspot" + (INSIDE.has(p.id) ? " is-inner" : "");
    b.type = "button";
    b.innerHTML = `<span>${String(i + 1).padStart(2, "0")}</span>`;
    b.setAttribute("aria-label", `Inspect ${p.name}`);
    b.addEventListener("click", () => select(i));
    hotspotLayer.appendChild(b);
    return b;
  });

  let current = -1;
  const tmp = new THREE.Vector3();
  function anchorWorld(id, out) {
    const [obj, off] = anchors[id];
    return obj.localToWorld(out.set(off[0], off[1], off[2]));
  }

  function flyTo(pos, target) {
    if (gsap && !reduceMotion) {
      gsap.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: 1.3, ease: "expo.inOut" });
      gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration: 1.3, ease: "expo.inOut" });
    } else {
      camera.position.copy(pos);
      controls.target.copy(target);
    }
  }

  function select(i) {
    current = (i + PARTS.length) % PARTS.length;
    const p = PARTS[current];
    hotspots.forEach((h, k) => h.classList.toggle("is-active", k === current));
    panel.querySelector(".setup-panel-idx").textContent = `${String(current + 1).padStart(2, "0")} / ${PARTS.length}`;
    panel.querySelector(".setup-panel-kind").textContent = p.kind;
    panel.querySelector(".setup-panel-title").textContent = p.name;
    panel.querySelector(".setup-panel-text").textContent = p.text;
    panel.querySelector(".setup-panel-tip").innerHTML = `<strong>Build tip</strong> ${p.tip}`;
    panel.classList.remove("is-intro");
    if (gsap && !reduceMotion) gsap.fromTo(panel.querySelectorAll(".setup-panel-body > *"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power3.out" });

    // Parts inside the tower are easier to see with the glass off
    const inside = INSIDE.has(p.id);
    if (inside && !exploded) setExploded(true);

    // Aim at where the part will be once the explode animation finishes
    const target = new THREE.Vector3();
    withFinalPose(() => anchorWorld(p.id, target));
    let dir;
    let dist;
    if (views[p.id]) {
      dir = new THREE.Vector3(...views[p.id].dir);
      dist = views[p.id].dist;
    } else {
      // look in through the open side of the case
      dir = new THREE.Vector3(-1, 0.5, 0.3).applyQuaternion(tower.quaternion);
      dist = p.id === "fans" || p.id === "motherboard" ? 1.15 : 0.9;
    }
    dir.normalize();
    flyTo(target.clone().add(dir.multiplyScalar(dist)), target);
  }

  function withFinalPose(fn) {
    const saved = explodeTargets.map(({ obj }) => obj.position.clone());
    explodeTargets.forEach(({ obj, off, home }) => {
      obj.position.set(
        home.x + (exploded ? off.x || 0 : 0),
        home.y + (exploded ? off.y || 0 : 0),
        home.z + (exploded ? off.z || 0 : 0)
      );
    });
    world.updateMatrixWorld(true);
    fn();
    explodeTargets.forEach(({ obj }, i) => obj.position.copy(saved[i]));
    world.updateMatrixWorld(true);
  }

  function resetView() {
    current = -1;
    hotspots.forEach((h) => h.classList.remove("is-active"));
    flyTo(HOME.pos, HOME.target);
    setExploded(false);
  }

  panel.querySelector('[data-action="prev"]').addEventListener("click", () => select(current < 0 ? PARTS.length - 1 : current - 1));
  panel.querySelector('[data-action="next"]').addEventListener("click", () => select(current + 1));
  stage.querySelector('[data-action="explode"]').addEventListener("click", () => setExploded(!exploded));
  stage.querySelector('[data-action="power"]').addEventListener("click", () => setPower(!powered));
  stage.querySelector('[data-action="reset"]').addEventListener("click", resetView);

  // ---------- Pointer: hover parts, click to inspect, mouse follows cursor ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerInside = false;
  let downAt = null;
  const partIndex = Object.fromEntries(PARTS.map((p, i) => [p.id, i]));
  function partAt(e) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.children, true).find((h) => h.object.visible && h.object.material !== M.glass);
    let o = hit && hit.object;
    while (o && !o.userData.part) o = o.parent;
    return o ? o.userData.part : null;
  }
  canvas.addEventListener("pointermove", (e) => {
    pointerInside = true;
    const id = partAt(e);
    canvas.style.cursor = id ? "pointer" : "grab";
    stage.dataset.hover = id || "";
  });
  canvas.addEventListener("pointerleave", () => (pointerInside = false));
  canvas.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
  canvas.addEventListener("pointerup", (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved > 5) return;
    const id = partAt(e);
    if (id && id in partIndex) select(partIndex[id]);
  });

  // ---------- Typing on the real keyboard drives the 3D one ----------
  let visible = false;
  let active = false;
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      active = entry.intersectionRatio >= 0.55;
      stage.classList.toggle("is-active", active);
      if (visible) loop();
    },
    { threshold: [0, 0.55] }
  ).observe(stage);

  const held = new Set();
  const terminalOpen = () => document.body.classList.contains("term-open");
  document.addEventListener(
    "keydown",
    (e) => {
      if (!active || terminalOpen() || (window.isTyping && window.isTyping(e)) || e.metaKey || e.ctrlKey) return;
      if (e.code === "Backquote" || !keyMeshes[e.code]) return; // let ` open the terminal
      if (!held.has(e.code)) pressKey(e.code, true);
      held.add(e.code);
      if (e.code === "Tab") return; // keep keyboard navigation working
      // Captured: don't also toggle the grid, scroll the page, etc.
      e.stopImmediatePropagation();
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      if (!powered) return;
      if (e.key === "Backspace") screenState.typed = screenState.typed.slice(0, -1);
      else if (e.key === "Enter") {
        const cmd = screenState.typed.trim();
        screenState.lines.push([`$ ${cmd}`, "#e6edf3"]);
        if (cmd) screenState.lines.push([reply(cmd), "#8b949e"]);
        screenState.typed = "";
      } else if (e.key.length === 1) screenState.typed += e.key;
      drawScreen();
    },
    true
  );
  document.addEventListener("keyup", (e) => {
    if (held.delete(e.code)) pressKey(e.code, false);
  });
  window.addEventListener("blur", () => {
    held.forEach((c) => pressKey(c, false));
    held.clear();
  });

  function reply(cmd) {
    const c = cmd.toLowerCase();
    if (c === "help") return "This is only a mini screen. Press ` for the full terminal.";
    if (c === "whoami") return "joseph: apprentice infrastructure engineer @ datum";
    if (c.startsWith("ping")) return "64 bytes from 10.26.10.5: icmp_seq=0 ttl=64 time=0.42 ms";
    if (c === "clear") {
      screenState.lines = [];
      return "";
    }
    return `${cmd.split(" ")[0]}: command not found (try help)`;
  }

  // ---------- Resize + render loop ----------
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull the camera back a bit on narrow screens so the whole desk fits
    camera.fov = width < 480 ? 60 : width < 800 ? 48 : 38;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let lastTime = 0;
  let running = false;
  const mouseHome = mouse.position.clone();
  const lastPointer = new THREE.Vector2();
  function loop() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    const frame = () => {
      if (!visible || document.hidden) {
        running = false;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const t = now / 1000;
      controls.update();

      if (powered && !reduceMotion) {
        allFans.forEach((f) => (f.rotor.rotation.z += f.speed * dt));
        rgbMats.forEach((m) => m.emissive.setHSL((t * 0.08 + m.userData.offset) % 1, 0.85, 0.55));
        interior.color.setHSL((t * 0.08 + 0.2) % 1, 0.8, 0.6);
      }
      // the desk mouse follows your cursor a little
      if (pointerInside) lastPointer.copy(pointer);
      mouse.position.x += (mouseHome.x + lastPointer.x * 0.07 - mouse.position.x) * 0.12;
      mouse.position.z += (mouseHome.z - lastPointer.y * 0.06 - mouse.position.z) * 0.12;

      // cursor blink on the monitor
      if (powered && Math.floor(t * 1.9) !== frame.blink) {
        frame.blink = Math.floor(t * 1.9);
        drawScreen();
      }

      renderer.render(scene, camera);

      // position the HTML hotspots over their 3D anchors
      const { width, height } = canvas.getBoundingClientRect();
      PARTS.forEach((p, i) => {
        anchorWorld(p.id, tmp).project(camera);
        const h = hotspots[i];
        const hidden = tmp.z > 1;
        h.style.transform = `translate(${((tmp.x + 1) / 2) * width}px, ${((1 - tmp.y) / 2) * height}px)`;
        h.classList.toggle("is-hidden", hidden);
      });

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && visible) loop();
  });

  stage.classList.add("is-ready");
  if (visible) loop();
}
