// Generates the three artboards for The Social House booking platform canvas.
// Values come from docs/design/DESIGN.md and app/globals.css (spacing unit 0.22rem = 3.52px).
import { writeFileSync } from "node:fs";

const T = {
  bg: "#ffffff",
  fg: "#262626",
  mutedFg: "#575757",
  card: "#ffffff",
  muted: "#faf8f2",
  secondary: "#d5d4ce",
  border: "#f4f1eb",
  primary: "#cf975a",
  primaryEdge: "#b57628",
  destructive: "#b60008",
  success: "#519160",
  warning: "#d3a813",
  info: "#517791",
  radius: "3.2px",
  radiusCard: "9.2px",
};
const s = (n) => `${(n * 3.52).toFixed(2)}px`;

// Lucide-style stroke icons on a 24 grid.
const icon = (paths, size = 20, color = "currentColor") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path><path d="M10 21v-6h4v6"></path>',
  bookings:
    '<rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M9 8h6"></path><path d="M9 12h6"></path><path d="M9 16h3"></path>',
  rooms: '<path d="M4 21V4a1 1 0 0 1 1-1h9v18"></path><path d="M14 3h5a1 1 0 0 1 1 1v17"></path><path d="M11 12h.01"></path><path d="M4 21h16"></path>',
  users: '<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0"></path><path d="M16 4.5a3.5 3.5 0 0 1 0 7"></path><path d="M17.5 14a6 6 0 0 1 4 5.5"></path>',
  cup: '<path d="M5 4h11v9a5.5 5.5 0 0 1-11 0z"></path><path d="M16 7h2a2.5 2.5 0 0 1 0 5h-2"></path><path d="M4 21h13"></path>',
  percent:
    '<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"></path><path d="m9 15 6-6"></path><path d="M9.5 9.5h.01"></path><path d="M14.5 14.5h.01"></path>',
  megaphone:
    '<path d="M3 11v2a1 1 0 0 0 1 1h2l6 4V6L6 10H4a1 1 0 0 0-1 1z"></path><path d="M16 9a3.5 3.5 0 0 1 0 6"></path><path d="M19 6.5a7 7 0 0 1 0 11"></path><path d="M7 14v5"></path>',
  chart: '<path d="M3 3v18h18"></path><path d="m7 15 4-5 4 3 5-7"></path>',
  user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
  logout: '<path d="M14 4h5v16h-5"></path><path d="M3 12h11"></path><path d="m10 8 4 4-4 4"></path>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M9 4v16"></path>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path><path d="M8 3v4"></path><path d="M16 3v4"></path>',
  chevL: '<path d="m15 6-6 6 6 6"></path>',
  chevR: '<path d="m9 6 6 6-6 6"></path>',
  chevD: '<path d="m6 9 6 6 6-6"></path>',
  arrowL: '<path d="M19 12H5"></path><path d="m11 6-6 6 6 6"></path>',
  arrowR: '<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>',
  people: '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0"></path><path d="M16 5a3 3 0 0 1 0 6"></path><path d="M17 14a5 5 0 0 1 4 6"></path>',
  ruler: '<path d="m3 17 14-14 4 4L7 21z"></path><path d="m8 8 2 2"></path><path d="m11 5 2 2"></path><path d="m5 11 2 2"></path>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="1.5"></circle><path d="m21 16-5-5-8 8"></path>',
  pencil: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"></path><path d="m13.5 7.5 3 3"></path>',
  check: '<path d="m5 12 5 5 9-10"></path>',
  minus: '<path d="M6 12h12"></path>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"></path><path d="M6 12.5a9 9 0 0 1 12 0"></path><path d="M9.5 16a4 4 0 0 1 5 0"></path><path d="M12 19.5h.01"></path>',
};

const head = (title) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <title>${title}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&amp;family=Geist+Mono:wght@400;500&amp;display=swap">
  <style>
    body { margin: 0; background: ${T.bg}; color: ${T.fg}; font-family: Poppins, "Helvetica Neue", Arial, sans-serif; letter-spacing: -0.025em; -webkit-font-smoothing: antialiased; }
    a { color: ${T.fg}; } a:hover { color: ${T.primaryEdge}; }
    .mono { font-family: "Geist Mono", "SF Mono", Menlo, monospace; letter-spacing: 0; }
    .num { font-variant-numeric: tabular-nums; }
  </style>
