import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const SIGN_MAP_PATH = path.join(process.cwd(), "data", "sign_file_map.json");
const OUT_DIR = path.join(process.cwd(), "public", "images", "road-signs");

// Alla mappar som innehåller vägmärkesskyltar
const FOLDERS = [
  "warning",
  "priority",
  "prohibitory",
  "mandatory",
  "information",
  "direction",
  "local",
  "additional",
  "svg"
];

// 🔐 Hämta GitHub-token
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("❌ Ingen GITHUB_TOKEN hittad! Lägg till i terminalen:");
  console.error('setx GITHUB_TOKEN "din-token-här"\nStarta om terminalen.');
  process.exit(1);
}

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ----------------------------------------------------
// 🧩 Hämta filer från GitHub API
// ----------------------------------------------------
async function fetchFolder(folder) {
  const url = `https://api.github.com/repos/knorf/swedish-traffic-signs/contents/${folder}`;

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "sign-downloader",
        "Authorization": `Bearer ${TOKEN}`
      }
    });

    return res.data
      .filter((f) => f.name.endsWith(".svg"))
      .map((f) => ({
        name: f.name,
        url: f.download_url
      }));

  } catch (e) {
    console.log(`⚠ Kunde inte läsa /${folder}:`, e.response?.status);
    return [];
  }
}

// ----------------------------------------------------
// 🧠 Matcha kod → bästa fil
// ----------------------------------------------------
function findBestFile(code, allFiles) {
  const name = code.toUpperCase();

  return (
    allFiles.find((f) => f.name === `${name}.svg`) ||
    allFiles.find((f) => f.name.startsWith(`${name}_`)) ||
    allFiles.find((f) => f.name.includes(name)) ||
    null
  );
}

// ----------------------------------------------------
// 🚀 MAIN – laddar ner riktiga vägmärken
// ----------------------------------------------------
(async function run() {
  console.log("🚀 Hämtar riktiga vägmärken från GitHub…");

  if (!fs.existsSync(SIGN_MAP_PATH)) {
    console.error("❌ Hittar inte sign_file_map.json");
    process.exit(1);
  }

  // Läs skyltspecifikation
  const signMap = JSON.parse(fs.readFileSync(SIGN_MAP_PATH, "utf8"));

  // Hämta lista på alla skyltfiler
  let allFiles = [];
  for (const folder of FOLDERS) {
    const files = await fetchFolder(folder);
    console.log(`📁 Hittade ${files.length} SVG i /${folder}`);
    allFiles = allFiles.concat(files);
  }

  console.log(`\n🔎 Totalt hittade ${allFiles.length} unika SVG-filer\n`);

  let downloaded = 0;

  for (const code of Object.keys(signMap)) {
    const category = signMap[code].category || code[0];
    const best = findBestFile(code, allFiles);

    if (!best) {
      console.warn(`⚠ Ingen fil hittades för ${code}`);
      continue;
    }

    const outCatDir = path.join(OUT_DIR, category);
    await ensureDir(outCatDir);

    const savePath = path.join(outCatDir, `${code}.svg`);

    try {
      const res = await axios.get(best.url, { responseType: "arraybuffer" });
      fs.writeFileSync(savePath, res.data);
      console.log(`✅ Laddade ner ${code} → ${best.name}`);
      downloaded++;
    } catch (e) {
      console.error(`❌ Misslyckades: ${code}`, e.message);
    }
  }

  console.log("\n🎉 KLART!");
  console.log(`📌 Totalt nedladdade skyltar: ${downloaded}`);
})();
