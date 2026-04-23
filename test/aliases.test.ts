import { expandAlias } from "../src/aliases/dispatch";
import { validateAliasName } from "../src/aliases/validation";

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

// --- Alias name validation ---
{
  assert(validateAliasName("atk") === null, "simple name should be valid");
  assert(validateAliasName("my-roll") === null, "name with dash should be valid");
  assert(validateAliasName("my_roll") === null, "name with underscore should be valid");
  assert(validateAliasName("Roll1") === null, "name with uppercase and number should be valid");
  assert(validateAliasName("a") === null, "single letter should be valid");
  assert(validateAliasName("abcdefghijklmnopqrstuvwxyz12345") === null, "31-char name should be valid");
}

// --- Invalid names ---
{
  const err1 = validateAliasName("1abc");
  assert(err1?.type === "invalid_name", "name starting with number should be invalid");

  const err2 = validateAliasName("-abc");
  assert(err2?.type === "invalid_name", "name starting with dash should be invalid");

  const err3 = validateAliasName("");
  assert(err3?.type === "invalid_name", "empty name should be invalid");

  const err4 = validateAliasName("ab cd");
  assert(err4?.type === "invalid_name", "name with space should be invalid");

  const err5 = validateAliasName("abcdefghijklmnopqrstuvwxyz123456");
  assert(err5?.type === "invalid_name", "32-char name should be invalid (max 31)");

  const err6 = validateAliasName("roll!!");
  assert(err6?.type === "invalid_name", "name with special chars should be invalid");
}

// --- Reserved names ---
{
  const err1 = validateAliasName("roll");
  assert(err1?.type === "reserved", "roll should be reserved");

  const err2 = validateAliasName("help");
  assert(err2?.type === "reserved", "help should be reserved");

  const err3 = validateAliasName("duality");
  assert(err3?.type === "reserved", "duality should be reserved");

  const err4 = validateAliasName("alias");
  assert(err4?.type === "reserved", "alias should be reserved");

  const err5 = validateAliasName("diceplus");
  assert(err5?.type === "reserved", "diceplus should be reserved");

  const err6 = validateAliasName("power");
  assert(err6?.type === "reserved", "power should be reserved");
}

// --- Alias expansion ---
{
  const aliases: Record<string, string> = {
    atk: "/roll 1d20+5",
    rage: "/duality +4 adv # Rage attack",
    fireball: "/roll 8d6 # Fireball damage",
    shorthand: "roll 2d6",
  };

  // Basic expansion
  const r1 = expandAlias("/atk", aliases);
  assert(r1 === "/roll 1d20+5", "basic alias should expand");

  // Expansion with trailing args
  const r2 = expandAlias("/atk extra", aliases);
  assert(r2 === "/roll 1d20+5 extra", "alias should pass through trailing args");

  // Non-matching input
  const r3 = expandAlias("/unknown", aliases);
  assert(r3 === null, "unknown alias should return null");

  // Non-command input
  const r4 = expandAlias("hello", aliases);
  assert(r4 === null, "non-slash input should return null");

  // Alias with complex value
  const r5 = expandAlias("/rage", aliases);
  assert(r5 === "/duality +4 adv # Rage attack", "complex alias should expand");

  // Value without leading slash gets one prepended
  const r6 = expandAlias("/shorthand", aliases);
  assert(r6 === "/roll 2d6", "value without slash should get / prepended");

  // Empty aliases map
  const r7 = expandAlias("/atk", {});
  assert(r7 === null, "empty aliases should return null");
}

// --- Summary ---
console.log(`\nAlias tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
