// Career network map: hover, focus or tap a node to trace its connections
(() => {
  const root = document.querySelector("#network");
  if (!root) return;
  const svg = root.querySelector(".netmap-svg");
  const info = root.querySelector(".netmap-info");
  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nodes = [
    { id: "school", x: 120, y: 95, label: "W. Churchill School", type: "edu", title: "Winston Churchill School", meta: "GCSEs · 2018 – 2023",
      text: "Ten GCSEs including Computer Science, Maths and Combined Higher Science." },
    { id: "prefect", x: 120, y: 245, label: "CS Prefect", type: "extra", title: "Computer Science Prefect", meta: "2022 – 2023",
      text: "Ran welcome events to showcase Computer Science and supervised an after-school coding club for younger students." },
    { id: "pc", x: 120, y: 395, type: "extra", title: "PC Building", meta: "2020 – present",
      text: "Started with charity-shop spare parts, now builds PCs for friends and family. Explore it in 3D further down." },
    { id: "invotra", x: 385, y: 95, type: "work", title: "Invotra", meta: "IT work experience · 2022",
      text: "Code testing, daily company-wide briefings and time in every department." },
    { id: "college", x: 385, y: 245, type: "edu", title: "Farnborough College", meta: "T Level · 2024 – 2026",
      text: "Digital Production, Design & Development (Computer Software Engineering)." },
    { id: "waitrose", x: 385, y: 395, type: "work", title: "Waitrose", meta: "Supermarket Assistant · 2024 – 2026",
      text: "Customer service, teamwork and organisation on a busy shop floor in Frimley." },
    { id: "cisco", x: 655, y: 95, type: "cert", title: "Cisco Certifications", meta: "Mar 2025",
      text: "Ethical Hacker and IT Essentials, verified on Credly." },
    { id: "placement", x: 655, y: 245, type: "work", title: "Datum Placement", meta: "Junior Data Centre Tech · T Level",
      text: "Three-month industry placement inside a working data centre." },
    { id: "datum", x: 965, y: 170, type: "now", title: "Datum", meta: "Apprentice Infrastructure Engineer · 2026 – 2029",
      text: "Where the network leads: an infrastructure engineering apprenticeship at the data centre company where I did my placement.", core: true },
    { id: "bsc", x: 965, y: 355, type: "edu", title: "BSc (Hons) DTS", meta: "Network Engineer · 2026 – 2029",
      text: "Digital & Technology Solutions degree apprenticeship, studied alongside my role at Datum." },
  ];

  const links = [
    ["school", "invotra"],
    ["school", "prefect"],
    ["school", "college"],
    ["prefect", "college"],
    ["pc", "college"],
    ["pc", "placement"],
    ["college", "cisco"],
    ["college", "placement"],
    ["waitrose", "datum"],
    ["cisco", "datum"],
    ["placement", "datum"],
    ["datum", "bsc"],
  ];

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const W = 222;
  const H = 72;
  const size = (n) => (n.core ? { w: 250, h: 96 } : { w: W, h: H });

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };

  // Links (drawn first so nodes sit on top)
  const linkLayer = el("g", { class: "net-links" }, svg);
  const packetLayer = el("g", { class: "net-packets" }, svg);
  const nodeLayer = el("g", { class: "net-nodes" }, svg);

  const linkEls = links.map(([a, b]) => {
    const A = byId[a];
    const B = byId[b];
    const sa = size(A);
    const sb = size(B);
    let d;
    if (Math.abs(A.x - B.x) < 40) {
      // vertical link
      const dir = B.y > A.y ? 1 : -1;
      const y1 = A.y + (dir * sa.h) / 2;
      const y2 = B.y - (dir * sb.h) / 2;
      d = `M ${A.x} ${y1} L ${B.x} ${y2}`;
    } else {
      const x1 = A.x + sa.w / 2;
      const x2 = B.x - sb.w / 2;
      const mx = (x1 + x2) / 2;
      d = `M ${x1} ${A.y} C ${mx} ${A.y}, ${mx} ${B.y}, ${x2} ${B.y}`;
    }
    const path = el("path", { d, class: "net-link" }, linkLayer);
    const len = path.getTotalLength();
    // sample the curve once so packets don't query SVG geometry every frame
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const pt = path.getPointAtLength((i / 64) * len);
      pts.push(pt.x, pt.y);
    }
    return { a, b, path, len, pts };
  });

  // Nodes
  const nodeEls = {};
  nodes.forEach((n) => {
    const { w, h } = size(n);
    const g = el(
      "g",
      {
        class: `net-node net-${n.type}${n.core ? " net-core" : ""}`,
        transform: `translate(${n.x - w / 2} ${n.y - h / 2})`,
        tabindex: "0",
        role: "button",
        "aria-label": `${n.title}, ${n.meta}`,
      },
      nodeLayer
    );
    if (n.core) {
      el("rect", { class: "net-pulse", x: -6, y: -6, width: w + 12, height: h + 12, rx: 18 }, g);
    }
    el("rect", { class: "net-box", width: w, height: h, rx: 12 }, g);
    el("rect", { class: "net-stripe", x: 0, y: 12, width: 4, height: h - 24, rx: 2 }, g);
    // Port lights, like a switch
    for (let i = 0; i < 3; i++) el("circle", { class: "net-led", cx: w - 14 - i * 9, cy: h - 13, r: 2.6, style: `--i:${i}` }, g);
    const t = el("text", { x: 18, y: n.core ? 42 : 31, class: "net-title" }, g);
    t.textContent = n.label || n.title;
    const m = el("text", { x: 18, y: n.core ? 70 : 54, class: "net-meta" }, g);
    m.textContent = n.core ? "Apprentice Infra Engineer" : n.meta.split(" · ").pop();
    nodeEls[n.id] = g;
  });

  // Info panel
  function show(id) {
    const n = byId[id];
    const label = { edu: "Education", work: "Work", cert: "Certification", extra: "Personal", now: "Now" }[n.type];
    info.innerHTML =
      `<p class="netmap-info-type mono net-${n.type}"><span></span>${label}</p>` +
      `<h4>${n.title}</h4><p class="netmap-info-meta mono">${n.meta}</p><p>${n.text}</p>`;
  }

  function focus(id) {
    svg.classList.add("has-focus");
    const connected = new Set([id]);
    linkEls.forEach((l) => {
      const on = l.a === id || l.b === id;
      l.path.classList.toggle("is-lit", on);
      if (on) connected.add(l.a).add(l.b);
    });
    Object.entries(nodeEls).forEach(([nid, g]) => {
      g.classList.toggle("is-lit", connected.has(nid));
      g.classList.toggle("is-active", nid === id);
    });
    show(id);
  }

  function blur() {
    svg.classList.remove("has-focus");
    linkEls.forEach((l) => l.path.classList.remove("is-lit"));
    Object.values(nodeEls).forEach((g) => g.classList.remove("is-lit", "is-active"));
  }

  Object.entries(nodeEls).forEach(([id, g]) => {
    g.addEventListener("mouseenter", () => focus(id));
    g.addEventListener("focus", () => focus(id));
    g.addEventListener("click", () => focus(id));
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        focus(id);
      }
    });
  });
  svg.addEventListener("mouseleave", blur);
  svg.addEventListener("focusout", (e) => {
    if (!svg.contains(e.relatedTarget)) blur();
  });
  show("datum");

  if (reduceMotion) return;

  // Packets flow along every link towards Datum
  const packets = [];
  linkEls.forEach((l, i) => {
    const lite = window.perf && window.perf.tier === "low";
    const count = l.b === "datum" && !lite ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const c = el("circle", { r: 3.2, class: "net-packet" }, packetLayer);
      packets.push({ link: l, c, t: (i * 0.37 + k * 0.5) % 1, speed: 0.12 + ((i * 7) % 5) * 0.02 });
    }
  });

  let visible = false;
  let last = 0;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }).observe(svg);

  function tick(now) {
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    packets.forEach((p) => {
      p.t = (p.t + dt * p.speed * (220 / Math.max(120, p.link.len)) * 2.2) % 1;
      const f = p.t * 64;
      const k = Math.min(63, Math.floor(f));
      const u = f - k;
      const q = p.link.pts;
      p.c.setAttribute("cx", q[2 * k] + (q[2 * k + 2] - q[2 * k]) * u);
      p.c.setAttribute("cy", q[2 * k + 1] + (q[2 * k + 3] - q[2 * k + 1]) * u);
      // fade in and out at the ends of each link
      p.c.style.opacity = Math.min(1, Math.min(p.t, 1 - p.t) * 8);
      p.c.classList.toggle("is-lit", p.link.path.classList.contains("is-lit"));
    });
    requestAnimationFrame(tick);
  }
})();