</helmet>`;
const foot = `</x-dc>
</body>
</html>`;

const navItem = (ic, label, active = false) =>
  `<div style="display: flex; align-items: center; gap: ${s(2)}; height: ${s(8)}; padding: 0 ${s(2)}; border-radius: ${T.radius}; background: ${active ? T.muted : "transparent"}; color: ${active ? T.fg : T.mutedFg}; font-size: 14px; font-weight: 400;">${icon(I[ic], 20)}<span>${label}</span></div>`;

const sidebar = (active) => `
<aside style="width: 256px; flex-shrink: 0; box-sizing: border-box; background: ${T.card}; display: flex; flex-direction: column; padding: ${s(4)}; gap: ${s(4)}; min-height: 100%;">
  <div style="display: flex; align-items: center; justify-content: space-between; height: ${s(9)};">
    <img src="logo.svg" alt="The Social House" width="130" height="30" style="display: block;">
    <span style="color: ${T.mutedFg}; display: inline-flex;">${icon(I.panel, 20)}</span>
  </div>
  <button style="height: ${s(9)}; width: 100%; border: 0; border-radius: ${T.radius}; background: ${T.primary}; color: ${T.fg}; font-family: inherit; font-size: 14px; font-weight: 500; letter-spacing: -0.025em; cursor: pointer;">Book lokale</button>
  <nav style="display: flex; flex-direction: column; gap: ${s(1)};">
    ${navItem("home", "Hjem", active === "hjem")}
    ${navItem("bookings", "Bookinger", active === "mine")}
    ${navItem("rooms", "Lokaler", active === "lokaler")}
  </nav>
  <div style="font-size: 11px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: ${T.mutedFg}; padding: ${s(3)} ${s(2)} 0;">Admin</div>
  <nav style="display: flex; flex-direction: column; gap: ${s(1)};">
    ${navItem("bookings", "Bookinger", active === "bookinger")}
    ${navItem("rooms", "Lokaler", active === "adminlokaler")}
    ${navItem("users", "Brugere")}
    ${navItem("cup", "Tilkøb")}
    ${navItem("percent", "Rabatter")}
    ${navItem("megaphone", "Opslag")}
    ${navItem("chart", "Statistik", active === "statistik")}
  </nav>
  <div style="flex-grow: 1;"></div>
  <nav style="display: flex; flex-direction: column; gap: ${s(1)};">
    ${navItem("user", "Profil")}
    ${navItem("logout", "Log ud")}
  </nav>
</aside>`;

const shell = (active, title, body, height, action = "") => `
<div style="width: 1440px; height: ${height}px; display: flex; background: ${T.bg}; box-sizing: border-box; overflow: hidden;">
  ${sidebar(active)}
  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: ${s(6)} ${s(8)}; display: flex; flex-direction: column; gap: ${s(6)};">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: ${s(4)};">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; line-height: 1.2;">${title}</h1>
      ${action}
    </div>
    <div style="flex-grow: 1; background: ${T.muted}; border-radius: 9.2px; padding: ${s(6)}; display: flex; flex-direction: column; gap: ${s(6)}; min-height: 0;">
    ${body}
    </div>
    <div style="display: flex; justify-content: flex-end; align-items: center; gap: ${s(2)}; font-size: 12px; color: ${T.mutedFg};"><span style="display: inline-flex;">${icon(I.wifi, 16)}</span><span>thesocialhouseguest</span><span style="width: 1px; height: 14px; background: ${T.border};"></span><span>adgangskode</span><span class="mono" style="background: ${T.muted}; border: 1px solid ${T.border}; border-radius: ${T.radius}; padding: 1px 6px; color: ${T.fg};">thesocialhouse</span></div>
  </main>
