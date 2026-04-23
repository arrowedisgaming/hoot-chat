import OBR from "@owlbear-rodeo/sdk";
import { DualityData, RollDie } from "../types";
import { convertDicePlusResult, DicePlusResult } from "./convert";

const SOURCE = "com.hootchat";
const RESULT_CHANNEL = `${SOURCE}/roll-result`;
const ERROR_CHANNEL = `${SOURCE}/roll-error`;
const DICE_PLUS_READY_CHANNEL = "dice-plus/isReady";
const DICE_PLUS_ROLL_CHANNEL = "dice-plus/roll-request";
const PENDING_TIMEOUT_MS = 15_000;
const READY_TIMEOUT_MS = 1_000;
const PLAYER_DICE_PLUS_KEY = "com.hootchat/useDicePlus";

export interface PendingRoll {
  timestamp: number;
  netEdges?: number;
  hasSkill?: boolean;
  dualityData?: DualityData;
  resolve: (result: { dice: RollDie[]; total: number }) => void;
  reject: (error: string) => void;
}

const pendingRolls = new Map<string, PendingRoll>();

/**
 * Check if Dice+ extension is installed and responsive.
 */
export async function isDicePlusAvailable(): Promise<boolean> {
  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    const unsub = OBR.broadcast.onMessage(DICE_PLUS_READY_CHANNEL, (event) => {
      const data = event.data as { requestId?: string; ready?: boolean };
      if (data.requestId === requestId && data.ready) {
        unsub();
        resolve(true);
      }
    });
    OBR.broadcast.sendMessage(DICE_PLUS_READY_CHANNEL, {
      requestId,
      timestamp: Date.now(),
    }, { destination: "ALL" }).catch(() => {
      unsub();
      resolve(false);
    });
    setTimeout(() => { unsub(); resolve(false); }, READY_TIMEOUT_MS);
  });
}

/**
 * Read the player's Dice+ preference from metadata.
 */
export async function getDicePlusEnabled(): Promise<boolean> {
  const meta = await OBR.player.getMetadata();
  return meta[PLAYER_DICE_PLUS_KEY] === true;
}

/**
 * Set the player's Dice+ preference.
 */
export async function setDicePlusEnabled(enabled: boolean): Promise<void> {
  await OBR.player.setMetadata({ [PLAYER_DICE_PLUS_KEY]: enabled });
}

/**
 * Generate a unique roll ID for pending roll tracking.
 */
export function generateRollId(): string {
  return `hoot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Send a roll request to Dice+ and return a promise that resolves with the result.
 */
export async function sendDicePlusRoll(
  rollId: string,
  diceNotation: string,
  playerId: string,
  playerName: string,
  metadata?: {
    netEdges?: number;
    hasSkill?: boolean;
    dualityData?: DualityData;
  },
): Promise<{ dice: RollDie[]; total: number }> {
  return new Promise((resolve, reject) => {
    const pending: PendingRoll = {
      timestamp: Date.now(),
      ...metadata,
      resolve,
      reject,
    };
    pendingRolls.set(rollId, pending);

    // Timeout cleanup
    setTimeout(() => {
      if (pendingRolls.has(rollId)) {
        pendingRolls.delete(rollId);
        reject("Dice+ roll timed out");
      }
    }, PENDING_TIMEOUT_MS);

    OBR.broadcast.sendMessage(DICE_PLUS_ROLL_CHANNEL, {
      rollId,
      playerId,
      playerName,
      rollTarget: "everyone",
      diceNotation,
      showResults: false,
      timestamp: Date.now(),
      source: SOURCE,
    }, { destination: "ALL" }).catch((err) => {
      pendingRolls.delete(rollId);
      reject(`Dice+ roll request failed: ${err}`);
    });
  });
}

/**
 * Register broadcast listeners for Dice+ result and error channels.
 * Call once during setup. Returns an unsubscribe function.
 */
export function registerDicePlusListeners(): () => void {
  const unsubs: Array<() => void> = [];

  unsubs.push(OBR.broadcast.onMessage(RESULT_CHANNEL, (event) => {
    const data = event.data as {
      rollId?: string;
      result?: DicePlusResult;
    };
    if (!data.rollId || !data.result) return;

    const pending = pendingRolls.get(data.rollId);
    if (!pending) return;
    pendingRolls.delete(data.rollId);

    const converted = convertDicePlusResult(data.result);
    pending.resolve(converted);
  }));

  unsubs.push(OBR.broadcast.onMessage(ERROR_CHANNEL, (event) => {
    const data = event.data as {
      rollId?: string;
      error?: string;
    };
    if (!data.rollId) return;

    const pending = pendingRolls.get(data.rollId);
    if (!pending) return;
    pendingRolls.delete(data.rollId);

    pending.reject(data.error ?? "Unknown Dice+ error");
  }));

  return () => unsubs.forEach((u) => u());
}
