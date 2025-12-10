import fs from "node:fs";
import path from "node:path";
import axios from "axios";

// Vart bilderna ska sparas
const OUT_DIR = path.join(process.cwd(), "public/images/signs");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Din befintliga fil
const QUESTIONS_PATH = path.join(process.cwd(), "data/questions.json");
const OUT_JSON_PATH = path.join(process.cwd(), "data/questions_with_images.json");

// Bas-URL (offentlig Trafikverket S3-bucket)
const BASE_URL = "https://trafikverket.road-signs.s3.eu-north-1.amazonaws.com";

// Alla skyltkoder (A–X)
const SIGN_CODES = [
  ...Array.from({ length: 50 }, (_, i) => `A${i + 1}`),
  ...Array.from({ length: 50 }, (_, i) => `B${i + 1}`),
  ...Array.from({ length: 50 }, (_, i) => `C${i + 1}`),
  ...Array.from({ length: 50 }, (_, i) => `D${i + 1}`),
  ...Array.from({ length: 50 }, (_, i) => `E${i + 1}`),
];

// Regex för att hitta vägmärkeskod i frågetexten
const SIGN_REGEX = /(A|B|C|D|E)\s?(\d{1,2})/i;

async function downloadSign(code) {
  const url = `${BASE_URL}/${code}.png`;
  const outPath = path.join(OUT_DIR, `${code}.png`);

  if (fs.existsSync(outPath)) return outPath;

  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(outPath, res.data);
    console.log("✔ Hämta:", code);
    return outPath;
  } catch {
    console.log("✖ Finns ej:", code);
    return null;
  }
}

async function main() {
  console.log("🚀 Hämtar riktiga vägmärken från Trafikverket…");

  const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf8"));

  for (let q of questions) {
    const match = q.question.match(SIGN_REGEX);
    if (!match) continue;

    const code = match[1].toUpperCase() + match[2];

    if (!SIGN_CODES.includes(code)) continue;

    const filePath = await downloadSign(code);
    if (filePath) {
      q.image = `/images/signs/${code}.png`;
    }
  }

  fs.writeFileSync(OUT_JSON_PATH, JSON.stringify(questions, null, 2));
  console.log("🎉 KLAR! Uppdaterade frågor sparade i", OUT_JSON_PATH);
}

main();