</div>`;

const btn = (label, kind = "secondary", extra = "") => {
  const base = `height: ${s(9)}; padding: 0 ${kind === "ghost" ? s(2) : s(4)}; border-radius: ${T.radius}; font-family: inherit; font-size: 14px; font-weight: 500; letter-spacing: -0.025em; display: inline-flex; align-items: center; gap: ${s(2)}; cursor: pointer; box-sizing: border-box;`;
  const kinds = {
    primary: `border: 0; background: ${T.primary}; color: ${T.fg};`,
    secondary: `border: 1px solid ${T.border}; background: ${T.card}; color: ${T.fg};`,
    ghost: `border: 0; background: transparent; color: ${T.mutedFg};`,
    disabled: `border: 0; background: ${T.primary}; color: ${T.fg}; opacity: 0.5; cursor: default;`,
  };
  return `<button style="${base} ${kinds[kind]} ${extra}">${label}</button>`;
};
const iconBtn = (ic) =>
  `<button style="width: ${s(9)}; height: ${s(9)}; border: 1px solid ${T.border}; border-radius: ${T.radius}; background: ${T.card}; color: ${T.mutedFg}; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">${icon(I[ic], 20)}</button>`;

const card = (inner, extra = "") =>
  `<div style="background: ${T.card}; border: 1px solid ${T.border}; border-radius: ${T.radiusCard}; ${extra}">${inner}</div>`;
const h2 = (text) => `<h2 style="margin: 0; font-size: 22px; font-weight: 500; line-height: 1.25;">${text}</h2>`;
const chip = (inner) =>
  `<span style="display: inline-flex; align-items: center; gap: ${s(1)}; height: 22px; padding: 0 ${s(2)}; border-radius: 999px; border: 1px solid ${T.border}; background: rgba(213, 212, 206, 0.4); font-size: 12px; color: ${T.fg};">${inner}</span>`;
const badge = (text, tone) => {
  const map = {
    warning: `background: rgba(211, 168, 19, 0.2); color: ${T.fg};`,
    success: `background: rgba(81, 145, 96, 0.12); color: ${T.success};`,
    info: `background: rgba(81, 119, 145, 0.12); color: ${T.info};`,
    destructive: `background: rgba(182, 0, 8, 0.1); color: ${T.destructive};`,
    muted: `background: ${T.muted}; color: ${T.mutedFg};`,
  };
  return `<span style="display: inline-flex; align-items: center; height: 22px; padding: 0 ${s(2)}; border-radius: ${T.radius}; font-size: 12px; font-weight: 500; white-space: nowrap; ${map[tone]}">${text}</span>`;
};
const select = (label, width = 180) =>
  `<div style="height: ${s(9)}; width: ${width}px; box-sizing: border-box; padding: 0 ${s(3)}; border: 1px solid ${T.border}; border-radius: ${T.radius}; background: ${T.card}; display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: ${T.fg};"><span>${label}</span><span style="color: ${T.mutedFg}; display: inline-flex;">${icon(I.chevD, 16)}</span></div>`;

// ---------------------------------------------------------------- Hjem
const rooms = ["Room of Conversation", "Room of Exploration", "Room of Power", "Room of Relations", "Room of Serenity", "The Loft"];
const slots = [];
for (let m = 9 * 60; m <= 22 * 60; m += 30) slots.push(m);
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const rowH = 31.68;
const timeCol = 72;
const headH = 49.28;
const gridInnerW = 1440 - 256 - 2 * 28.16 - 2 * 21.12 - 2 - 2 * 7.04; // main padding, panel padding, card border, card padding
const colW = (gridInnerW - timeCol) / rooms.length;

const block = (col, from, to, tone, title, sub) => {
  const top = headH + ((from - 9 * 60) / 30) * rowH;
  const h = ((to - from) / 30) * rowH;
  const left = timeCol + col * colW;
  const styles = {
    primary: `background: ${T.primary}; border: 1px solid ${T.primaryEdge}; color: ${T.fg};`,
    info: `background: ${T.info}; border: 1px solid ${T.info}; color: #ffffff;`,
    buffer: `background: ${T.muted}; border: 1px solid ${T.border};`,
  };
  const text =
    tone === "buffer"
      ? ""
      : `<div style="font-size: 14px; font-weight: 500; line-height: 1.2;">${title}</div><div class="num" style="font-size: 12px; line-height: 1.2; margin-top: auto;">${sub}</div>`;
  return `<div style="position: absolute; left: ${(left + 3).toFixed(2)}px; top: ${(top + 1).toFixed(2)}px; width: ${(colW - 6).toFixed(2)}px; height: ${(h - 2).toFixed(2)}px; box-sizing: border-box; border-radius: ${T.radius}; padding: ${s(2)}; display: flex; flex-direction: column; ${styles[tone]}">${text}</div>`;
};

