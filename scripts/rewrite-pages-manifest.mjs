import { readFile, writeFile } from "node:fs/promises";

const manifestPath = new URL("../dist/manifest.json", import.meta.url);
const pagesBaseUrl = "https://arrowedisgaming.github.io/hoot-chat/";
const iconUrl = new URL("icon.svg", pagesBaseUrl).href;

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

manifest.icon = iconUrl;
manifest.background_url = new URL("background.html", pagesBaseUrl).href;

if (manifest.action) {
  manifest.action.icon = iconUrl;
  manifest.action.popover = pagesBaseUrl;
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
