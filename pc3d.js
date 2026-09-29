// Interactive 3D model of my PC, built part by part in code at real-world dimensions.
// Orbit it, inspect each part, explode it in build order, and power it off.
// three.js (and the studio HDRI) are only downloaded once the section gets close to the screen.

import { PARTS } from "./pc3d/parts.js";

const stage = document.querySelector(".setup-stage");
const panel = document.querySelector(".setup-panel");

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function fillPanel(i) {
  const p = PARTS[i];
  panel.querySelector(".setup-panel-idx").textContent = `${String(i + 1).padStart(2, "0")} / ${PARTS.length}`;
  panel.querySelector(".setup-panel-kind").textContent = p.step ? `${p.kind} · build step ${p.step}` : p.kind;
  panel.querySelector(".setup-panel-title").textContent = p.name;
  panel.querySelector(".setup-panel-specs").innerHTML = p.specs.map((s) => `<li>${esc(s)}</li>`).join("");
  panel.querySelector(".setup-panel-text").textContent = p.text;
  panel.querySelector(".setup-panel-tip").innerHTML = `<strong>Build tip</strong> ${esc(p.tip)}`;
  panel.classList.remove("is-intro");
}

// Without WebGL the side panel still walks through the parts
function fallback() {
  stage.classList.add("is-fallback");
  let i = -1;
  panel.querySelector('[data-action="prev"]').addEventListener("click", () => fillPanel((i = i < 1 ? PARTS.length - 1 : i - 1)));
  panel.querySelector('[data-action="next"]').addEventListener("click", () => fillPanel((i = (i + 1) % PARTS.length)));
}

let started = false;
const io = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && !started) {
      started = true;
      io.disconnect();
      boot().catch((err) => {
        console.error(err);
        fallback();
      });
    }
  },
  { rootMargin: "600px 0px" }
);
if (stage) io.observe(stage);