const dayGrid = () => {
  const totalH = headH + slots.length * rowH;
  let out = `<div style="position: relative; height: ${totalH.toFixed(2)}px;">`;
  // column headers and dividers
  rooms.forEach((r, i) => {
    const left = timeCol + i * colW;
    out += `<div style="position: absolute; left: ${left.toFixed(2)}px; top: 0; width: ${colW.toFixed(2)}px; height: ${headH}px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: ${T.fg};">${r}</div>`;
    if (i > 0) out += `<div style="position: absolute; left: ${left.toFixed(2)}px; top: ${headH}px; bottom: 0; width: 1px; background: ${T.border};"></div>`;
  });
  slots.forEach((m, i) => {
    const y = headH + i * rowH;
    out += `<div style="position: absolute; left: ${timeCol}px; right: 0; top: ${y.toFixed(2)}px; height: 1px; background: ${T.border};"></div>`;
    out += `<div class="num" style="position: absolute; left: 0; width: ${timeCol - 12}px; top: ${(y - 8).toFixed(2)}px; text-align: right; font-size: 14px; color: ${T.mutedFg};">${hhmm(m)}</div>`;
  });
  out += block(1, 10 * 60, 12 * 60, "primary", "Rituals", "10:00 - 12:00");
  out += block(1, 12 * 60, 12 * 60 + 30, "buffer");
  out += block(2, 19 * 60, 21 * 60 + 30, "primary", "The Social House", "19:00 - 21:30");
  out += block(2, 21 * 60 + 30, 22 * 60, "buffer");
  out += block(5, 12 * 60, 14 * 60, "info", "3 Days of Design", "12:00 - 14:00");
  out += block(3, 14 * 60, 15 * 60, "primary", "Nordic Wool", "14:00 - 15:00");
  out += block(3, 15 * 60, 15 * 60 + 30, "buffer");
  out += "</div>";
  return card(out, `padding: 0 ${s(2)} ${s(2)}; overflow: hidden;`);
};

const noticeCard = (inner) =>
  card(`<div style="display: flex; flex-direction: column; gap: ${s(2)};">${inner}</div>`, `padding: ${s(4)}; flex: 1 1 0;`);
const opslag = `
<section style="display: flex; flex-direction: column; gap: ${s(3)};">
  <div style="display: flex; align-items: center; justify-content: space-between;">${h2("Opslag")}${btn(icon(I.pencil, 16) + "Rediger", "ghost")}</div>
  <div style="display: flex; gap: ${s(4)};">
    ${noticeCard(`<div style="font-size: 16px; font-weight: 500;">Hoveddøren låses kl. 18:00</div><div style="font-size: 14px; color: ${T.mutedFg}; text-wrap: pretty;">Brug jeres nøglebrik ved aftenbookinger. Receptionen er bemandet 08:00 - 18:00.</div>`)}
    ${noticeCard(`<div style="display: flex; align-items: center; gap: ${s(2)};"><span style="font-size: 16px; font-weight: 500;">3 Days of Design</span>${badge("House Event", "info")}</div><div style="font-size: 14px; color: ${T.mutedFg}; text-wrap: pretty;">The Loft bruges til 3 Days of Design kl. 12:00 - 14:00. De øvrige lokaler kan bookes som normalt.</div>`)}
  </div>
</section>`;

const dagens = `
<section style="display: flex; flex-direction: column; gap: ${s(3)};">
  <div style="display: flex; align-items: center; justify-content: space-between;">
    ${h2("Dagens overblik")}
    <div style="display: flex; align-items: center; gap: ${s(3)};">
      ${btn(icon(I.calendar, 20) + "Vælg dato", "secondary")}
      <div style="display: flex; align-items: center; border: 1px solid ${T.border}; border-radius: ${T.radius}; background: ${T.card}; height: ${s(9)}; box-sizing: border-box;">
        <span style="display: inline-flex; padding: 0 ${s(2)}; color: ${T.mutedFg};">${icon(I.chevL, 20)}</span>
        <span class="num" style="font-size: 14px; padding: 0 ${s(1)};">02/09/2026</span>
        <span style="display: inline-flex; padding: 0 ${s(2)}; color: ${T.mutedFg};">${icon(I.chevR, 20)}</span>
      </div>
    </div>
  </div>
  ${dayGrid()}
</section>`;

