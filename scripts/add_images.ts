import fs from "node:fs";
import path from "node:path";
import axios from "axios";

// Typdefinition
interface Question {
  question: string;
  image?: string;
  [key: string]: string | number | string[] | undefined;
}

// RAW URL
const RAW_URL =
  "https://raw.githubusercontent.com/Mustaf-Said/somali-teori/refs/heads/master/data/questions.json";

// Filvägar
const OUT_JSON_PATH = path.join(process.cwd(), "data", "questions_with_images.json");
const LOCAL_JSON_PATH = path.join(process.cwd(), "data", "questions.json");
const BACKUP_JSON_PATH = path.join(process.cwd(), "data", "questions_backup.json");

// Bildmappar
const PUBLIC_IMAGES_DIR = path.join(process.cwd(), "public", "images");
const ROAD_SIGNS_DIR = path.join(PUBLIC_IMAGES_DIR, "road-signs");
const AUTO_DIR = path.join(PUBLIC_IMAGES_DIR, "auto");

// API-nyckel
const PIXABAY_KEY = process.env.PIXABAY_KEY || "";

// Lokala skyltbilder
const LOCAL_SIGN_MAP: Record<string, string> = {
  stop: "stop.png",
  väjningsplikt: "yield.png",
  övergångsställe: "pedestrian.png",
  motorväg: "motorway.png",
  parkering: "parking.png",
  "hastighet 30": "speed-30.png",
  "hastighet 50": "speed-50.png",
  "förbud mot infart": "no-entry.png",
};

// -------------------
// Helper functions
// -------------------

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function loadQuestions(): Promise<Question[]> {
  try {
    console.log("📥 Hämtar RAW-frågor…");
    const res = await axios.get(RAW_URL);
    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(res.data, null, 2));
    return res.data;
  } catch {
    console.log("⚠ RAW misslyckades — läser lokal fil");
    return JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, "utf8"));
  }
}

function findLocalImage(q: Question): string | null {
  const txt = q.question.toLowerCase();
  for (const key of Object.keys(LOCAL_SIGN_MAP)) {
    if (txt.includes(key)) {
      const filename = LOCAL_SIGN_MAP[key];
      const full = path.join(ROAD_SIGNS_DIR, filename);
      if (fs.existsSync(full)) {
        return `/images/road-signs/${filename}`;
      }
    }
  }
  return null;
}

async function downloadFromPixabay(q: Question, index: number): Promise<string | null> {
  if (!PIXABAY_KEY) return null;

  const txt = q.question.toLowerCase();
  let keyword = "traffic sign";

  if (txt.includes("stop")) keyword = "stop sign";
  if (txt.includes("väjnings")) keyword = "yield sign";
  if (txt.includes("övergång")) keyword = "pedestrian crossing sign";
  if (txt.includes("motorväg")) keyword = "motorway sign";
  if (txt.includes("hastighet")) keyword = "speed limit sign";
  if (txt.includes("parkering")) keyword = "parking sign";

  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(
    keyword
  )}&image_type=photo&per_page=3`;

  try {
    const r = await axios.get(url);
    if (!r.data.hits.length) return null;

    const imgUrl = r.data.hits[0].largeImageURL;
    const ext = path.extname(imgUrl).split("?")[0] || ".jpg";
    const fileName = `q_${index}${ext}`;
    const savePath = path.join(AUTO_DIR, fileName);

    const writer = fs.createWriteStream(savePath);
    const img = await axios.get(imgUrl, { responseType: "stream" });
    img.data.pipe(writer);

    await new Promise<void>((resolve) => writer.on("finish", () => resolve()));

    return `/images/auto/${fileName}`;
  } catch {
    return null;
  }
}

// -------------------
// MAIN SCRIPT
// -------------------

(async function main() {
  console.log("🚀 Startar script…");

  ensureDir(PUBLIC_IMAGES_DIR);
  ensureDir(ROAD_SIGNS_DIR);
  ensureDir(AUTO_DIR);

  const questions = await loadQuestions();
  fs.writeFileSync(BACKUP_JSON_PATH, JSON.stringify(questions, null, 2));

  let added = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const txt = q.question.toLowerCase();

    if (q.image) continue;

    const needsImage =
      txt.includes("vägmärke") ||
      txt.includes("skylt") ||
      txt.includes("stop") ||
      txt.includes("övergång") ||
      txt.includes("motorväg") ||
      txt.includes("hastighet") ||
      txt.includes("parkering") ||
      txt.includes("förbud");

    if (!needsImage) continue;

    let img = findLocalImage(q);
    if (!img) img = await downloadFromPixabay(q, i + 1);

    if (img) {
      q.image = img;
      added++;
      console.log(`📸 Bild hittad (#${i + 1}): ${img}`);
    } else {
      console.log(`⚠ Ingen bild för fråga #${i + 1}`);
    }
  }

  fs.writeFileSync(OUT_JSON_PATH, JSON.stringify(questions, null, 2));

  console.log(`\n✅ KLART! ${added} frågor fick bilder.`);
  console.log(`📁 Ny fil skapad: ${OUT_JSON_PATH}`);
})();