async function boot() {
  const [THREE, { createGeo }, { createTextures }, { buildPC, CASE }, { createBloom }, { loadHDR }] = await Promise.all([
    import("./vendor/three.bundle.min.js"),
    import("./pc3d/geo.js"),
    import("./pc3d/textures.js"),
    import("./pc3d/build.js"),
    import("./pc3d/bloom.js"),
    import("./pc3d/hdr.js"),
  ]);
  const gsap = window.gsap;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hi = !matchMedia("(max-width: 720px), (pointer: coarse)").matches;
  const canvas = stage.querySelector(".setup-canvas");
  const hotspotLayer = stage.querySelector(".setup-hotspots");

  // ---------- Renderer ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    fallback();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 1.75 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const canBloom = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
  const bloom = canBloom ? createBloom(THREE, renderer, { levels: hi ? 5 : 3, samples: hi ? 4 : 2, strength: 0.9, threshold: 2.4 }) : null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);

  // ---------- Model ----------
  const G = createGeo(THREE);
  const T = createTextures(THREE, { hi });
  const pc = buildPC(THREE, G, T, { hi });
  const MM = 0.001;
  const world = pc.root;
  world.scale.setScalar(MM);
  world.position.y = (-CASE.H / 2) * MM;
  scene.add(world);

  // ---------- Lighting: studio HDRI for reflections + one shadow-casting key light ----------
  scene.add(new THREE.HemisphereLight(0xe8eef5, 0x1a1a1e, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-1.6, 0.75, 0.9);
  key.castShadow = true;
  key.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  Object.assign(key.shadow.camera, { left: -0.36, right: 0.36, top: 0.36, bottom: -0.36, near: 0.5, far: 3.5 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.0015;
  key.shadow.radius = hi ? 4 : 2;
  scene.add(key);
  const envReady = loadHDR(THREE, "assets/studio_small_08_1k.hdr")
    .then((tex) => {
      scene.environment = tex;
      scene.environmentIntensity = 1.25;
      scene.environmentRotation.y = -0.6;
    })
    .catch((err) => {
      // no HDRI: fall back to plain lights
      console.warn("Studio HDRI unavailable, using basic lighting", err);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x303035, 1.2));
    });

  // ---------- Camera + controls ----------
  const HOME_DIR = new THREE.Vector3(-1.15, 0.5, 0.85).normalize();
  const HOME_TARGET = new THREE.Vector3(0, 0.005, 0);
  let homeDist = 1.12;
  camera.position.copy(HOME_DIR).multiplyScalar(homeDist).add(HOME_TARGET);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = !reduceMotion;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = 1.75;
  controls.rotateSpeed = 0.6;
  // Let vertical swipes scroll the page on touch screens; horizontal drags rotate
  canvas.style.touchAction = "pan-y";

  // ---------- Exploded view (parts separate in build order) ----------
  const explodeTargets = pc.explode.map((e) => ({ ...e, home: e.obj.position.clone() }));
  for (const e of explodeTargets) if (e.fade) for (const m of e.fade) m.userData.opacity = m.opacity;
  const fadeTo = (e, on) => e.fade.map((m) => ({ m, to: on ? 0 : m.userData.opacity }));
  let exploded = false;
  let shadowFrames = 2;
  function finalPos(e, on, out) {
    return out.set(e.home.x + (on ? e.off[0] : 0), e.home.y + (on ? e.off[1] : 0), e.home.z + (on ? e.off[2] : 0));
  }
  function setExploded(on) {
    exploded = on;
    stage.classList.toggle("is-exploded", on);
    const n = explodeTargets.length;
    explodeTargets.forEach((e, i) => {
      const to = finalPos(e, on, new THREE.Vector3());
      const delay = (on ? i : n - 1 - i) * 0.09;
      if (gsap && !reduceMotion) {
        gsap.to(e.obj.position, { x: to.x, y: to.y, z: to.z, duration: 1.1, delay, ease: "expo.inOut", overwrite: true, onUpdate: () => (shadowFrames = 2) });
        if (e.fade) {
          if (!on) e.obj.visible = true;
          for (const { m, to } of fadeTo(e, on)) gsap.to(m, { opacity: to, duration: 0.5, delay, overwrite: true, onComplete: () => (e.obj.visible = !on) });
        }
      } else {
        e.obj.position.copy(to);
        if (e.fade) {
          for (const { m, to } of fadeTo(e, on)) m.opacity = to;
          e.obj.visible = !on;
        }
      }
    });
    shadowFrames = 2;
    if (current < 0) flyTo(homePose(on).pos, homePose(on).target);
    const btn = stage.querySelector('[data-action="explode"]');
    btn.textContent = on ? "Rebuild PC" : "Explode PC";
    btn.setAttribute("aria-pressed", String(on));
  }

  // ---------- Power: fans, RGB and glow ----------
  let powered = true;
  let power = 1; // eased 0..1
  function setPower(on) {
    powered = on;
    const btn = stage.querySelector('[data-action="power"]');
    btn.textContent = on ? "Power off" : "Power on";
    btn.setAttribute("aria-pressed", String(!on));
    if (reduceMotion) power = on ? 1 : 0;
  }

  // ---------- Hotspots ----------
  const INNER = new Set(["cpu", "psu", "hdd"]); // hidden until the build is exploded
  // parts that are easier to see with the build taken apart (true) or put together (false)
  const EXPLODE_FOR = { cpu: true, psu: true, hdd: true, motherboard: true, ssd: true, cables: false };
  const VIEWS = {
    case: { dir: [-0.9, 0.5, 1.05], dist: 1.2 },
    motherboard: { dir: [-1, 0.3, 0.45], dist: 0.62 },
    cpu: { dir: [-1, 0.45, 0.35], dist: 0.34 },
    cooler: { dir: [-1, 0.2, 0.75], dist: 0.62 },
    ram: { dir: [-1, 0.55, 0.45], dist: 0.36 },
    ssd: { dir: [-1, 0.45, 0.4], dist: 0.32 },
    gpu: { dir: [-1, 0.3, 0.55], dist: 0.72 },
    riser: { dir: [-0.45, 0.1, 1], dist: 0.42 },
    psu: { dir: [0.35, 0.45, 1], dist: 0.62 },
    hdd: { dir: [0.35, 0.45, 1], dist: 0.55 },
    cables: { dir: [-1, 0.35, 0.8], dist: 0.5 },
  };
  const hotspots = PARTS.map((p, i) => {
    const b = document.createElement("button");
    b.className = "hotspot" + (INNER.has(p.id) ? " is-inner" : "");
    b.type = "button";
    b.innerHTML = `<span>${String(i + 1).padStart(2, "0")}</span>`;
    b.setAttribute("aria-label", `Inspect ${p.name}`);
    b.addEventListener("click", () => select(i));
    hotspotLayer.appendChild(b);
    return b;
  });
  panel.querySelector(".setup-panel-idx").textContent = `00 / ${PARTS.length}`;

  let current = -1;
  const tmp = new THREE.Vector3();
  function anchorWorld(id, out) {
    const [obj, at] = pc.anchors[id];
    return obj.localToWorld(out.set(at[0], at[1], at[2]));
  }
  function withFinalPose(fn) {
    const saved = explodeTargets.map((e) => e.obj.position.clone());
    explodeTargets.forEach((e) => finalPos(e, exploded, e.obj.position));
    world.updateMatrixWorld(true);
    fn();
    explodeTargets.forEach((e, i) => e.obj.position.copy(saved[i]));
    world.updateMatrixWorld(true);
  }

  // default framing; pulled back and raised a little when exploded so every part fits
  function homePose(on) {
    const target = HOME_TARGET.clone();
    if (on) target.y += 0.06;
    return { pos: HOME_DIR.clone().multiplyScalar(homeDist * (on ? 1.55 : 1)).add(target), target };
  }
  function flyTo(pos, target) {
    if (gsap && !reduceMotion) {
      gsap.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: 1.3, ease: "expo.inOut", overwrite: true });
      gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration: 1.3, ease: "expo.inOut", overwrite: true });
    } else {
      camera.position.copy(pos);
      controls.target.copy(target);
    }
  }

  function select(i) {
    current = (i + PARTS.length) % PARTS.length;
    const p = PARTS[current];
    hotspots.forEach((h, k) => h.classList.toggle("is-active", k === current));
    fillPanel(current);
    if (gsap && !reduceMotion) gsap.fromTo(panel.querySelectorAll(".setup-panel-body > *"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power3.out" });

    if (p.id in EXPLODE_FOR && EXPLODE_FOR[p.id] !== exploded) setExploded(EXPLODE_FOR[p.id]);
    const target = new THREE.Vector3();
    withFinalPose(() => anchorWorld(p.id, target));
    const v = VIEWS[p.id];
    const dir = new THREE.Vector3(...v.dir).normalize();
    flyTo(target.clone().addScaledVector(dir, v.dist * fitFactor()), p.id === "case" ? HOME_TARGET : target);
  }

  function resetView() {
    current = -1;
    hotspots.forEach((h) => h.classList.remove("is-active"));
    setExploded(false);
  }

  panel.querySelector('[data-action="prev"]').addEventListener("click", () => select(current < 0 ? PARTS.length - 1 : current - 1));
  panel.querySelector('[data-action="next"]').addEventListener("click", () => select(current + 1));
  stage.querySelector('[data-action="explode"]').addEventListener("click", () => setExploded(!exploded));
  stage.querySelector('[data-action="power"]').addEventListener("click", () => setPower(!powered));
  stage.querySelector('[data-action="reset"]').addEventListener("click", resetView);

  // ---------- Pointer: hover and click parts ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  const partIndex = Object.fromEntries(PARTS.map((p, i) => [p.id, i]));
  const skip = new Set([pc.M.glassTint, pc.M.glassReflect]);
  function partAt(e) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.children, true).find((h) => !skip.has(h.object.material) && isVisible(h.object));
    let o = hit && hit.object;
    while (o && !o.userData.part) o = o.parent;
    return o ? o.userData.part : null;
  }
  const ray = new THREE.Raycaster();
  const dirTmp = new THREE.Vector3();
  function occluded(id, at) {
    dirTmp.copy(at).sub(camera.position);
    const dist = dirTmp.length();
    ray.set(camera.position, dirTmp.normalize());
    ray.far = dist - 0.012;
    const hit = ray.intersectObjects(world.children, true).find((h) => !skip.has(h.object.material) && isVisible(h.object));
    if (!hit) return false;
    let o = hit.object;
    while (o && !o.userData.part) o = o.parent;
    return !o || o.userData.part !== id;
  }
  function isVisible(o) {
    for (; o; o = o.parent) if (!o.visible) return false;
    return true;
  }
  let hoverQueued = null;
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || e.buttons) return;
    // throttle hover raycasts to one per frame
    if (!hoverQueued)
      requestAnimationFrame(() => {
        const id = partAt(hoverQueued);
        canvas.style.cursor = id ? "pointer" : "grab";
        stage.dataset.hover = id || "";
        hoverQueued = null;
      });
    hoverQueued = e;
  });
  canvas.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
  canvas.addEventListener("pointerup", (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved > 5) return;
    const id = partAt(e);
    if (id && id in partIndex) select(partIndex[id]);
  });

  // ---------- Typing pulses the motherboard RGB ----------
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

  let pulse = 0;
  let hueKick = 0;
  const terminalOpen = () => document.body.classList.contains("term-open");
  document.addEventListener(
    "keydown",
    (e) => {
      if (!active || terminalOpen() || (window.isTyping && window.isTyping(e)) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1 || e.code === "Backquote") return; // let ` open the terminal
      // Captured: don't also toggle the grid overlay etc.
      e.stopImmediatePropagation();
      if (!powered || e.repeat) return;
      pulse = Math.min(pulse + 0.8, 2.2);
      hueKick = (hueKick + 0.137) % 1;
    },
    true
  );

  // ---------- Resize ----------
  function fitFactor() {
    // pull back on narrow (portrait) stages so the whole case still fits
    return Math.max(1, 1.15 / Math.max(0.5, camera.aspect));
  }
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    if (bloom) bloom.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const next = 1.12 * fitFactor();
    if (current < 0 && Math.abs(next - homeDist) > 1e-3) {
      const d = camera.position.clone().sub(controls.target);
      camera.position.copy(controls.target).addScaledVector(d.normalize(), next);
    }
    homeDist = next;
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- Render loop (only while the section is on screen) ----------
  let lastTime = 0;
  let running = false;
  let frameNo = 0;
  const { width: w0 } = stage.getBoundingClientRect();
  let stageW = w0;
  let stageH = 1;
  new ResizeObserver(([e]) => {
    stageW = e.contentRect.width;
    stageH = e.contentRect.height;
  }).observe(stage);

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

      // power eases fans up/down like real hardware
      const targetPower = powered ? 1 : 0;
      power += (targetPower - power) * Math.min(1, dt * (powered ? 1.6 : 1.1));
      if (!reduceMotion)
        for (const f of pc.fans) f.rotor.rotation.z += f.speed * power * dt;
      pulse *= Math.exp(-dt * 3.2);
      const lit = powered ? 1 : 0;
      for (const m of pc.rgbMats) {
        const hue = reduceMotion ? 0.58 : (t * 0.05 + m.userData.offset + hueKick) % 1;
        m.emissive.setHSL(hue, 0.9, 0.55);
        m.emissiveIntensity = m.userData.intensity * lit * power * (1 + pulse * 1.4);
      }

      if (shadowFrames > 0) {
        renderer.shadowMap.needsUpdate = true;
        shadowFrames--;
      }
      if (bloom) bloom.render(scene, camera, power * (1 + pulse * 0.6));
      else renderer.render(scene, camera);

      // position the HTML hotspots over their 3D anchors; every few frames, dim the
      // ones whose part is hidden behind another part
      frameNo++;
      const checkOcclusion = frameNo % 8 === 0;
      PARTS.forEach((p, i) => {
        anchorWorld(p.id, tmp);
        if (checkOcclusion) hotspots[i].classList.toggle("is-occluded", occluded(p.id, tmp));
        tmp.project(camera);
        const h = hotspots[i];
        h.style.transform = `translate(${((tmp.x + 1) / 2) * stageW}px, ${((1 - tmp.y) / 2) * stageH}px)`;
        h.classList.toggle("is-hidden", tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05);
      });

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && visible) loop();
  });

  await envReady;
  shadowFrames = 2;
  stage.classList.add("is-ready");
  if (visible) loop();
}
