import { RollDie } from "../types";

export interface DicePlusGroup {
  description?: string;
  diceModel?: string;
  diceType: string; // "d6", "d12", etc. (lowercase)
  dice: Array<{
    diceId: string;
    rollId: string;
    diceType: string;
    value: number;
    kept: boolean;
  }>;
  total: number;
  isNegative?: boolean;
}

export interface DicePlusResult {
  rollId: string;
  diceNotation: string;
  totalValue: number;
  rollSummary: string;
  groups: DicePlusGroup[];
}

/**
 * Convert Dice+ result groups into Hoot Chat's RollDie[] format.
 *
 * Strategy: extract kept dice with their individual values, then compute
 * bonus as the difference between the Dice+ totalValue and the sum of
 * kept dice values. This preserves the visual "dice + bonus = total" flow
 * in RollDisplay.
 */
export function convertDicePlusResult(result: DicePlusResult): {
  dice: RollDie[];
  total: number;
} {
  const dice: RollDie[] = [];

  for (const group of result.groups) {
    const sign = group.isNegative ? -1 : 1;
    for (const d of group.dice) {
      if (!d.kept) continue;
      dice.push({
        type: d.diceType.toUpperCase(), // "d12" → "D12"
        value: sign * d.value,
      });
    }
  }

  return {
    dice,
    total: result.totalValue,
  };
}

/**
 * Build Dice+ notation for a duality roll.
 *
 * Uses named dice models ({Hope}, {Fear}) so players with configured
 * dice in their Dice+ bag see the right colors.
 */
export function buildDualityNotation(
  modifier: number,
  hasAdv: boolean,
  hasDis: boolean,
  expDiceCount: number,
  label?: string,
): string {
  let notation = "1d12{Hope}+1d12{Fear}";
  if (hasAdv) notation += "+1d6";
  if (hasDis) notation += "-1d6";
  for (let i = 0; i < expDiceCount; i++) notation += "+1d6";
  if (modifier > 0) notation += `+${modifier}`;
  if (modifier < 0) notation += `${modifier}`;
  if (label) notation += ` # ${label}`;
  return notation;
}

export function buildPowerNotation(modifier: number): string {
  let notation = "2d10";
  if (modifier > 0) notation += `+${modifier}`;
  if (modifier < 0) notation += `${modifier}`;
  return notation;
}

export function buildSingleDualityDieNotation(
  die: "hope" | "fear",
  modifier: number,
  label?: string,
): string {
  const dieName = die === "hope" ? "Hope" : "Fear";
  let notation = `1d12{${dieName}}`;
  if (modifier > 0) notation += `+${modifier}`;
  if (modifier < 0) notation += `${modifier}`;
  if (label) notation += ` # ${label}`;
  return notation;
}