const roomCard = (name, cap, size, regular, yours) =>
  card(
    `<div style="height: 200px; background: ${T.muted}; border-bottom: 1px solid ${T.border}; border-radius: ${T.radiusCard} ${T.radiusCard} 0 0; position: relative; display: flex; align-items: center; justify-content: center; color: ${T.mutedFg};">${icon(I.image, 28)}
      <div style="position: absolute; right: ${s(3)}; bottom: ${s(3)}; display: flex; gap: ${s(2)};">
        <span style="width: 32px; height: 32px; border-radius: 999px; background: rgba(255,255,255,0.7); display: inline-flex; align-items: center; justify-content: center; color: ${T.mutedFg};">${icon(I.arrowL, 16)}</span>
        <span style="width: 32px; height: 32px; border-radius: 999px; background: #ffffff; display: inline-flex; align-items: center; justify-content: center; color: ${T.fg};">${icon(I.arrowR, 16)}</span>
      </div>
    </div>
    <div style="padding: ${s(4)}; display: flex; flex-direction: column; gap: ${s(3)};">
      <h3 style="margin: 0; font-size: 18px; font-weight: 500;">${name}</h3>
      <div style="display: flex; gap: ${s(2)};">${chip(icon(I.people, 16) + cap)}${chip(icon(I.ruler, 16) + size)}</div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div><div style="font-size: 12px; color: ${T.mutedFg};">Normalpris</div><div class="num" style="font-size: 14px; color: ${T.mutedFg}; text-decoration: line-through;">${regular}</div></div>
        <div style="text-align: right;"><div style="font-size: 12px; color: ${T.mutedFg};">Din pris</div><div class="num" style="font-size: 18px; font-weight: 500;">${yours}</div></div>
      </div>
    </div>`,
    `flex: 1 1 0; min-width: 0;`
  );

const lokaler = `
<section style="display: flex; flex-direction: column; gap: ${s(3)};">
  <div style="display: flex; align-items: center; justify-content: space-between;">
    ${h2("Lokaler")}
    <div style="display: flex; gap: ${s(2)};">${iconBtn("arrowL")}${iconBtn("arrowR")}</div>
  </div>
  <div style="display: flex; gap: ${s(5)};">
    ${roomCard("Room of Conversation", "1 - 3 personer", "10 m²", "500 kr/time", "250 kr/time")}
    ${roomCard("Room of Exploration", "1 - 12 personer", "25 m²", "1.600 kr/time", "800 kr/time")}
    ${roomCard("Room of Power", "1 - 10 personer", "20 m²", "800 kr/time", "400 kr/time")}
    ${roomCard("Room of Relations", "1 - 5 personer", "12 m²", "500 kr/time", "250 kr/time")}
  </div>
</section>`;

const hjem = head("Hjem") + shell("hjem", "Hjem", opslag + dagens + lokaler, 1760) + foot;

