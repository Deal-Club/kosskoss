import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  await fs.readFile(path.join(__dirname, "asset-manifest.json"), "utf-8")
);
const publicDir = path.join(__dirname, "..", "public");

async function downloadOne(entry) {
  const destPath = path.join(publicDir, entry.localPath);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const res = await fetch(entry.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; asset-downloader)" },
  });
  if (!res.ok) {
    console.error(`FAILED ${res.status} ${entry.url}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  console.log(`OK ${entry.localPath} (${buf.length} bytes)`);
  return true;
}

async function runBatched(items, batchSize) {
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(downloadOne));
    results.forEach((r) => (r ? ok++ : fail++));
  }
  return { ok, fail };
}

const { ok, fail } = await runBatched(manifest, 4);
console.log(`\nDone. OK=${ok} FAIL=${fail} TOTAL=${manifest.length}`);
