// Picks a performance tier for this visitor's device ("high", "mid" or "low") and
// exposes it before anything else runs, so the page can scale its heavier effects.
//
//   high: everything on
//   mid:  lighter 3D model (lower resolution, lighter bloom and shadows)
//   low:  no smooth-scroll library, custom cursor or frosted-glass blur; 3D without bloom,
//         and on software-rendered graphics the 3D model only loads when asked for
//
// Signals: CPU threads, device memory, the graphics chip WebGL reports, Save-Data / slow
// connections, and a short frame-rate check after the intro animation. Override with
// ?quality=low|mid|high|auto in the URL (remembered), or `quality` in the site terminal.
(function () {
  const TIERS = ["low", "mid", "high"];
  const root = document.documentElement;
  const listeners = [];
  const reasons = [];

  // ---------- Graphics chip ----------
  const gpu = { renderer: "unknown", webgl2: false, software: false, class: "unknown" };
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl) {
      gpu.webgl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      gpu.renderer = String((info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || "unknown");
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    } else gpu.renderer = "none";
  } catch (e) {
    gpu.renderer = "none";
  }
  const r = gpu.renderer.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(r)) gpu.software = true;
  if (gpu.software || gpu.renderer === "none") gpu.class = "software";
  else if (/nvidia|geforce|quadro|rtx|radeon (rx|pro)|radeon\(tm\) (rx|pro)|apple (m\d|gpu)|arc\(tm\)|intel.*arc|iris.*xe|adreno.*(7\d\d|8\d\d)|mali-g(7\d|9\d|7\d\d)|immortalis/.test(r)) gpu.class = "strong";
  else if (/intel.*(hd|uhd)\b|intel.*(hd|uhd) graphics|mali-(4|t)|mali-g(3|5)\d\b|adreno.*[3-5]\d\d|powervr|videocore|vivante|radeon\(tm\) (r[2-7]|hd)|radeon (r[2-7]|hd)/.test(r)) gpu.class = "weak";

  // ---------- CPU, memory, network, screen ----------
  const cores = navigator.hardwareConcurrency || 0;
  const memory = navigator.deviceMemory || 0; // GB, Chromium only (capped at 8)
  const conn = navigator.connection || {};
  const saveData = !!conn.saveData;
  const slowNet = /(^|-)2g$/.test(conn.effectiveType || "");
  const touch = matchMedia("(pointer: coarse)").matches;

  let score = 0;
  if (cores >= 8) score += 2;
  else if (cores >= 4) score += 1;
  else if (cores && cores <= 2) score -= 2;
  if (memory) score += memory >= 8 ? 1 : memory <= 2 ? -2 : memory <= 4 ? -1 : 0;
  score += gpu.class === "strong" ? 2 : gpu.class === "weak" ? -2 : 0;
  if (touch && !/apple/.test(r)) score -= 1;

  let tier = score >= 2 ? "high" : score >= 0 ? "mid" : "low";
  reasons.push(`${cores || "?"} CPU threads, ${memory ? memory + " GB+" : "unknown"} memory, ${gpu.class} graphics`);
  if (gpu.software) {
    tier = "low";
    reasons.push("graphics are software-rendered");
  }
  if (saveData || slowNet) {
    tier = "low";
    reasons.push(saveData ? "Data Saver is on" : "slow connection");
  }

  // A frame-rate check earlier this visit can only lower the tier
  let probed = null;
  try {
    probed = sessionStorage.getItem("perf-probed");
  } catch (e) {}
  if (probed && TIERS.indexOf(probed) < TIERS.indexOf(tier)) {
    tier = probed;
    reasons.push("frame rate was low earlier this visit");
  }

  // ---------- Manual override ----------
  const store = {
    get() {
      try {
        return localStorage.getItem("quality");
      } catch (e) {
        return null;
      }
    },
    set(v) {
      try {
        if (v) localStorage.setItem("quality", v);
        else localStorage.removeItem("quality");
      } catch (e) {}
    },
  };
  const fromUrl = new URLSearchParams(location.search).get("quality");
  if (fromUrl === "auto") store.set(null);
  else if (TIERS.includes(fromUrl)) store.set(fromUrl);
  const override = TIERS.includes(store.get()) ? store.get() : null;
  const detected = tier;
  if (override) tier = override;

  root.dataset.perf = tier;

  const perf = {
    tier,
    detected,
    override,
    gpu,
    cores,
    memory,
    saveData,
    reasons,
    /** true for "mid" and "high" when level is "mid", etc. */
    atLeast: (level) => TIERS.indexOf(perf.tier) >= TIERS.indexOf(level),
    onChange: (fn) => listeners.push(fn),
    set(next, why) {
      if (!TIERS.includes(next) || next === perf.tier) return;
      perf.tier = next;
      root.dataset.perf = next;
      if (why) reasons.push(why);
      listeners.forEach((fn) => fn(next));
    },
    /** Save a manual choice ("low" | "mid" | "high", or null for automatic) */
    setOverride(v) {
      store.set(TIERS.includes(v) ? v : null);
    },
  };
  window.perf = perf;

  // ---------- Frame-rate check ----------
  // After the intro has played, watch ~2 s of frames. If the device clearly can't keep up,
  // drop one tier for the rest of the visit (never raise it automatically).
  // perf.settled resolves once the intro and this check are over (pc3d.js saves its
  // heaviest warm-up steps until then, so they neither stutter the intro nor skew the check)
  let settle;
  perf.settled = new Promise((r) => (settle = r));
  function probe() {
    if (override || perf.tier === "low" || document.hidden) return settle();
    const times = [];
    let last = performance.now();
    const step = (now) => {
      times.push(now - last);
      last = now;
      if (times.length < 120) return requestAnimationFrame(step);
      settle();
      if (document.hidden) return;
      times.sort((a, b) => a - b);
      const median = times[times.length >> 1];
      if (median > 26) {
        const lower = TIERS[TIERS.indexOf(perf.tier) - 1];
        try {
          sessionStorage.setItem("perf-probed", lower);
        } catch (e) {}
        perf.set(lower, `frame rate was low (~${Math.round(1000 / median)} fps)`);
      }
    };
    requestAnimationFrame(step);
  }
  addEventListener("load", () => setTimeout(probe, 5500), { once: true });
})();
