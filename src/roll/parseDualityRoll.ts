import { RollDie, DualityData } from "../types";

export interface DualityParseResult {
  dice: RollDie[];
  bonus: number;
  dualityData: DualityData;
}

type RngFn = () => number;

function rollDie(sides: number, rng: RngFn): number {
  return Math.ceil(rng() * sides);
}

/**
 * Parse and roll a Daggerheart duality roll.
 *
 * Syntax: [<modifier>] [adv|dis|+d6|-d6] [+<exp>] [# label]
 *
 * Returns null if the input contains unrecognized tokens.
 */
export function parseDualityRoll(
  args: string,
  rng: RngFn = Math.random,
): DualityParseResult | null {
  let s = args.trim();

  // Extract optional label (# to end of string)
  let label: string | undefined;
  const labelIdx = s.indexOf("#");
  if (labelIdx !== -1) {
    label = s.slice(labelIdx + 1).trim() || undefined;
    s = s.slice(0, labelIdx).trim();
  }

  if (!s) {
    // No arguments — bare /duality is valid (just 2d12 with no modifier)
  }

  const tokens = s.split(/\s+/).filter(Boolean);

  let modifier = 0;
  let advCount = 0; // positive = advantage, negative = disadvantage
  let expDiceCount = 0;
  let hasModifier = false;
  let hasAdvDisKeyword = false;

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Advantage keywords
    if (lower === "adv" || lower === "advantage" || lower === "a") {
      advCount++;
      hasAdvDisKeyword = true;
      continue;
    }

    // Disadvantage keywords
    if (lower === "dis" || lower === "disadvantage" || lower === "d") {
      advCount--;
      hasAdvDisKeyword = true;
      continue;
    }

    // +d6 or -d6 (with optional count prefix like +2d6)
    const diceMatch = lower.match(/^([+-])(\d*)d6$/);
    if (diceMatch) {
      const sign = diceMatch[1] === "+" ? 1 : -1;
      const count = diceMatch[2] ? parseInt(diceMatch[2]) : 1;
      if (count < 1 || count > 10) return null;

      if (!hasAdvDisKeyword && !hasModifier) {
        // First d6 token without a prior adv/dis keyword — treat as adv/dis
        if (sign > 0) {
          advCount += count;
        } else {
          advCount -= count;
        }
        hasAdvDisKeyword = true;
      } else {
        // Subsequent d6 tokens — treat as Experience dice
        if (sign > 0) {
          expDiceCount += count;
        } else {
          // Negative Experience dice don't exist in Daggerheart — reject
          return null;
        }
      }
      continue;
    }

    // Flat modifier: [+-]?\d+
    const modMatch = lower.match(/^([+-]?\d+)$/);
    if (modMatch) {
      modifier += parseInt(modMatch[1]);
      hasModifier = true;
      continue;
    }

    // Unrecognized token
    return null;
  }

  // Cancel adv/dis 1:1
  const hasAdv = advCount > 0;
  const hasDis = advCount < 0;

  // Roll the dice
  const hopeDie = rollDie(12, rng);
  const fearDie = rollDie(12, rng);
  const advDie = hasAdv ? rollDie(6, rng) : undefined;
  const disDie = hasDis ? rollDie(6, rng) : undefined;
  const expDice = expDiceCount > 0
    ? Array.from({ length: expDiceCount }, () => rollDie(6, rng))
    : undefined;

  // Determine outcome (based on Hope vs Fear die only, before modifiers)
  const outcome: DualityData["outcome"] =
    hopeDie === fearDie ? "crit"
    : hopeDie > fearDie ? "hope"
    : "fear";

  // Build dice array for the standard roll pipeline
  const dice: RollDie[] = [
    { type: "D12", value: hopeDie },
    { type: "D12", value: fearDie },
  ];
  if (advDie !== undefined) dice.push({ type: "D6", value: advDie });
  if (disDie !== undefined) dice.push({ type: "D6", value: disDie });
  if (expDice) {
    for (const v of expDice) dice.push({ type: "D6", value: v });
  }

  const bonus = modifier;

  const dualityData: DualityData = {
    hopeDie,
    fearDie,
    ...(advDie !== undefined && { advDie }),
    ...(disDie !== undefined && { disDie }),
    ...(expDice && expDice.length > 0 && { expDice }),
    outcome,
    ...(label && { label }),
  };

  return { dice, bonus, dualityData };
}

/**
 * Parse a single Hope or Fear die roll (for /hope and /fear aliases).
 */
export function parseSingleDualityDie(
  die: "hope" | "fear",
  args: string,
  rng: RngFn = Math.random,
): DualityParseResult | null {
  let s = args.trim();

  // Extract optional label
  let label: string | undefined;
  const labelIdx = s.indexOf("#");
  if (labelIdx !== -1) {
    label = s.slice(labelIdx + 1).trim() || undefined;
    s = s.slice(0, labelIdx).trim();
  }

  // Only a flat modifier is allowed for single-die rolls
  let modifier = 0;
  if (s) {
    const modMatch = s.match(/^([+-]?\d+)$/);
    if (!modMatch) return null;
    modifier = parseInt(modMatch[1]);
  }

  const value = rollDie(12, rng);
  const hopeDie = die === "hope" ? value : 0;
  const fearDie = die === "fear" ? value : 0;

  const dice: RollDie[] = [{ type: "D12", value }];

  const dualityData: DualityData = {
    hopeDie,
    fearDie,
    outcome: "hope", // Single die — no meaningful outcome comparison
    ...(label && { label }),
  };

  return { dice, bonus: modifier, dualityData };
}