// ---------------------------------------------------------------- Bookinger (admin, invoicing)
const rowsData = [
  ["B-2609-014", "Rituals", "Room of Exploration", "02/09/2026", "10:00 - 12:00", "2,0", "3.200,00", "-1.600,00", "70,00", "0,00", "1.670,00", ["Ikke faktureret", "warning"], true],
  ["B-2609-015", "Nordic Wool", "Room of Power", "02/09/2026", "14:00 - 15:00", "1,0", "800,00", "0,00", "0,00", "0,00", "800,00", ["Ikke faktureret", "warning"], true],
  ["B-2609-011", "Rituals", "The Loft", "01/09/2026", "09:00 - 13:00", "4,0", "4.000,00", "-2.000,00", "1.200,00", "0,00", "3.200,00", ["Ikke faktureret", "warning"], false],
  ["B-2609-009", "Kontrapunkt", "Room of Relations", "01/09/2026", "13:00 - 15:00", "2,0", "1.000,00", "-250,00", "0,00", "0,00", "750,00", ["Faktureret", "success"], false],
  ["B-2608-097", "Bæredygtig Byg", "Room of Conversation", "31/08/2026", "10:00 - 11:00", "1,0", "500,00", "0,00", "0,00", "500,00", "500,00", ["Aflyst", "destructive"], false],
  ["HE-2609-002", "The Social House", "The Loft", "02/09/2026", "12:00 - 14:00", "2,0", "0,00", "0,00", "0,00", "0,00", "0,00", ["Ikke fakturerbar", "muted"], false],
  ["B-2608-091", "Nordic Wool", "Room of Serenity", "28/08/2026", "09:00 - 12:00", "3,0", "1.500,00", "-375,00", "105,00", "0,00", "1.230,00", ["Faktureret", "success"], false],
  ["B-2608-088", "Kontrapunkt", "Room of Exploration", "27/08/2026", "13:00 - 17:00", "4,0", "6.400,00", "-1.600,00", "400,00", "0,00", "5.200,00", ["Faktureret", "success"], false],
];
const checkbox = (on) =>
  `<span style="width: ${s(4)}; height: ${s(4)}; border-radius: 4px; border: 1px solid ${on ? T.primaryEdge : T.secondary}; background: ${on ? T.primary : T.card}; display: inline-flex; align-items: center; justify-content: center; color: ${T.fg};">${on ? icon(I.check, 12) : ""}</span>`;
const cols = [
  ["", "left"], ["Nr.", "left"], ["Virksomhed", "left"], ["Lokale", "left"], ["Dato og tid", "left"],
  ["Timer", "right"], ["Lokalepris", "right"], ["Rabat", "right"], ["Tilkøb", "right"], ["Gebyr", "right"], ["Total", "right"], ["Status", "left"],
];
const cellPad = `padding: 0 ${s(2)};`;
const th = cols
  .map(([l, a]) => `<th style="text-align: ${a}; ${cellPad} font-size: 12px; font-weight: 400; color: ${T.mutedFg}; height: ${s(10)}; border-bottom: 1px solid ${T.border}; white-space: nowrap;">${l}</th>`)
  .join("");
const td = (v, i, a) =>
  `<td class="${i === 1 ? "mono" : "num"}" style="text-align: ${a}; ${cellPad} font-size: 14px; height: ${s(12)}; border-bottom: 1px solid ${T.border}; white-space: nowrap; vertical-align: middle;">${v}</td>`;
const when = (date, time) => `<div style="line-height: 1.2;">${date}</div><div style="line-height: 1.2; font-size: 12px; color: ${T.mutedFg};">${time}</div>`;
const tr = (r) => {
  const cells = [
    checkbox(r[12]), r[0], r[1], r[2], when(r[3], r[4]), r[5], r[6], r[7], r[8], r[9], r[10], badge(r[11][0], r[11][1]),
  ];
  return `<tr style="background: ${r[12] ? T.muted : T.card};">${cells.map((c, i) => td(c, i, cols[i][1])).join("")}</tr>`;
};
const totals = `<tr style="background: ${T.muted};">${[
  "", "", `<span style="font-weight: 500;">I alt, 8 bookinger</span>`, "", "", "19,0", "17.400,00", "-5.825,00", "1.775,00", "500,00", `<span style="font-weight: 500;">13.350,00</span>`, `<span style="font-size: 12px; color: ${T.mutedFg};">ekskl. moms</span>`,
].map((c, i) => `<td class="num" style="text-align: ${cols[i][1]}; ${cellPad} font-size: 14px; height: ${s(12)}; white-space: nowrap;">${c}</td>`).join("")}</tr>`;

