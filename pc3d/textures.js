// Canvas-drawn textures: PCB with traces/silkscreen, brushed metal, cable sleeving,
// perforated steel, radiator fins and product labels.

import { pause } from "./sched.js";

// Drawn one at a time with a pause between each, so no single step takes long
export async function createTextures(THREE, { hi }) {
  const make = (w, h, draw, { srgb = true, repeat } = {}) => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const c = cv.getContext("2d");
    draw(c, w, h);
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = hi ? 8 : 4;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    return t;
  };
  // deterministic noise so the board looks the same on every visit
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // ---------- Motherboard PCB (drawn in board millimetres: u = from rear edge, v = from top edge) ----------
  function pcb(layout) {
    const S = hi ? 6 : 3.5; // pixels per mm
    return make(Math.round(244 * S), Math.round(305 * S), (c, W, H) => {
      c.scale(S, S);
      c.fillStyle = "#e9ebee";
      c.fillRect(0, 0, 244, 305);
      // subtle solder-mask mottling
      for (let i = 0; i < 1400; i++) {
        c.fillStyle = `rgba(160,170,180,${rnd() * 0.05})`;
        c.fillRect(rnd() * 244, rnd() * 305, 2 + rnd() * 6, 2 + rnd() * 6);
      }
      // copper traces under the mask
      c.lineCap = "round";
      c.lineJoin = "round";
      const bus = (x0, y0, x1, y1, n, gap, color = "#d4d8dd", w = 0.28) => {
        c.strokeStyle = color;
        c.lineWidth = w;
        for (let k = 0; k < n; k++) {
          const o = k * gap;
          c.beginPath();
          c.moveTo(x0, y0 + o);
          const mx = x0 + (x1 - x0) * 0.5;
          c.lineTo(mx - o * 0.5, y0 + o);
          c.lineTo(mx + Math.abs(y1 - y0) * 0.3 - o * 0.5, y1 + o);
          c.lineTo(x1, y1 + o);
          c.stroke();
        }
      };
      // CPU -> DIMM fly-by traces
      bus(140, 48, 158, 40, 26, 1.1);
      bus(140, 82, 158, 96, 22, 1.1);
      // CPU -> PCIe x16 and M.2
      for (let k = 0; k < 18; k++) {
        c.strokeStyle = "#d4d8dd";
        c.lineWidth = 0.3;
        c.beginPath();
        c.moveTo(80 + k * 1.6, 120);
        c.lineTo(80 + k * 1.6, 136 - k * 0.4);
        c.lineTo(66 + k * 1.6, 150);
        c.lineTo(66 + k * 1.6, 172);
        c.stroke();
      }
      // chipset fan-out
      for (let k = 0; k < 40; k++) {
        const a = rnd() * Math.PI * 2;
        const x = 196 + Math.cos(a) * 20;
        const y = 238 + Math.sin(a) * 26;
        c.beginPath();
        c.moveTo(196, 238);
        c.lineTo(x, y);
        c.lineTo(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 12);
        c.stroke();
      }
      // random short traces and vias
      for (let i = 0; i < 520; i++) {
        let x = rnd() * 244;
        let y = rnd() * 305;
        c.strokeStyle = rnd() < 0.5 ? "#d6dade" : "#dcdfe3";
        c.lineWidth = 0.22 + rnd() * 0.3;
        c.beginPath();
        c.moveTo(x, y);
        for (let s = 0; s < 3; s++) {
          if (rnd() < 0.5) x += (rnd() - 0.5) * 30;
          else y += (rnd() - 0.5) * 30;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      for (let i = 0; i < 900; i++) {
        const x = rnd() * 244;
        const y = rnd() * 305;
        c.fillStyle = "#c8ccd1";
        c.beginPath();
        c.arc(x, y, 0.45, 0, 7);
        c.fill();
        c.fillStyle = "#8a9097";
        c.beginPath();
        c.arc(x, y, 0.18, 0, 7);
        c.fill();
      }
      // SMD passives (tiny dark rectangles with metal ends)
      const smd = (x, y, rot) => {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.fillStyle = "#b8bcc2";
        c.fillRect(-0.8, -0.4, 1.6, 0.8);
        c.fillStyle = rnd() < 0.6 ? "#3a3530" : "#6b6255";
        c.fillRect(-0.45, -0.4, 0.9, 0.8);
        c.restore();
      };
      const cluster = (x, y, w, h, n) => {
        for (let i = 0; i < n; i++) smd(x + rnd() * w, y + rnd() * h, rnd() < 0.5 ? 0 : Math.PI / 2);
      };
      cluster(62, 40, 14, 80, 90); // around the socket
      cluster(140, 40, 12, 90, 60);
      cluster(150, 180, 30, 20, 40);
      cluster(20, 160, 30, 60, 60); // audio area
      cluster(200, 150, 30, 30, 40);
      cluster(100, 260, 60, 30, 50);
      // silkscreen
      c.fillStyle = "#70767e";
      c.strokeStyle = "#8a9098";
      c.lineWidth = 0.35;
      const txt = (t, x, y, size = 2.4, rot = 0, align = "left") => {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.font = `600 ${size}px "JetBrains Mono", ui-monospace, monospace`;
        c.textAlign = align;
        c.fillText(t, 0, 0);
        c.restore();
      };
      layout.dimms.forEach((u, i) => txt(["DDR5_A1", "DDR5_A2", "DDR5_B1", "DDR5_B2"][i], u + 1, 158, 2.2, -Math.PI / 2));
      txt("PCIEX16", 140, layout.slotV[1] - 5, 2.4);
      txt("PCIEX1_1", 140, layout.slotV[3] - 5, 2.2);
      txt("PCIEX1_2", 140, layout.slotV[6] - 5, 2.2);
      txt("M2A_CPU", 62, 140, 2.2);
      txt("ATX", 226, 96, 2.6);
      txt("ATX_12V_2X4", 30, 22, 2, 0);
      txt("CPU_FAN", 150, 14, 2);
      txt("SYS_FAN1", 205, 14, 2);
      txt("SATA3", 222, 247, 2.2);
      txt("F_PANEL", 196, 297, 2);
      txt("F_AUDIO", 8, 297, 2);
      txt("BAT", 186, 162, 2);
      txt("B850 AORUS ELITE WIFI7 ICE", 64, 290, 3.2);
      txt("AM5", 70, 36, 2.2);
      // outlines around slots and headers
      c.strokeRect(layout.socket[0] - 38, layout.socket[1] - 42, 76, 84);
      layout.dimms.forEach((u) => c.strokeRect(u - 3.4, 18, 6.8, 137));
      // mounting holes (plated rings)
      layout.holes.forEach(([u, v]) => {
        c.fillStyle = "#c2c6cb";
        c.beginPath();
        c.arc(u, v, 4.2, 0, 7);
        c.fill();
        c.fillStyle = "#9aa1a8";
        c.beginPath();
        c.arc(u, v, 1.7, 0, 7);
        c.fill();
      });
      // board edge darkening
      const g = c.createLinearGradient(0, 0, 4, 0);
      g.addColorStop(0, "rgba(0,0,0,0.12)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 4, 305);
    });
  }

  // brushed-metal roughness (grey levels) — used as roughnessMap
  await pause();
  const brushed = make(
    512,
    512,
    (c, W, H) => {
      c.fillStyle = "#7a7a7a";
      c.fillRect(0, 0, W, H);
      for (let i = 0; i < 2600; i++) {
        const y = rnd() * H;
        const v = 100 + Math.floor(rnd() * 70);
        c.strokeStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.35})`;
        c.lineWidth = 0.5 + rnd() * 1.2;
        c.beginPath();
        const x = rnd() * W;
        c.moveTo(x - 200, y);
        c.lineTo(x + 200 + rnd() * 200, y + (rnd() - 0.5) * 1.5);
        c.stroke();
      }
    },
    { srgb: false, repeat: [1, 1] }
  );

  // braided sleeving (bump + colour), repeats along the cable
  await pause();
  const sleeve = make(
    64,
    64,
    (c, W, H) => {
      c.fillStyle = "#101010";
      c.fillRect(0, 0, W, H);
      for (let y = -64; y < 128; y += 8)
        for (let x = 0; x < 64; x += 8) {
          const up = ((x + y) / 8) % 2 === 0;
          const g = c.createLinearGradient(x, y, x + 8, y + 8);
          g.addColorStop(0, "#1c1c1c");
          g.addColorStop(0.5, up ? "#6a6a6a" : "#4a4a4a");
          g.addColorStop(1, "#1c1c1c");
          c.fillStyle = g;
          c.beginPath();
          if (up) {
            c.moveTo(x, y + 8);
            c.lineTo(x + 8, y);
            c.lineTo(x + 11, y + 3);
            c.lineTo(x + 3, y + 11);
          } else {
            c.moveTo(x, y);
            c.lineTo(x + 3, y - 3);
            c.lineTo(x + 11, y + 5);
            c.lineTo(x + 8, y + 8);
          }
          c.fill();
        }
    },
    { srgb: false, repeat: [1, 3] }
  );

  // perforated steel: small round holes on a hex grid
  function perforated(color, hole = "#050506", repeat = [6, 6]) {
    return make(
      64,
      64,
      (c, W, H) => {
        c.fillStyle = color;
        c.fillRect(0, 0, W, H);
        c.fillStyle = hole;
        for (const [x, y] of [[16, 16], [48, 16], [0, 48], [32, 48], [64, 48]]) {
          c.beginPath();
          c.arc(x, y, 9, 0, 7);
          c.fill();
        }
        c.beginPath();
        c.arc(16, -16, 9, 0, 7);
        c.arc(48, 80, 9, 0, 7);
        c.fill();
      },
      { repeat }
    );
  }

  // radiator core seen from the fan side: flat tubes with folded fins between them
  await pause();
  const radCore = make(
    256,
    64,
    (c, W, H) => {
      c.fillStyle = "#15161a";
      c.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 16) {
        c.fillStyle = "#2c2f35";
        c.fillRect(0, y, W, 3);
        for (let x = 0; x < W; x += 3) {
          c.strokeStyle = x % 6 ? "#3a3d44" : "#23262b";
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(x, y + 3);
          c.lineTo(x + 1.5, y + 16);
          c.stroke();
        }
      }
    },
    { repeat: [6, 7.5] }
  );

  function label(w, h, draw) {
    return make(w, h, draw);
  }

  await pause();
  const hddLabel = label(512, 360, (c, W, H) => {
    c.fillStyle = "#d9dde1";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#1b1d20";
    c.fillRect(0, 0, W, 86);
    c.fillStyle = "#34c6b5";
    c.fillRect(0, 86, W, 6);
    c.fillStyle = "#fff";
    c.font = "700 44px Inter, Arial, sans-serif";
    c.fillText("SEAGATE", 28, 58);
    c.fillStyle = "#1b1d20";
    c.font = "700 52px Inter, Arial, sans-serif";
    c.fillText("BarraCuda", 28, 160);
    c.font = "600 30px Inter, Arial, sans-serif";
    c.fillText("4TB  ·  5400 RPM  ·  SATA 6Gb/s", 28, 210);
    c.fillStyle = "#6c737b";
    c.font = "22px 'JetBrains Mono', monospace";
    for (let i = 0; i < 4; i++) c.fillRect(28, 250 + i * 22, 200 + ((i * 97) % 180), 8);
    for (let x = 300; x < 480; x += 5) c.fillRect(x, 250, (x * 7) % 3 + 1, 70);
  });

  await pause();
  const ssdLabel = label(512, 128, (c, W, H) => {
    c.fillStyle = "#111317";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#e9ecef";
    c.font = "700 40px Inter, Arial, sans-serif";
    c.fillText("Crucial", 24, 58);
    c.font = "600 30px Inter, Arial, sans-serif";
    c.fillText("P310  4TB", 24, 100);
    c.fillStyle = "#5bb7ff";
    c.fillRect(W - 120, 30, 96, 6);
    c.fillStyle = "#8a9199";
    c.font = "18px 'JetBrains Mono', monospace";
    c.fillText("PCIe Gen4 NVMe", W - 190, 100);
  });

  await pause();
  const cpuIHS = label(256, 256, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#d9dcdf");
    g.addColorStop(0.5, "#bfc3c7");
    g.addColorStop(1, "#d3d6d9");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(60,64,70,0.75)";
    c.font = "700 30px Inter, Arial, sans-serif";
    c.textAlign = "center";
    c.fillText("AMD", W / 2, 92);
    c.font = "600 26px Inter, Arial, sans-serif";
    c.fillText("RYZEN 9", W / 2, 136);
    c.font = "500 22px 'JetBrains Mono', monospace";
    c.fillText("9950X", W / 2, 172);
  });

  await pause();
  const psuLabel = label(512, 128, (c, W, H) => {
    c.fillStyle = "#16181b";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#e6e8ea";
    c.font = "800 54px Inter, Arial, sans-serif";
    c.fillText("EDGE", 28, 80);
    c.font = "600 26px Inter, Arial, sans-serif";
    c.fillStyle = "#c9a45c";
    c.fillText("1000W  GOLD", 200, 78);
  });

  await pause();
  const gpuLabel = label(512, 64, (c, W, H) => {
    c.fillStyle = "#0e0f11";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#cfd3d7";
    c.font = "700 30px Inter, Arial, sans-serif";
    c.textAlign = "center";
    c.fillText("RTX PRO 6000", W / 2, 43);
  });

  await pause();
  const ramLabel = label(512, 96, (c, W, H) => {
    c.fillStyle = "#111214";
    c.fillRect(0, 0, W, H);
    c.strokeStyle = "#1c1e21";
    c.lineWidth = 6;
    for (let x = -100; x < W; x += 70) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 40, H / 2);
      c.lineTo(x, H);
      c.stroke();
    }
    c.fillStyle = "#c7cbd0";
    c.font = "700 26px Inter, Arial, sans-serif";
    c.fillText("Crucial", 30, 58);
    c.font = "600 20px Inter, Arial, sans-serif";
    c.fillText("PRO", 128, 58);
  });

  // soft contact shadow under the case
  await pause();
  const contact = make(256, 256, (c, W, H) => {
    const g = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W / 2);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.55, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  });

  return { pcb, brushed, sleeve, perforated, radCore, hddLabel, ssdLabel, cpuIHS, psuLabel, gpuLabel, ramLabel, contact };
}
