// Hidden terminal: press ` (backtick) or click >_ in the nav
(() => {
  const term = document.querySelector(".term");
  const body = term.querySelector(".term-body");
  const out = term.querySelector(".term-output");
  const form = term.querySelector(".term-line");
  const input = term.querySelector("#term-input");
  const openBtn = document.querySelector(".term-toggle");
  const closeBtn = term.querySelector(".term-close");

  const history = [];
  let historyIdx = 0;
  let busy = false;
  let greeted = false;
  let lastFocus = null;

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function print(html = "", cls = "") {
    const row = document.createElement("div");
    row.className = "term-row " + cls;
    row.innerHTML = html;
    out.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  const sections = {
    top: "#top",
    about: "#about",
    experience: "#experience",
    network: "#network",
    education: "#education",
    skills: "#skills",
    setup: "#setup",
    beyond: "#projects",
    contact: "#contact",
  };

  const files = {
    "about.txt": () =>
      print(
        "Joseph Collyer — Apprentice Infrastructure Engineer at Datum.\n" +
          "Studying a BSc (Hons) in Digital &amp; Technology Solutions (Network Engineer).\n" +
          "T Level in Digital Production, Design &amp; Development, Farnborough College of Technology.\n" +
          "Based in Lightwater, UK. Has been building PCs since 2020."
      ),
    "skills.txt": () =>
      print(
        '<span class="t-accent">technical</span>  Python · JavaScript · HTML · CSS · PC building &amp; hardware · IT\n' +
          '<span class="t-accent">people</span>     communication · problem solving · time management · prioritisation · teamwork'
      ),
    "certs.txt": () =>
      print(
        '<span class="t-ok">✔</span> Cisco Ethical Hacker   (Mar 2025)\n' +
          '<span class="t-ok">✔</span> Cisco IT Essentials    (Mar 2025)\n' +
          'verify → <a href="https://www.credly.com/users/joe-collyer117c" target="_blank" rel="noopener">credly.com/users/joe-collyer117c</a>'
      ),
    "contact.txt": () =>
      print(
        'LinkedIn: <a href="https://www.linkedin.com/in/joseph-collyer-511746370" target="_blank" rel="noopener">linkedin.com/in/joseph-collyer-511746370</a>\n' +
          'Credly: <a href="https://www.credly.com/users/joe-collyer117c" target="_blank" rel="noopener">credly.com/users/joe-collyer117c</a>\n' +
          "References available on request."
      ),
  };

  const dirs = {
    experience: [
      "2026-29  apprentice-infrastructure-engineer  @datum",
      "t-level  junior-data-centre-tech             @datum",
      "2024-26  supermarket-assistant               @waitrose",
      "2022     it-work-experience                  @invotra",
    ],
    education: [
      "2026-29  bsc-hons-digital-tech-solutions  (network engineer)",
      "2024-26  t-level-digital-production       @farnborough-college",
      "2018-23  gcses                            @winston-churchill",
    ],
    setup: ["case  motherboard  cpu  cooler  ram  ssd  gpu  riser  psu  hdd  cables"],
  };

  const commands = {
    help: {
      desc: "show this list",
      run() {
        const rows = Object.entries(commands)
          .filter(([, c]) => !c.hidden)
          .map(([name, c]) => `  <span class="t-accent">${name.padEnd(12)}</span>${c.desc}`)
          .join("\n");
        print(rows + '\n\n<span class="t-dim">tip: ↑/↓ for history, tab to autocomplete, esc to close</span>');
      },
    },
    whoami: {
      desc: "who is this?",
      run: () => print("joseph — apprentice infrastructure engineer @ datum"),
    },
    ls: {
      desc: "list files (try: ls experience)",
      run(args) {
        const dir = (args[0] || "").replace(/\/$/, "");
        if (!dir) {
          return print(
            Object.keys(files).join("  ") +
              "  " +
              Object.keys(dirs)
                .map((d) => `<span class="t-accent">${d}/</span>`)
                .join("  ")
          );
        }
        if (dirs[dir]) return print(dirs[dir].join("\n"));
        print(`ls: cannot access '${esc(dir)}': No such file or directory`, "t-err");
      },
    },
    cat: {
      desc: "read a file (try: cat certs.txt)",
      run(args) {
        const f = args[0];
        if (!f) return print("usage: cat &lt;file&gt;", "t-err");
        const name = files[f] ? f : files[f + ".txt"] ? f + ".txt" : null;
        if (name) return files[name]();
        if (dirs[f.replace(/\/$/, "")]) return print(`cat: ${esc(f)}: Is a directory`, "t-err");
        print(`cat: ${esc(f)}: No such file or directory`, "t-err");
      },
    },
    cd: {
      desc: "jump to a section (try: cd setup)",
      run(args) {
        const key = (args[0] || "top").replace(/\/$/, "").replace(/^~$/, "top");
        if (!sections[key]) {
          return print(`cd: no such section: ${esc(key)}\nsections: ${Object.keys(sections).join(" ")}`, "t-err");
        }
        print(`→ ${key}`, "t-dim");
        setTimeout(() => {
          close();
          window.site && window.site.scrollTo(sections[key]);
        }, 250);
      },
    },
    ping: {
      desc: "ping a host (try: ping datum)",
      async run(args) {
        const host = args[0] || "datum";
        const local = /datum|joseph|localhost|127\.0\.0\.1/i.test(host);
        const ip = local ? "10.26.10.5" : `142.250.${(host.length * 7) % 255}.${(host.length * 13) % 255}`;
        print(`PING ${esc(host)} (${ip}): 56 data bytes`);
        const times = [];
        for (let i = 0; i < 4; i++) {
          await sleep(420);
          const ms = local ? 0.2 + Math.random() * 0.6 : 8 + Math.random() * 14;
          times.push(ms);
          print(`64 bytes from ${ip}: icmp_seq=${i} ttl=${local ? 64 : 117} time=${ms.toFixed(3)} ms`);
        }
        const avg = times.reduce((a, b) => a + b) / times.length;
        print(
          `--- ${esc(host)} ping statistics ---\n4 packets transmitted, 4 received, <span class="t-ok">0% packet loss</span>\n` +
            `round-trip min/avg/max = ${Math.min(...times).toFixed(3)}/${avg.toFixed(3)}/${Math.max(...times).toFixed(3)} ms`
        );
      },
    },
    traceroute: {
      desc: "trace my route (try: traceroute joseph)",
      async run() {
        const hops = [
          ["winston-churchill.school", "10.18.0.1", "GCSEs"],
          ["cs-prefect.club", "10.22.3.1", "teaching younger students to code"],
          ["invotra.woking", "10.22.6.1", "first IT work experience"],
          ["pc-builds.home", "192.168.0.1", "charity-shop parts → full builds"],
          ["waitrose.frimley", "10.24.7.1", "customer service &amp; teamwork"],
          ["farnborough.college", "10.24.9.1", "T Level + Cisco certs"],
          ["datum.dc", "10.26.10.5", "placement → apprenticeship"],
        ];
        print("traceroute to joseph (10.26.10.5), 30 hops max, 60 byte packets");
        for (let i = 0; i < hops.length; i++) {
          await sleep(380);
          const [name, ip, note] = hops[i];
          const ms = (i * 1.7 + 0.4 + Math.random()).toFixed(2);
          print(` ${String(i + 1).padStart(2)}  ${name.padEnd(26)} (${ip})  ${ms} ms  <span class="t-dim"># ${note}</span>`);
        }
        await sleep(300);
        print('<span class="t-ok">destination reached: Apprentice Infrastructure Engineer @ Datum</span>');
      },
    },
    quality: {
      desc: "this device's performance tier (try: quality low)",
      run(args) {
        const perf = window.perf;
        if (!perf) return print("quality: detection unavailable", "t-err");
        const want = (args[0] || "").toLowerCase();
        if (want) {
          if (!["low", "mid", "high", "auto"].includes(want)) return print("usage: quality [low|mid|high|auto]", "t-err");
          perf.setOverride(want === "auto" ? null : want);
          print(`quality set to <span class="t-accent">${want}</span>, reloading…`, "t-ok");
          return setTimeout(() => location.reload(), 700);
        }
        const gb = perf.memory ? `${perf.memory} GB+` : "not reported";
        print(
          [
            `<span class="t-accent">Tier</span>:      ${perf.tier}${perf.override ? " (set manually)" : ""}`,
            `<span class="t-accent">Detected</span>:  ${perf.detected}`,
            `<span class="t-accent">CPU</span>:       ${perf.cores || "?"} threads`,
            `<span class="t-accent">Memory</span>:    ${gb}`,
            `<span class="t-accent">Graphics</span>:  ${esc(perf.gpu.renderer)} (${perf.gpu.class})`,
            `<span class="t-accent">Why</span>:       ${perf.reasons.map(esc).join("; ")}`,
            "",
            '<span class="t-dim">high: everything on · mid: lighter 3D model · low: no smooth scroll,',
            "custom cursor, blur or bloom. Change with: quality low|mid|high|auto</span>",
          ].join("\n")
        );
      },
    },
    neofetch: {
      desc: "system info",
      run() {
        const art = [
          "     ██╗ ██████╗",
          "     ██║██╔════╝",
          "     ██║██║     ",
          "██   ██║██║     ",
          "╚█████╔╝╚██████╗",
          " ╚════╝  ╚═════╝",
          "                ",
          "                ",
        ];
        const info = [
          '<span class="t-accent">joseph</span>@<span class="t-accent">lightwater</span>',
          "-----------------",
          '<span class="t-accent">Role</span>: Apprentice Infrastructure Engineer',
          '<span class="t-accent">Employer</span>: Datum',
          '<span class="t-accent">Degree</span>: BSc (Hons) DTS — Network Engineer',
          '<span class="t-accent">Certs</span>: Cisco Ethical Hacker, IT Essentials',
          '<span class="t-accent">Languages</span>: Python, JavaScript, HTML, CSS',
          '<span class="t-accent">Hobby</span>: building PCs (since 2020)',
        ];
        const lines = art.map((a, i) => `<span class="t-art">${a}</span>   ${info[i] || ""}`);
        lines.push(
          "\n" +
            ["#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#4f9dff", "#a855f7", "#ec4899"]
              .map((c) => `<span style="color:${c}">███</span>`)
              .join("")
        );
        print(lines.join("\n"));
      },
    },
    grid: {
      desc: "toggle the layout grid",
      run(args) {
        if (!window.site) return;
        const want = args[0] === "on" ? true : args[0] === "off" ? false : !window.site.isGridOn();
        window.site.setGrid(want);
        print(`grid ${want ? "on" : "off"}`, "t-dim");
      },
    },
    sudo: {
      desc: "try it",
      run(args) {
        const cmd = args.join(" ");
        if (/^hire( joseph)?$/.test(cmd)) {
          print(
            "[sudo] password for recruiter: ********\n" +
              '<span class="t-ok">already done</span> — joseph is employed by Datum (2026–2029) ✔\n' +
              "you can still say hi: type linkedin"
          );
        } else if (!cmd) {
          print("usage: sudo &lt;command&gt;", "t-err");
        } else {
          print("recruiter is not in the sudoers file. This incident will be reported.", "t-err");
        }
      },
    },
    history: {
      desc: "command history",
      run: () => print(history.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join("\n") || "(empty)"),
    },
    linkedin: {
      desc: "open my LinkedIn profile",
      run() {
        print('opening <a href="https://www.linkedin.com/in/joseph-collyer-511746370" target="_blank" rel="noopener">linkedin.com/in/joseph-collyer-511746370</a> …');
        window.open("https://www.linkedin.com/in/joseph-collyer-511746370", "_blank", "noopener");
      },
    },
    date: { desc: "current date", run: () => print(new Date().toString()) },
    echo: { desc: "print text", run: (args) => print(esc(args.join(" "))) },
    clear: { desc: "clear the screen", run: () => (out.innerHTML = "") },
    exit: { desc: "close the terminal", run: () => close() },
    rm: {
      hidden: true,
      run: (args) =>
        print(args.join(" ").includes("-rf") ? "nice try 🙂" : "rm: permission denied", "t-err"),
    },
  };

  async function run(line) {
    const trimmed = line.trim();
    print(`<span class="t-prompt">joseph@portfolio:~$</span> ${esc(line)}`);
    if (!trimmed) return;
    history.push(trimmed);
    historyIdx = history.length;
    const [name, ...args] = trimmed.split(/\s+/);
    const cmd = commands[name.toLowerCase()];
    if (!cmd) {
      print(`command not found: ${esc(name)} — type <span class="t-accent">help</span>`, "t-err");
      return;
    }
    busy = true;
    form.classList.add("is-busy");
    try {
      await cmd.run(args);
    } finally {
      busy = false;
      form.classList.remove("is-busy");
      body.scrollTop = body.scrollHeight;
    }
  }

  async function greet() {
    greeted = true;
    const row = print("", "t-dim");
    const msg = "Welcome to joseph's terminal. Type 'help' to see what you can do.";
    for (let i = 1; i <= msg.length; i++) {
      row.textContent = msg.slice(0, i);
      await sleep(12);
    }
  }

  function open() {
    if (term.classList.contains("open")) return;
    lastFocus = document.activeElement;
    term.hidden = false;
    requestAnimationFrame(() => term.classList.add("open"));
    document.body.classList.add("term-open");
    window.site && window.site.lenis && window.site.lenis.stop();
    input.focus({ preventScroll: true });
    if (!greeted) greet();
  }

  function close() {
    if (!term.classList.contains("open")) return;
    term.classList.remove("open");
    document.body.classList.remove("term-open");
    window.site && window.site.lenis && window.site.lenis.start();
    setTimeout(() => (term.hidden = true), 250);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  window.site = Object.assign(window.site || {}, { openTerminal: open });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy) return;
    const line = input.value;
    input.value = "";
    run(line);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIdx > 0) input.value = history[--historyIdx];
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      historyIdx = Math.min(history.length, historyIdx + 1);
      input.value = history[historyIdx] || "";
    } else if (e.key === "Tab") {
      e.preventDefault();
      const [first, ...rest] = input.value.split(" ");
      if (rest.length === 0) {
        const matches = Object.keys(commands).filter((c) => !commands[c].hidden && c.startsWith(first));
        if (matches.length === 1) input.value = matches[0] + " ";
        else if (matches.length > 1) print(matches.join("  "), "t-dim");
      } else {
        const pool = first === "cd" ? Object.keys(sections) : [...Object.keys(files), ...Object.keys(dirs)];
        const part = rest[rest.length - 1];
        const matches = pool.filter((p) => p.startsWith(part));
        if (matches.length === 1) input.value = `${first} ${matches[0]}`;
        else if (matches.length > 1) print(matches.join("  "), "t-dim");
      }
    } else if (e.key === "Escape" || e.key === "`") {
      e.preventDefault();
      close();
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      out.innerHTML = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return close();
    if (e.key === "`" && !(window.isTyping && window.isTyping(e))) {
      e.preventDefault();
      term.classList.contains("open") ? close() : open();
    }
  });

  openBtn.addEventListener("click", open);
  document.querySelectorAll(".eyebrow-term").forEach((b) => b.addEventListener("click", open));
  closeBtn.addEventListener("click", close);
  term.addEventListener("mousedown", (e) => {
    if (e.target === term) close();
  });
  body.addEventListener("click", () => {
    if (!window.getSelection().toString()) input.focus({ preventScroll: true });
  });
})();
