# Tests

Plain TypeScript test files that run with `tsx`. No test framework required.

## Running

```bash
npm test
```

Or run a single file:

```bash
npx tsx test/parseDualityRoll.test.ts
```

## Design

- Tests use a simple assert + counter pattern (no framework dependency).
- Dice-rolling tests inject a seeded RNG via the `rng` parameter to make results deterministic.
- Alias tests validate pure functions only (no OBR SDK mocking needed for name validation and expansion).
- Dice+ conversion tests validate the data transformation layer without requiring the broadcast API.
- System message tests validate the local-only helpers that back `pushSystemMessage` (no Owlbear imports).
