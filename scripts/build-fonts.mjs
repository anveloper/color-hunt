// 앱에서 실제로 쓰는 글자만 담은 Gaegu 서브셋을 public/fonts/에 만든다.
//
// 앱인토스 미니앱은 번들을 통째로 내려받기 때문에 외부 폰트 CDN에 의존하지
// 않는 편이 좋은데, Gaegu 한글 전체는 weight당 1MB가 넘는다. 이 앱에는
// 사용자 입력 텍스트가 없고 모든 문구가 소스에 박혀 있으므로, 소스에서
// 글자를 뽑아 그 글자만 subsetting한다.
//
//   pnpm run fonts
//
// 한글 문구를 추가/수정했다면 이 스크립트를 다시 돌려야 한다.
// 안 돌리면 새 글자가 두부(tofu)로 보인다.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "fonts");

// woff2를 받으려면 최신 브라우저 UA가 필요하다. 구형 UA면 ttf를 준다.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const FAMILY = "Gaegu";
const WEIGHTS = [400, 700];

async function collectChars() {
  const chars = new Set();
  const patterns = ["src/**/*.ts", "src/**/*.tsx", "src/**/*.css", "index.html"];
  for (const pattern of patterns) {
    for await (const entry of glob(pattern, { cwd: ROOT })) {
      for (const ch of await readFile(join(ROOT, entry), "utf-8")) chars.add(ch);
    }
  }
  // 소스에 없더라도 숫자/기본 문장부호는 런타임에 생길 수 있어 항상 포함한다.
  for (const ch of "0123456789:.,·×/()[]%-–—'\"!?~ ") chars.add(ch);

  return [...chars]
    .filter((ch) => {
      const code = ch.codePointAt(0);
      if (code < 0x20 || code === 0x7f) return false; // 제어문자
      return true;
    })
    .sort()
    .join("");
}

async function main() {
  const text = await collectChars();
  const family = `${FAMILY}:wght@${WEIGHTS.join(";")}`;
  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}` +
    `&text=${encodeURIComponent(text)}&display=swap`;

  const css = await (await fetch(cssUrl, { headers: { "User-Agent": UA } })).text();
  if (!css.includes("@font-face")) {
    throw new Error(`Google Fonts 응답에 @font-face가 없습니다:\n${css.slice(0, 400)}`);
  }

  await mkdir(OUT_DIR, { recursive: true });

  // @font-face 블록마다 weight와 폰트 URL을 뽑아 파일로 저장하고,
  // src를 로컬 경로로 바꾼 CSS를 만든다.
  const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  const rules = [];
  for (const block of blocks) {
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
    // text= 서브셋 URL은 확장자가 없다(.../l/font?kit=...). format으로 판별한다.
    const url = block.match(/url\((https:\/\/[^)]+)\)\s*format\(['"]woff2['"]\)/)?.[1];
    if (!weight || !url) continue;

    const fileName = `gaegu-${weight}.woff2`;
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(join(OUT_DIR, fileName), bytes);
    console.log(`  ${fileName}  ${(bytes.length / 1024).toFixed(1)} KB`);

    rules.push(
      [
        "@font-face {",
        `  font-family: "${FAMILY}";`,
        "  font-style: normal;",
        `  font-weight: ${weight};`,
        "  font-display: swap;",
        `  src: url("/fonts/${fileName}") format("woff2");`,
        "}",
      ].join("\n"),
    );
  }

  if (rules.length === 0) throw new Error("추출된 @font-face가 없습니다.");

  const header = [
    "/* 자동 생성 파일 — 직접 수정하지 마세요.",
    " * `pnpm run fonts`로 다시 만듭니다 (scripts/build-fonts.mjs).",
    ` * 앱에서 쓰는 ${[...text].length}자만 담은 서브셋입니다.`,
    " */",
  ].join("\n");

  await writeFile(
    join(ROOT, "src", "styles", "fonts.css"),
    `${header}\n\n${rules.join("\n\n")}\n`,
  );
  console.log(`글자 수: ${[...text].length}`);
}

await main();
