// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile navigation toggle
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");

toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});

links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

// Only animate if the libraries loaded and the user hasn't asked for reduced motion
const root = document.documentElement;
if (!(window.gsap && window.ScrollTrigger && window.SplitText && window.Lenis)) {
  root.classList.remove("anim");
}
const animate = root.classList.contains("anim");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---------- Grid overlay (press G or use the nav button) ----------
const gridToggle = document.querySelector(".grid-toggle");
const gridCols = document.querySelectorAll(".grid-cols span");
let gridOn = false;

function setGrid(on) {
  gridOn = on;
  gridToggle.setAttribute("aria-pressed", String(on));
  gridToggle.querySelector(".grid-state").textContent = on ? "on" : "off";
  if (animate) {
    gsap.to(gridCols, {
      scaleY: on ? 1 : 0,
      transformOrigin: on ? "top" : "bottom",
      duration: 0.9,
      ease: "expo.inOut",
      stagger: 0.04,
      overwrite: true,
    });
  } else {
    gridCols.forEach((c) => (c.style.transform = on ? "scaleY(1)" : "scaleY(0)"));
  }
}

gridToggle.addEventListener("click", () => setGrid(!gridOn));
// Shared hooks used by the terminal and other interactive pieces
window.site = {
  setGrid,
  isGridOn: () => gridOn,
  scrollTo(target) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (window.site.lenis) window.site.lenis.scrollTo(el, { offset: -72, duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth" });
  },
};

// Ignore shortcut keys while the visitor is typing in a field
window.isTyping = (e) => e.target.closest && e.target.closest("input, textarea, [contenteditable]");

document.addEventListener("keydown", (e) => {
  if (window.isTyping(e)) return;
  if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) setGrid(!gridOn);
});

if (animate) {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // Wait for web fonts so text is split on its final line breaks
  const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);
  fontsReady.then(init);
}

