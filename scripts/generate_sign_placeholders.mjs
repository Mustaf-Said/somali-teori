// scripts/generate_sign_placeholders.mjs
// Kör med: node scripts/generate_sign_placeholders.mjs
// Skapar: public/images/road-signs/{A,B,C,D,E,F,G,H}/<kod>.svg
import fs from "node:fs";
import path from "node:path";

const OUT_ROOT = path.join(process.cwd(), "public", "images", "road-signs");

// Lista över skyltkoder att generera placeholders för.
// Den här listan innehåller de vanligaste A-H skyltkoderna + flera C31 hastigheter.
// Du kan lägga till / ta bort koder i arrayen enligt behov.
const SIGN_CODES = [
  // A (varningar) - ett urval
  "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15", "A16", "A17", "A18", "A19", "A20",
  // B (väjningsplikt / stop / huvudled)
  "B1", "B2", "B3", "B4", "B5",
  // C (förbud) - inkluderar hastighetskoder
  "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13",
  "C31-30", "C31-40", "C31-50", "C31-60", "C31-70", "C31-80", "C31-90", "C31-100", "C31-110", "C31-120",
  // D (påbud)
  "D1", "D2", "D3", "D4", "D5", "D6", "D7",
  // E (anvisning)
  "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10", "E11", "E12", "E13", "E14", "E15", "E16", "E17", "E18", "E19", "E20",
  // F (lokaliseringsmärken)
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18",
  // G (upplysningsmärken)
  "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11", "G12",
  // H (turism / service)
  "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10", "H11", "H12", "H13", "H14"
];

// Funktion som renderar en enkel SVG placeholder
function renderSVG(code) {
  // Anpassa färger beroende på typ (bokstav)
  const letter = code.charAt(0).toUpperCase();
  let bg = "#FFFFFF";
  let border = "#000000";
  let textColor = "#000000";
  if (letter === "A") { bg = "#fff4e6"; border = "#e67e22"; }         // varning - orange-ish
  if (letter === "B") { bg = "#ffe6e6"; border = "#e74c3c"; }         // rött (stop)
  if (letter === "C") { bg = "#ffeef7"; border = "#c0392b"; }         // förbud - rött
  if (letter === "D") { bg = "#e6f7ff"; border = "#2980b9"; }         // påbud - blått
  if (letter === "E") { bg = "#f0fff0"; border = "#27ae60"; }         // anvisning - grönt
  if (letter === "G" || letter === "F" || letter === "H") { bg = "#f7f7f7"; border = "#7f8c8d"; }

  // Enkel svg: en rektangel med kod i mitten, samt en liten beskrivning rad
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${code}">
  <rect width="100%" height="100%" rx="24" ry="24" fill="${bg}" stroke="${border}" stroke-width="12"/>
  <text x="50%" y="42%" font-family="Arial, Helvetica, sans-serif" font-size="96" text-anchor="middle" fill="${textColor}" font-weight="700">${code}</text>
  <text x="50%" y="62%" font-family="Arial, Helvetica, sans-serif" font-size="28" text-anchor="middle" fill="#333">${getDescription(code)}</text>
</svg>`;
  return svg;
}

// Enkel heuristisk "beskrivning" att skriva in placeholderen (valfritt)
function getDescription(code) {
  const lower = code.toLowerCase();
  if (lower.includes("stop") || code === "B1") return "STOP / Stoppskylt";
  if (lower.includes("väjn") || code === "B2") return "Väjningsplikt";
  if (lower.includes("övergång") || code === "D5") return "Övergångsställe";
  if (lower.includes("motor") || code.startsWith("E1")) return "Motorväg / Anvisning";
  if (lower.includes("park") || code.includes("parking") || code.startsWith("E19")) return "Parkering";
  if (code.startsWith("C31")) return `Hastighet ${code.split("-")[1] || "?"} km/h`;
  return "Vägmärke";
}

// Skapa mappar A..H
function ensureFolders() {
  ensureDir(OUT_ROOT);
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
  groups.forEach(g => {
    ensureDir(path.join(OUT_ROOT, g));
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Kör generationen
async function run() {
  console.log("Skapar placeholder-skyltar i:", OUT_ROOT);
  ensureFolders();

  let count = 0;
  for (const code of SIGN_CODES) {
    // placera i mapp baserat på första bokstaven
    const folder = code.charAt(0).toUpperCase();
    const fileName = `${code}.svg`;
    const outPath = path.join(OUT_ROOT, folder, fileName);

    const svg = renderSVG(code);

    fs.writeFileSync(outPath, svg, "utf8");
    count++;
    if (count % 25 === 0) console.log(`  Genererat ${count}...`);
  }

  console.log(`Färdig! Genererade ${count} placeholder-SVG:er i ${OUT_ROOT}`);
  console.log("Du kan nu använda dem i appen, t.ex. /images/road-signs/B/B1.svg");
}

run().catch(err => {
  console.error("Fel vid generering:", err);
  process.exit(1);
});
