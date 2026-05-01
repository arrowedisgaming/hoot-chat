import {
  convertDicePlusResult,
  buildDualityNotation,
  buildPowerNotation,
  buildSingleDualityDieNotation,
  DicePlusResult,
} from "../src/dicePlus/convert";

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

// --- Basic conversion ---
{
  const result: DicePlusResult = {
    rollId: "test1",
    diceNotation: "2d6+3",
    totalValue: 12,
    rollSummary: "2d6+3 = 12",
    groups: [
      {
        diceType: "d6",
        dice: [
          { diceId: "a", rollId: "test1", diceType: "d6", value: 4, kept: true },
          { diceId: "b", rollId: "test1", diceType: "d6", value: 5, kept: true },
        ],
        total: 9,
      },
    ],
  };

  const converted = convertDicePlusResult(result);
  assert(converted.dice.length === 2, "should have 2 dice");
  assert(converted.dice[0].type === "D6", "first die type should be D6 (uppercase)");
  assert(converted.dice[0].value === 4, "first die value should be 4");
  assert(converted.dice[1].value === 5, "second die value should be 5");
  assert(converted.total === 12, "total should be 12");
}

// --- Dropped dice (kept=false) ---
{
  const result: DicePlusResult = {
    rollId: "test2",
    diceNotation: "4d6kh3",
    totalValue: 14,
    rollSummary: "4d6kh3 = 14",
    groups: [
      {
        diceType: "d6",
        dice: [
          { diceId: "a", rollId: "test2", diceType: "d6", value: 6, kept: true },
          { diceId: "b", rollId: "test2", diceType: "d6", value: 5, kept: true },
          { diceId: "c", rollId: "test2", diceType: "d6", value: 3, kept: true },
          { diceId: "d", rollId: "test2", diceType: "d6", value: 1, kept: false },
        ],
        total: 14,
      },
    ],
  };

  const converted = convertDicePlusResult(result);
  assert(converted.dice.length === 3, "should only have 3 kept dice");
  assert(converted.dice.every(d => d.value !== 1), "dropped die (value 1) should not be included");
}

// --- Negative group ---
{
  const result: DicePlusResult = {
    rollId: "test3",
    diceNotation: "2d6-1d4",
    totalValue: 6,
    rollSummary: "2d6-1d4 = 6",
    groups: [
      {
        diceType: "d6",
        dice: [
          { diceId: "a", rollId: "test3", diceType: "d6", value: 4, kept: true },
          { diceId: "b", rollId: "test3", diceType: "d6", value: 5, kept: true },
        ],
        total: 9,
      },
      {
        diceType: "d4",
        isNegative: true,
        dice: [
          { diceId: "c", rollId: "test3", diceType: "d4", value: 3, kept: true },
        ],
        total: -3,
      },
    ],
  };

  const converted = convertDicePlusResult(result);
  assert(converted.dice.length === 3, "should have 3 dice (2 positive + 1 negative)");
  assert(converted.dice[2].value === -3, "negative group die should have negative value");
  assert(converted.dice[2].type === "D4", "negative die type should be D4");
  assert(converted.total === 6, "total should be 6");
}

// --- Multiple groups ---
{
  const result: DicePlusResult = {
    rollId: "test4",
    diceNotation: "1d12+1d6",
    totalValue: 15,
    rollSummary: "1d12+1d6 = 15",
    groups: [
      {
        diceType: "d12",
        dice: [
          { diceId: "a", rollId: "test4", diceType: "d12", value: 10, kept: true },
        ],
        total: 10,
      },
      {
        diceType: "d6",
        dice: [
          { diceId: "b", rollId: "test4", diceType: "d6", value: 5, kept: true },
        ],
        total: 5,
      },
    ],
  };

  const converted = convertDicePlusResult(result);
  assert(converted.dice.length === 2, "should have 2 dice from 2 groups");
  assert(converted.dice[0].type === "D12", "first die should be D12");
  assert(converted.dice[1].type === "D6", "second die should be D6");
}

// --- Duality notation builder ---
{
  const n1 = buildDualityNotation(3, false, false, 0);
  assert(n1 === "1d12{Hope}+1d12{Fear}+3", "basic duality notation with +3");

  const n2 = buildDualityNotation(-1, false, false, 0);
  assert(n2 === "1d12{Hope}+1d12{Fear}-1", "duality notation with -1");

  const n3 = buildDualityNotation(0, true, false, 0);
  assert(n3 === "1d12{Hope}+1d12{Fear}+1d6", "duality notation with adv");

  const n4 = buildDualityNotation(0, false, true, 0);
  assert(n4 === "1d12{Hope}+1d12{Fear}-1d6", "duality notation with dis");

  const n5 = buildDualityNotation(2, true, false, 1);
  assert(n5 === "1d12{Hope}+1d12{Fear}+1d6+1d6+2", "duality notation with adv + 1 exp + mod");

  const n6 = buildDualityNotation(0, false, false, 0, "Attack");
  assert(n6 === "1d12{Hope}+1d12{Fear} # Attack", "duality notation with label");

  const n7 = buildDualityNotation(0, true, false, 2, "Rage");
  assert(n7 === "1d12{Hope}+1d12{Fear}+1d6+1d6+1d6 # Rage", "duality notation with adv + 2 exp + label");
}

// --- Power notation builder ---
{
  assert(buildPowerNotation(0) === "2d10", "basic power notation");
  assert(buildPowerNotation(3) === "2d10+3", "power notation with +3");
  assert(buildPowerNotation(-1) === "2d10-1", "power notation with -1");
}

// --- Single Hope/Fear notation builder ---
{
  assert(buildSingleDualityDieNotation("hope", 0) === "1d12{Hope}", "basic hope notation");
  assert(buildSingleDualityDieNotation("hope", 2, "Clutch") === "1d12{Hope}+2 # Clutch", "hope notation with modifier and label");
  assert(buildSingleDualityDieNotation("fear", -1) === "1d12{Fear}-1", "fear notation with -1");
}

// --- Summary ---
console.log(`\nDice+ conversion tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