function init() {
  // ---------- Smooth scrolling ----------
  const lenis = new Lenis({ lerp: 0.09 });
  window.site.lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: target.id === "top" ? 0 : -72, duration: 1.4 });
    })
  );

  // ---------- Nav links roll their text on hover ----------
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const text = a.textContent;
    a.innerHTML =
      `<span class="roll"><span class="roll-inner"><span>${text}</span>` +
      `<span aria-hidden="true">${text}</span></span></span>`;
  });

  // ---------- Preloader ----------
  const num = document.querySelector(".count-num");
  const counter = { v: 0 };

  const intro = gsap.timeline();
  intro
    .from(".preloader-line span", { yPercent: 110, duration: 0.8, stagger: 0.08, ease: "power3.out" })
    .from(".count-num", { yPercent: 110, duration: 0.8, ease: "power3.out" }, 0)
    .to(
      counter,
      {
        v: 100,
        duration: 1.8,
        ease: "power2.inOut",
        onUpdate: () => (num.textContent = String(Math.round(counter.v)).padStart(3, "0")),
      },
      0.2
    )
    .to(".preloader-bar", { scaleX: 1, duration: 1.8, ease: "power2.inOut" }, 0.2)
    .to([".preloader-line span", ".count-num"], {
      yPercent: -110,
      duration: 0.6,
      stagger: 0.04,
      ease: "power3.in",
    })
    .to(".preloader", { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, "-=0.15")
    .add(heroIn(), "-=0.6")
    .add(() => {
      document.querySelector(".preloader").remove();
      lenis.start();
      ScrollTrigger.refresh();
    });

  // ---------- Hero entrance ----------
  function heroIn() {
    const tl = gsap.timeline();
    const title = document.querySelector(".hero-title");
    const chars = SplitText.create(".hero-line", { type: "chars", mask: "chars" }).chars;
    const sub = SplitText.create(".hero-sub", { type: "lines", mask: "lines" }).lines;
    const rest = [".eyebrow", ".hero-meta", ".hero-actions", ".scroll-hint"];

    gsap.set([title, ".hero-sub", ...rest], { visibility: "visible" });
    tl.from(chars, { yPercent: 115, rotate: 8, duration: 1.2, stagger: 0.035, ease: "expo.out" })
      .from(sub, { yPercent: 105, duration: 1, stagger: 0.08, ease: "expo.out" }, 0.35)
      .from(rest, { y: 24, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out" }, 0.5);
    return tl;
  }

  // Hero drifts up and fades as you scroll past it
  gsap.to(".hero > :not(.scroll-hint)", {
    yPercent: -18,
    opacity: 0.15,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // ---------- Section titles: words rise + rule draws in ----------
  document.querySelectorAll(".section-title").forEach((title) => {
    const words = SplitText.create(title, { type: "words", mask: "words" }).words;
    gsap.set(title, { visibility: "visible", "--rule": 0 });
    gsap
      .timeline({ scrollTrigger: { trigger: title, start: "top 85%" } })
      .from(words, { yPercent: 110, duration: 1, stagger: 0.06, ease: "expo.out" })
      .to(title, { "--rule": 1, duration: 1.2, ease: "expo.inOut" }, 0.2);
  });

  // ---------- Paragraphs reveal line by line ----------
  document.querySelectorAll("[data-split]:not(.hero-sub)").forEach((el) => {
    const lines = SplitText.create(el, { type: "lines", mask: "lines" }).lines;
    gsap.set(el, { visibility: "visible" });
    gsap.from(lines, {
      yPercent: 105,
      duration: 1,
      stagger: 0.07,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // ---------- Cards, stats and chips stagger in ----------
  ScrollTrigger.batch(".section .card, .stat-list li, .chips li, .contact .btn, .contact-links li", {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.07, ease: "expo.out", overwrite: true }
      ),
  });
  gsap.set(".section .card, .stat-list li, .chips li, .contact .btn, .contact-links li", { opacity: 0 });

  // Stat numbers count up
  document.querySelectorAll(".stat-num").forEach((el) => {
    const end = parseInt(el.textContent, 10);
    const suffix = el.textContent.replace(/\d+/, "");
    const o = { v: 0 };
    gsap.to(o, {
      v: end,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => (el.textContent = Math.round(o.v) + suffix),
    });
  });

  // ---------- Timeline line draws as you scroll ----------
  gsap.fromTo(
    ".timeline",
    { "--progress": 0 },
    {
      "--progress": 1,
      ease: "none",
      scrollTrigger: { trigger: ".timeline", start: "top 75%", end: "bottom 60%", scrub: true },
    }
  );

  // ---------- Velocity-driven marquee ----------
  const track = document.querySelector(".marquee-track");
  track.innerHTML += track.innerHTML;
  let half = track.scrollWidth / 2;
  let x = 0;
  let dir = 1;
  window.addEventListener("resize", () => (half = track.scrollWidth / 2));
  gsap.ticker.add((time, dt) => {
    const v = lenis.velocity || 0;
    if (Math.abs(v) > 0.1) dir = Math.sign(v);
    const speed = 0.06 + Math.min(Math.abs(v) * 0.025, 1.2);
    x = gsap.utils.wrap(-half, 0, x - dir * speed * dt);
    gsap.set(track, { x });
  });

  // Marquee leans with scroll speed
  const skew = gsap.quickTo(track, "skewX", { duration: 0.4, ease: "power3" });
  lenis.on("scroll", ({ velocity }) => skew(gsap.utils.clamp(-8, 8, -velocity * 0.25)));

  if (!finePointer) return;

  // ---------- Custom cursor ----------
  const cursor = document.querySelector(".cursor");
  const label = cursor.querySelector(".cursor-label");
  const cx = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3" });
  const cy = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3" });
  window.addEventListener("mousemove", (e) => {
    cursor.classList.add("is-active");
    cx(e.clientX);
    cy(e.clientY);
  });

  document.querySelectorAll("a, button").forEach((el) => {
    const text = el.classList.contains("cert") ? "View" : "";
    el.addEventListener("mouseenter", () => {
      label.textContent = text;
      cursor.classList.add(text ? "is-label" : "is-hover");
    });
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover", "is-label"));
  });
  document.documentElement.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));

  // ---------- Magnetic buttons ----------
  document.querySelectorAll(".magnetic").forEach((btn) => {
    const mx = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3" });
    const my = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3" });
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.35);
      my((e.clientY - r.top - r.height / 2) * 0.35);
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)", overwrite: true });
    });
  });
}
