import { shouldNotify, buildNotificationUrl } from "../src/notify";
import type { ChatMessage, RollMessage, TextMessage } from "../src/types";

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

const MY_ID = "me";
const OTHER_ID = "other";

function textMsg(overrides: Partial<TextMessage> = {}): ChatMessage {
  return {
    id: "t1",
    playerId: OTHER_ID,
    playerName: "Them",
    playerColor: "#fff",
    timestamp: 0,
    type: "text",
    text: "hi",
    ...overrides,
  };
}

function rollMsg(overrides: Partial<RollMessage> = {}): ChatMessage {
  return {
    id: "r1",
    playerId: OTHER_ID,
    playerName: "Them",
    playerColor: "#fff",
    timestamp: 0,
    type: "roll",
    dice: [{ type: "D6", value: 4 }],
    bonus: 0,
    ...overrides,
  };
}

// --- shouldNotify: suppression rules ---
{
  assert(
    shouldNotify(textMsg(), MY_ID, false) === true,
    "another player's text message notifies when chat is closed",
  );

  assert(
    shouldNotify(textMsg({ playerId: MY_ID }), MY_ID, false) === false,
    "own message never notifies",
  );

  assert(
    shouldNotify(textMsg(), MY_ID, true) === false,
    "no message notifies while the chat panel is open",
  );
}

// --- shouldNotify: Dice+ roll handling ---
{
  assert(
    shouldNotify(rollMsg(), MY_ID, false) === true,
    "a normal (locally-rolled) roll from another player notifies",
  );

  assert(
    shouldNotify(rollMsg({ source: "dicePlus" }), MY_ID, false) === false,
    "a Dice+ roll from another player is suppressed (Dice+ shows its own 3D dice)",
  );

  // playerId/chatIsOpen take precedence even for Dice+ rolls.
  assert(
    shouldNotify(rollMsg({ source: "dicePlus", playerId: MY_ID }), MY_ID, false) === false,
    "own Dice+ roll never notifies",
  );

  // The dicePlus carve-out must not leak to text messages.
  assert(
    shouldNotify(textMsg(), MY_ID, false) === true,
    "text messages are unaffected by the Dice+ roll carve-out",
  );
}

// --- buildNotificationUrl: GitHub Pages base path ---
{
  assert(
    buildNotificationUrl("http://localhost:5173", "/") === "http://localhost:5173/notification.html",
    "dev base (\"/\") resolves to the site root",
  );

  assert(
    buildNotificationUrl("https://arrowed.github.io", "/hoot-chat/") ===
      "https://arrowed.github.io/hoot-chat/notification.html",
    "GitHub Pages base (\"/hoot-chat/\") resolves under the project sub-path",
  );
}

// --- Summary ---
console.log(`\nBackground notification tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
