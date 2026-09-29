// Hotspot content: the real parts in the build and their published specs.
// `step` is the order they go in during a build (used by the exploded view).

export const PARTS = [
  {
    id: "case", step: 0, kind: "Case", name: "Lian Li O11 Dynamic Mini V2",
    specs: ["423.6 × 273.3 × 391.95 mm (D × W × H)", "Dual chamber, pillarless glass front and side", "ATX boards, 5 expansion slots", "360 mm radiator in the roof"],
    text: "A dual-chamber case. The motherboard, cooler and graphics card sit in the main chamber behind the glass; the power supply, hard drive and most of the cabling live in the back chamber behind the motherboard tray.",
    tip: "In a dual-chamber case, plan the cable runs through the tray grommets before the board goes in. It's much easier with nothing in the way.",
  },
  {
    id: "motherboard", step: 4, kind: "Motherboard", name: "Gigabyte B850 AORUS ELITE WIFI7 ICE",
    specs: ["ATX (305 × 244 mm), AMD B850, socket AM5", "4 × DDR5 DIMM slots, dual channel", "1 × PCIe 5.0 x16, 3 × M.2 (1 × Gen5, 2 × Gen4)", "Wi-Fi 7 and 2.5 GbE"],
    text: "The white ICE edition of the board everything plugs into. It sits on brass standoffs on the motherboard tray and carries power and data between every other part.",
    tip: "Check each standoff lines up with a hole in the board before you lower it in. A standoff in the wrong place can short the back of the board.",
  },
  {
    id: "cpu", step: 1, kind: "Processor", name: "AMD Ryzen 9 9950X",
    specs: ["16 cores / 32 threads, Zen 5", "4.3 GHz base, up to 5.7 GHz boost", "170 W TDP, socket AM5", "64 MB L3 cache"],
    text: "Sixteen Zen 5 cores doing the actual computing. It sits in the AM5 socket under the cooler's pump block; the exploded view lifts the cooler off so you can see it.",
    tip: "On AM5 the pins are in the socket, not on the CPU. Line up the triangle in the corner and lower the chip straight down without sliding it.",
  },
  {
    id: "cooler", step: 6, kind: "Liquid cooler", name: "ID-COOLING FX360 PRO",
    specs: ["360 mm radiator: 397 × 120 × 27 mm", "3 × 120 mm fans, 500–1800 RPM, 82.5 CFM", "2900 RPM pump, copper cold plate", "Rated for 350 W"],
    text: "An all-in-one liquid cooler. The pump moves coolant from the copper cold plate on the CPU up to the radiator in the roof, where three fans push the heat out of the top of the case.",
    tip: "Keep the pump below the top of the radiator so air collects in the radiator, not the pump. A roof-mounted radiator like this one does that for you.",
  },
  {
    id: "ram", step: 2, kind: "Memory", name: "Crucial Pro 64 GB (2 × 32 GB) DDR5-6000",
    specs: ["2 × 32 GB DDR5 DIMMs", "6000 MT/s, CL40", "AMD EXPO and Intel XMP 3.0 profiles", "Fitted in slots A2 and B2"],
    text: "64 GB of memory in two sticks, in slots A2 and B2 so they run in dual channel. The black aluminium heat spreaders have no RGB.",
    tip: "Turn on the EXPO profile in the BIOS, or DDR5 runs at a much slower default speed than the one on the box.",
  },
  {
    id: "ssd", step: 3, kind: "NVMe SSD", name: "Crucial P310 4 TB",
    specs: ["M.2 2280, PCIe 4.0 x4 NVMe", "4 TB", "Up to 7,100 MB/s sequential reads"],
    text: "The main drive: a 4 TB NVMe SSD that screws straight into an M.2 slot on the motherboard, under one of the board's heatsinks.",
    tip: "Peel the plastic film off the heatsink's thermal pad before you fit it back on. It's very easy to miss.",
  },
  {
    id: "gpu", step: 8, kind: "Graphics card", name: "NVIDIA RTX PRO 6000 Blackwell",
    specs: ["96 GB GDDR7 with ECC", "24,064 CUDA cores, 752 Tensor cores, 188 RT cores", "600 W through one 16-pin 12V-2x6 connector", "304 × 137 mm, dual slot, double flow-through"],
    text: "The Workstation Edition card, mounted vertically with its fans facing the glass. Both fans push air straight through the fin stacks and out the other side of the card.",
    tip: "Push a 16-pin 12V-2x6 plug in until it clicks and sits flush. A half-seated plug on a 600 W card is how connectors melt.",
  },
  {
    id: "riser", step: 7, kind: "Riser cable", name: "Lian Li PCIe 5.0 x16 riser",
    specs: ["PCIe 5.0 x16", "Top x16 slot to the vertical GPU bracket"],
    text: "The O11 Dynamic Mini V2 includes a vertical GPU bracket but no riser cable. This one carries the full PCIe 5.0 x16 link from the board's top slot to the card.",
    tip: "Use a riser rated for the same PCIe generation as your board and card. If a vertical GPU crashes, try forcing the slot to a lower generation in the BIOS.",
  },
  {
    id: "psu", step: 5, kind: "Power supply", name: "Lian Li EDGE GOLD 1000 W",
    specs: ["1000 W, 80 PLUS Gold, fully modular", "ATX 3.1 with a native 12V-2x6 cable", "L-shaped: 182 × 86 × 150 mm", "Detachable USB and PWM fan hub"],
    text: "An L-shaped PSU designed for dual-chamber cases like the O11. It stands in the back chamber with its connectors facing outwards, so cables are easy to plug in.",
    tip: "Only use the modular cables that came with your PSU. Pinouts differ between brands even when the plugs fit.",
  },
  {
    id: "hdd", step: 9, kind: "Hard drive", name: "Seagate BarraCuda 4 TB",
    specs: ["3.5\", 5400 RPM", "SATA 6 Gb/s", "256 MB cache"],
    text: "Bulk storage for files that don't need NVMe speed. It sits in the drive cage in the back chamber, with SATA data and power cables through the motherboard tray.",
    tip: "Keep the operating system, apps and games on the SSD and use the hard drive for bulk files and backups.",
  },
  {
    id: "cables", step: 10, kind: "Cabling", name: "Braided power cables",
    specs: ["24-pin ATX to the motherboard", "8-pin EPS to the CPU power header", "16-pin 12V-2x6 to the GPU", "SATA power and data to the hard drive"],
    text: "The EDGE GOLD's braided sleeved cables come up from the back chamber through the tray grommets, so only the last few centimetres show through the glass.",
    tip: "Plug in the EPS cable before the radiator goes in the roof. The header at the top of the board is hard to reach afterwards.",
  },
];
