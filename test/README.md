# Tests

Plain TypeScript test files that run with `tsx`. No test framework required.

## Running

```bash
npx tsx test/parseDualityRoll.test.ts
npx tsx test/aliases.test.ts
npx tsx test/dicePlusConvert.test.ts
npx tsx test/systemMessages.test.ts
```

Or run all:

```bash
for f in test/*.test.ts; do npx tsx "$f"; done
```

## Design

- Tests use a simple assert + counter pattern (no framework dependency).
- Dice-rolling tests inject a seeded RNG via the `rng` parameter to make results deterministic.
- Alias tests validate pure functions only (no OBR SDK mocking needed for name validation and expansion).
- Dice+ conversion tests validate the data transformation layer without requiring the broadcast API.
- System message tests validate the local-only helpers that back `pushSystemMessage` (no Owlbear imports).
