* Beskrivning:
* - Enkel quiz-app som laddar frågor från en lokal JSON (questions.json)
* - Sök, filtrera, slumpa, kör quiz med poängräkning
* - Tailwind används för styling (klasser finns i JSX)
*
* Användning:
* 1) Skapa nytt Next.js-projekt: `pnpm create next-app@latest --ts` eller `npm init next-app`.
* 2) Installera Tailwind (följ Tailwind docs för Next.js):
* - `npm install -D tailwindcss postcss autoprefixer`
* - `npx tailwindcss init -p`
* - Lägg till i tailwind.config.js: content: ["./app/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}"]
* - I globals.css: @tailwind base; @tailwind components; @tailwind utilities;
* 3) Skapa `data/questions.json` med dina frågor enligt schema nedan.
* 4) Klistra in denna fil som `pages/index.tsx` och kör `npm run dev`.
*
* Questions schema (questions.json):
* [
* {
* "id": "q1",
* "category": "Vägmärken",
* "question": "Vad betyder denna skylt?",
* "options": ["Stop", "Håll vänster", "Förbud"],
* "answer": 0,
* "explanation": "Röd octagon betyder stop.",
* "source": "Källa eller notering"
* },
* ...
* ]
*/