const filters = `
<div style="display: flex; gap: ${s(3)}; align-items: center; flex-wrap: wrap;">
  <div style="display: flex; align-items: center; border: 1px solid ${T.border}; border-radius: ${T.radius}; background: ${T.card}; height: ${s(9)}; box-sizing: border-box;">
    <span style="display: inline-flex; padding: 0 ${s(2)}; color: ${T.mutedFg};">${icon(I.chevL, 20)}</span>
    <span style="font-size: 14px; padding: 0 ${s(2)};">September 2026</span>
    <span style="display: inline-flex; padding: 0 ${s(2)}; color: ${T.mutedFg};">${icon(I.chevR, 20)}</span>
  </div>
  ${btn(icon(I.calendar, 20) + "Frit interval", "secondary")}
  ${select("Alle virksomheder", 190)}
  ${select("Alle lokaler", 160)}
  ${select("Alle statusser", 160)}
  ${select("Medlemmer og eksterne", 200)}
  <label style="display: flex; align-items: center; gap: ${s(2)}; font-size: 14px; color: ${T.fg};">${checkbox(false)}Skjul House Events</label>
</div>`;

const table = card(
  `<div style="overflow-x: auto;"><table style="border-collapse: collapse; width: 100%;"><thead><tr>${th}</tr></thead><tbody>${rowsData.map(tr).join("")}${totals}</tbody></table></div>`,
  `overflow: hidden;`
);
const selectedNote = `<div style="font-size: 14px; color: ${T.mutedFg};">2 bookinger valgt · 2.470,00 kr ekskl. moms</div>`;
const bookinger =
  head("Bookinger") +
  shell(
    "bookinger",
    "Bookinger",
    filters + `<div style="display: flex; flex-direction: column; gap: ${s(2)};">${selectedNote}${table}</div>`,
    980,
    btn("Markér 2 som faktureret", "primary")
  ) +
  foot;

// ---------------------------------------------------------------- Statistik
const tile = (label, value, prev, note = "") =>
  `<div style="padding: ${s(4)} ${s(5)}; display: flex; flex-direction: column; gap: ${s(1)}; border-right: 1px solid ${T.border}; border-bottom: 1px solid ${T.border};">
    <div style="font-size: 12px; color: ${T.mutedFg};">${label}</div>
    <div class="num" style="font-size: 28px; font-weight: 600; line-height: 1.2;">${value}</div>
    <div style="display: flex; align-items: center; gap: ${s(2)};">${prev ? chip(`<span class="num">${prev}</span>`) : ""}${note ? `<span style="font-size: 12px; color: ${T.mutedFg};">${note}</span>` : ""}</div>
  </div>`;
const tileGroup = (title, period, tiles, colsN) =>
  card(
    `<div style="display: flex; align-items: center; gap: ${s(3)}; padding: ${s(4)} ${s(5)}; border-bottom: 1px solid ${T.border};"><h3 style="margin: 0; font-size: 18px; font-weight: 500;">${title}</h3>${chip(period)}</div>
     <div style="display: grid; grid-template-columns: repeat(${colsN}, minmax(0, 1fr)); margin-right: -1px; margin-bottom: -1px;">${tiles}</div>`,
    `flex: 1 1 0; min-width: 0; overflow: hidden;`
  );

const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const barChart = (title, subtitle, data, color, unit, maxLabel) => {
  const plotH = 200;
  const max = Math.max(...data.filter((d) => d !== null));
  const gridLines = [0, 0.5, 1]
    .map((f) => `<div style="position: absolute; left: 0; right: 0; top: ${(24 + plotH - f * plotH).toFixed(1)}px; height: 1px; background: ${T.border};"></div>`)
    .join("");
  const bars = data
    .map((d, i) => {
      const isMax = d === max;
      const h = d === null ? 0 : (d / max) * plotH;
      const fill = d === null ? T.muted : color;
      const label = isMax ? `<div class="num" style="position: absolute; bottom: ${(h + 6).toFixed(1)}px; left: 50%; transform: translateX(-50%); font-size: 12px; color: ${T.fg}; white-space: nowrap;">${maxLabel}</div>` : "";
      const empty = d === null ? `<div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 12px; height: 2px; background: ${T.secondary}; border-radius: 1px;"></div>` : "";
      return `<div style="position: relative; height: ${plotH}px; display: flex; align-items: flex-end; justify-content: center;">${label}${empty}<div style="width: 12px; height: ${h.toFixed(1)}px; background: ${fill}; border-radius: 4px 4px 0 0;"></div></div>`;
    })
    .join("");
  const labels = months
    .map((m, i) => `<div style="text-align: center; font-size: 12px; color: ${T.mutedFg};">${m}</div>`)
    .join("");
  return card(
    `<div style="padding: ${s(4)} ${s(5)}; display: flex; flex-direction: column; gap: ${s(4)};">
      <div><h3 style="margin: 0; font-size: 18px; font-weight: 500;">${title}</h3><div style="font-size: 12px; color: ${T.mutedFg}; margin-top: 2px;">${subtitle}</div></div>
      <div style="position: relative; padding-top: 24px;">${gridLines}<div style="position: relative; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 2px;">${bars}</div></div>
      <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 2px;">${labels}</div>
      <div style="font-size: 12px; color: ${T.mutedFg};">${unit}</div>
    </div>`,
    `flex: 1 1 0; min-width: 0;`
  );
};

