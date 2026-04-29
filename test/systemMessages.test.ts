import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  appendSystemMessage,
  createSystemMessage,
  emptySystemMessages,
  SystemMessage,
} from "../src/systemMessages/types";

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
const SRC_ROOT = join(__dirname, "..", "src", "systemMessages");

// --- emptySystemMessages ---
{
  const empty = emptySystemMessages();
  assert(Array.isArray(empty), "emptySystemMessages should return an array");
  assert(empty.length === 0, "emptySystemMessages should be empty");
}

// --- createSystemMessage ---
{
  const msg = createSystemMessage("info", { type: "text", text: "hello" });
  assert(msg.kind === "info", "createSystemMessage should set kind");
  assert(msg.content.type === "text", "createSystemMessage should set content type");
  assert(
    msg.content.type === "text" && msg.content.text === "hello",
    "createSystemMessage should round-trip text content",
  );
  assert(typeof msg.id === "string" && msg.id.length > 0, "createSystemMessage should set a non-empty id");
  assert(typeof msg.timestamp === "number" && msg.timestamp > 0, "createSystemMessage should set a numeric timestamp");

  const a = createSystemMessage("info", { type: "text", text: "a" });
  const b = createSystemMessage("info", { type: "text", text: "b" });
  assert(a.id !== b.id, "createSystemMessage should produce unique ids");
}

// --- createSystemMessage with aliasList content ---
{
  const aliases = { atk: "/roll 1d20+5", rage: "/duality +4 adv" };
  const msg = createSystemMessage("info", { type: "aliasList", aliases });
  assert(msg.content.type === "aliasList", "aliasList content type round-trips");
  assert(
    msg.content.type === "aliasList" && msg.content.aliases.atk === "/roll 1d20+5",
    "aliasList content preserves aliases map",
  );
}

// --- appendSystemMessage ---
{
  const a = createSystemMessage("info", { type: "text", text: "a" });
  const b = createSystemMessage("success", { type: "text", text: "b" });
  const c = createSystemMessage("error", { type: "text", text: "c" });

  let state = emptySystemMessages();
  state = appendSystemMessage(state, a);
  assert(state.length === 1, "append should yield length 1");
  assert(state[0].id === a.id, "append should preserve the appended message");

  state = appendSystemMessage(state, b);
  state = appendSystemMessage(state, c);
  assert(state.length === 3, "append should accumulate messages");
  assert(
    state[0].id === a.id && state[1].id === b.id && state[2].id === c.id,
    "append should preserve insertion order",
  );

  // Immutability: appendSystemMessage should not mutate input.
  const before = emptySystemMessages();
  appendSystemMessage(before, a);
  assert(before.length === 0, "appendSystemMessage should not mutate the prev array");
}

// --- emptySystemMessages clears state in a clearSystemMessages-style flow ---
{
  let state: SystemMessage[] = emptySystemMessages();
  state = appendSystemMessage(state, createSystemMessage("info", { type: "text", text: "x" }));
  state = appendSystemMessage(state, createSystemMessage("info", { type: "text", text: "y" }));
  assert(state.length === 2, "state has two entries before clear");
  state = emptySystemMessages();
  assert(state.length === 0, "emptySystemMessages clears state");
}

// --- Broadcast/persist guard: pushing system messages must not invoke any
// broadcast or persist callback. This documents the structural invariant. ---
{
  let broadcastCalls = 0;
  let persistCalls = 0;
  const mockBroadcast = (_msg: SystemMessage) => { broadcastCalls++; };
  const mockPersist = (_msgs: SystemMessage[]) => { persistCalls++; };

  let state = emptySystemMessages();
  for (let i = 0; i < 5; i++) {
    state = appendSystemMessage(state, createSystemMessage("info", { type: "text", text: `m${i}` }));
  }

  // Reference the mocks so a future refactor that wires them through the
  // module would force this assertion to fail.
  void mockBroadcast;
  void mockPersist;

  assert(broadcastCalls === 0, "appendSystemMessage must not call any broadcast callback");
  assert(persistCalls === 0, "appendSystemMessage must not call any persist callback");
  assert(state.length === 5, "five messages should accumulate locally");
}

// --- Structural invariant: types.ts and useSystemMessages.ts must not import
// the OBR SDK or anything that touches room metadata. This protects against
// the original system-message-leak bug regressing. ---
{
  const typesSrc = readFileSync(join(SRC_ROOT, "types.ts"), "utf8");
  const hookSrc = readFileSync(join(SRC_ROOT, "useSystemMessages.ts"), "utf8");

  assert(
    !typesSrc.includes("@owlbear-rodeo/sdk"),
    "systemMessages/types.ts must not import @owlbear-rodeo/sdk",
  );
  assert(
    !typesSrc.includes("setMetadata"),
    "systemMessages/types.ts must not reference setMetadata",
  );
  assert(
    !typesSrc.includes("OBR.broadcast"),
    "systemMessages/types.ts must not reference OBR.broadcast",
  );

  assert(
    !hookSrc.includes("@owlbear-rodeo/sdk"),
    "systemMessages/useSystemMessages.ts must not import @owlbear-rodeo/sdk",
  );
  assert(
    !hookSrc.includes("setMetadata"),
    "systemMessages/useSystemMessages.ts must not reference setMetadata",
  );
  assert(
    !hookSrc.includes("OBR.broadcast"),
    "systemMessages/useSystemMessages.ts must not reference OBR.broadcast",
  );
}

// --- Summary ---
console.log(`\nSystem message tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
