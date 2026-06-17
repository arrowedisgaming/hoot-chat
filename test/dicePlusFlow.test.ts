import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${msg}`);
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..", "src");

const appSrc = readFileSync(join(srcRoot, "App.tsx"), "utf8");
const clientSrc = readFileSync(join(srcRoot, "dicePlus", "client.ts"), "utf8");

// --- Dice+ return channel ---
// Dice+ delivers results on the `{source}/roll-result` broadcast channel, NOT
// through the official `rodeo.owlbear.dice` player metadata. The chat-publish
// path MUST be driven by that broadcast listener; otherwise the 3D dice render
// but no chat message is ever produced. These tests guard that contract.
{
  assert(
    clientSrc.includes("/roll-result"),
    "Dice+ client should consume results from the {source}/roll-result channel",
  );

  assert(
    clientSrc.includes("export function registerDicePlusListeners"),
    "Dice+ client should expose a result-channel listener registrar",
  );

  assert(
    clientSrc.includes("export async function sendDicePlusRoll"),
    "Dice+ client should expose a roll path that resolves on the result channel",
  );

  assert(
    !clientSrc.includes("requestDicePlusRoll"),
    "the fire-and-forget request path (which relied on Owlbear dice metadata) should be gone",
  );
}

// --- Dice+ chat publication ---
{
  assert(
    appSrc.includes("registerDicePlusListeners()"),
    "App must register the Dice+ result listener so results reach chat",
  );

  assert(
    appSrc.includes("sendDicePlusRoll"),
    "App should route Dice+ command rolls through sendDicePlusRoll",
  );

  assert(
    appSrc.includes('source: "dicePlus"'),
    "Dice+ chat rolls should retain the Dice+ source marker (used by notify suppression)",
  );

  // Regression guard: the bug wired Dice+ chat output to the built-in Owlbear
  // dice-tray metadata listener. That listener must NOT consume Dice+ metadata
  // or stamp a Dice+ source.
  const listenerStart = appSrc.indexOf('DICE_PREFIX + "rollValues"');
  const listenerWindow = appSrc.slice(listenerStart, listenerStart + 800);
  assert(
    listenerStart !== -1 && !listenerWindow.includes('source: "dicePlus"'),
    "the built-in dice-tray metadata listener must not publish Dice+-sourced rolls",
  );

  assert(
    !appSrc.includes("queueDicePlusMetadata") &&
      !appSrc.includes("consumeDicePlusMetadata"),
    "the metadata-queue workaround (which assumed Dice+ writes Owlbear dice metadata) should be gone",
  );
}

// --- Summary ---
console.log(`\nDice+ flow tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
