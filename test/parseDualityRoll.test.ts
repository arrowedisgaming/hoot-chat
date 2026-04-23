import { parseDualityRoll, parseSingleDualityDie } from "../src/roll/parseDualityRoll";

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

// Seeded RNG: returns values in sequence (cycling)
function seededRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
}

// --- Basic rolls ---
{
  // rng values: 0.5 → ceil(0.5*12) = 6 for hope, 0.25 → ceil(0.25*12) = 3 for fear
  const result = parseDualityRoll("", seededRng([0.5, 0.25]));
  assert(result !== null, "bare /duality should parse");
  assert(result!.dualityData.hopeDie === 6, "hope die should be 6");
  assert(result!.dualityData.fearDie === 3, "fear die should be 3");
  assert(result!.dualityData.outcome === "hope", "outcome should be hope (6 > 3)");
  assert(result!.bonus === 0, "bonus should be 0");
  assert(result!.dice.length === 2, "should have 2 dice");
}

// --- With modifier ---
{
  const result = parseDualityRoll("+3", seededRng([0.5, 0.25]));
  assert(result !== null, "+3 should parse");
  assert(result!.bonus === 3, "bonus should be 3");
  assert(result!.dualityData.hopeDie === 6, "hope die should be 6");
}

{
  const result = parseDualityRoll("-2", seededRng([0.5, 0.25]));
  assert(result !== null, "-2 should parse");
  assert(result!.bonus === -2, "bonus should be -2");
}

// --- With advantage ---
{
  // rng: hope=6, fear=3, adv=4
  const result = parseDualityRoll("+3 adv", seededRng([0.5, 0.25, 0.6]));
  assert(result !== null, "+3 adv should parse");
  assert(result!.dualityData.advDie === 4, "adv die should be ceil(0.6*6) = 4");
  assert(result!.dualityData.disDie === undefined, "dis die should be undefined");
  assert(result!.dice.length === 3, "should have 3 dice (2d12 + 1d6)");
}

// --- With disadvantage ---
{
  const result = parseDualityRoll("dis", seededRng([0.5, 0.25, 0.6]));
  assert(result !== null, "dis should parse");
  assert(result!.dualityData.disDie === 4, "dis die should be 4");
  assert(result!.dualityData.advDie === undefined, "adv die should be undefined");
}

// --- Adv/dis cancellation ---
{
  // adv + dis cancel each other
  const result = parseDualityRoll("adv dis", seededRng([0.5, 0.25]));
  assert(result !== null, "adv dis should parse");
  assert(result!.dualityData.advDie === undefined, "adv should cancel");
  assert(result!.dualityData.disDie === undefined, "dis should cancel");
  assert(result!.dice.length === 2, "should have 2 dice after cancellation");
}

// --- +d6 as advantage ---
{
  const result = parseDualityRoll("+d6", seededRng([0.5, 0.25, 0.6]));
  assert(result !== null, "+d6 should parse as adv");
  assert(result!.dualityData.advDie === 4, "adv die from +d6 should be 4");
}

// --- -d6 as disadvantage ---
{
  const result = parseDualityRoll("-d6", seededRng([0.5, 0.25, 0.6]));
  assert(result !== null, "-d6 should parse as dis");
  assert(result!.dualityData.disDie === 4, "dis die from -d6 should be 4");
}

// --- Advantage + Experience ---
{
  // adv + extra +d6 = adv die + 1 experience
  const result = parseDualityRoll("adv +d6", seededRng([0.5, 0.25, 0.6, 0.8]));
  assert(result !== null, "adv +d6 should parse");
  assert(result!.dualityData.advDie === 4, "adv die should be 4");
  assert(result!.dualityData.expDice?.length === 1, "should have 1 exp die");
  assert(result!.dualityData.expDice?.[0] === 5, "exp die should be ceil(0.8*6) = 5");
  assert(result!.dice.length === 4, "should have 4 dice total");
}

// --- Label ---
{
  const result = parseDualityRoll("+3 # Finesse roll", seededRng([0.5, 0.25]));
  assert(result !== null, "label should parse");
  assert(result!.dualityData.label === "Finesse roll", "label should be 'Finesse roll'");
  assert(result!.bonus === 3, "bonus should be 3 with label");
}

// --- Crit (hope === fear) ---
{
  // Same value for both dice = crit
  const result = parseDualityRoll("", seededRng([0.5, 0.5]));
  assert(result !== null, "crit should parse");
  assert(result!.dualityData.hopeDie === result!.dualityData.fearDie, "hope should equal fear for crit");
  assert(result!.dualityData.outcome === "crit", "outcome should be crit");
}

// --- Fear outcome ---
{
  // hope=3, fear=6
  const result = parseDualityRoll("", seededRng([0.25, 0.5]));
  assert(result !== null, "fear outcome should parse");
  assert(result!.dualityData.outcome === "fear", "outcome should be fear (3 < 6)");
}

// --- Invalid input ---
{
  const result = parseDualityRoll("gobbledygook");
  assert(result === null, "unrecognized token should return null");
}

{
  const result = parseDualityRoll("+3 foobar");
  assert(result === null, "valid + invalid token should return null");
}

// --- Alternative keywords ---
{
  const result = parseDualityRoll("advantage", seededRng([0.5, 0.25, 0.6]));
  assert(result !== null, "'advantage' keyword should parse");
  assert(result!.dualityData.advDie !== undefined, "advantage keyword should give adv die");
}

{
  const result = parseDualityRoll("a", seededRng([0.5, 0.25, 0.6]));
  assert(result !== null, "'a' keyword should parse as advantage");
  assert(result!.dualityData.advDie !== undefined, "'a' should give adv die");
}

{
  const result = parseDualityRoll("disadvantage", seededRng([0.5, 0.25, 0.6]));
  assert(result !== null, "'disadvantage' keyword should parse");
  assert(result!.dualityData.disDie !== undefined, "disadvantage keyword should give dis die");
}

// --- Single die (/hope, /fear) ---
{
  const result = parseSingleDualityDie("hope", "", seededRng([0.75]));
  assert(result !== null, "bare /hope should parse");
  assert(result!.dualityData.hopeDie === 9, "hope die should be ceil(0.75*12) = 9");
  assert(result!.dualityData.fearDie === 0, "fear die should be 0 for /hope");
  assert(result!.dice.length === 1, "/hope should have 1 die");
}

{
  const result = parseSingleDualityDie("fear", "+2", seededRng([0.5]));
  assert(result !== null, "/fear +2 should parse");
  assert(result!.dualityData.fearDie === 6, "fear die should be 6");
  assert(result!.dualityData.hopeDie === 0, "hope die should be 0 for /fear");
  assert(result!.bonus === 2, "bonus should be 2");
}

{
  const result = parseSingleDualityDie("hope", "adv");
  assert(result === null, "/hope adv should be invalid (only modifier allowed)");
}

// --- Summary ---
console.log(`\nDuality roll tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