const statistik =
  head("Statistik") +
  shell(
    "statistik",
    "Statistik",
    `
<div style="display: flex; gap: ${s(5)};">
  ${tileGroup(
    "Bookingøkonomi",
    "September 2026",
    tile("Lokaleleje efter rabat", "38.450,00 kr", "34.100,00 kr", "august") +
      tile("Tilkøb", "6.215,00 kr", "5.480,00 kr", "august") +
      tile("Aflysningsgebyrer", "1.000,00 kr", "250,00 kr", "august") +
      tile("Faktureringsgrundlag", "45.665,00 kr", "39.830,00 kr", "ekskl. moms") +
      tile("Heraf medlemmer", "31.915,00 kr", "28.340,00 kr", "") +
      tile("Heraf eksterne", "13.750,00 kr", "11.490,00 kr", ""),
    3
  )}
  ${tileGroup(
    "Bookinger",
    "September 2026",
    tile("Bookinger", "64", "57", "august") +
      tile("Lokaletimer", "148,5", "131,0", "august") +
      tile("Aflysninger", "5", "3", "august") +
      tile("Forventet, resten af måneden", "12.300,00 kr", "", "tæller ikke med i faktureringsgrundlaget"),
    2
  )}
</div>
<div style="display: flex; gap: ${s(5)};">
  ${barChart("Bookinger", "Pr. måned, 2026", [41, 38, 52, 47, 55, 49, 22, 57, 64, null, null, null], T.primary, "Antal bekræftede bookinger", "64")}
  ${barChart("Aflysninger", "Pr. måned, 2026", [2, 4, 3, 6, 4, 7, 1, 3, 5, null, null, null], T.destructive, "Antal aflyste bookinger", "7")}
  ${barChart("Faktureringsgrundlag", "Pr. måned, 2026, ekskl. moms", [28.4, 26.1, 37.9, 33.2, 40.6, 35.8, 14.9, 39.8, 45.7, null, null, null], T.primary, "Tusind kr", "45,7")}
</div>`,
    1080,
    `<div style="display: flex; align-items: center; border: 1px solid ${T.border}; border-radius: ${T.radius}; background: ${T.card}; height: ${s(9)}; box-sizing: border-box;">
      <span style="display: inline-flex; padding: 0 ${s(2)}; color: ${T.mutedFg};">${icon(I.chevL, 20)}</span>
      <span style="font-size: 14px; padding: 0 ${s(2)};">September 2026</span>
      <span style="display: inline-flex; padding: 0 ${s(2)}; color: ${T.mutedFg};">${icon(I.chevR, 20)}</span>
    </div>`
  ) +
  foot;

writeFileSync("Main.dc.html", hjem);
writeFileSync("Bookinger.dc.html", bookinger);
writeFileSync("Statistik.dc.html", statistik);
writeFileSync(
  "canvas.json",
  JSON.stringify(
    {
      artboards: [
        { file: "Main.dc.html", title: "Hjem", x: 0, y: 0, w: 1440, h: 1760 },
        { file: "Bookinger.dc.html", title: "Bookinger (admin)", x: 1560, y: 0, w: 1440, h: 980 },
        { file: "Statistik.dc.html", title: "Statistik", x: 1560, y: 1120, w: 1440, h: 1080 },
      ],
      launch: { view: "canvas" },
    },
    null,
    2
  )
);
console.log("wrote 3 artboards + canvas.json");
