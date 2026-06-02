# @shapeshift-labs/frontier-fixtures

Deterministic fixture and scenario generation for Frontier apps.

`frontier-fixtures` turns a seed plus schema/collection/scenario declarations into replayable app fixtures: schema-shaped state, related entity collections, actor sessions, route states, Frontier patch streams, event records, JSONL bundles, hashes, and compact evidence summaries.

It is deliberately not a general fake-data package. The root import stays small and dependency-light so generated scenarios can feed unit tests, docs, component previews, browser evidence runs, benchmark fixtures, and bug repros from the same manifest.

## Install

```sh
npm install @shapeshift-labs/frontier-fixtures
```

## Example

```ts
import {
  compileFixtureScenario,
  generateFixtureState,
  verifyFixtureScenarioRun
} from '@shapeshift-labs/frontier-fixtures';

const fixture = generateFixtureState({
  seed: 'billing-demo-v1',
  collections: {
    users: {
      count: 3,
      typename: 'User',
      schema: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }
    },
    invoices: {
      count: 8,
      typename: 'Invoice',
      schema: {
        type: 'object',
        required: ['id', 'title', 'status'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { enum: ['draft', 'open', 'paid'] },
          notes: { type: 'array', minItems: 0, maxItems: 0, items: { type: 'object' } }
        }
      },
      relations: {
        userId: { collection: 'users', field: 'id' }
      }
    }
  }
});

const run = compileFixtureScenario({
  id: 'billing.overdue-resolution',
  initialState: fixture.state,
  actors: [{ id: 'account-manager', role: 'finance' }],
  steps: [
    { actorId: 'account-manager', kind: 'set', path: '/invoices/2/status', value: 'overdue' },
    { actorId: 'account-manager', kind: 'route', route: '/billing/invoices/2' },
    { actorId: 'account-manager', kind: 'append', path: '/invoices/2/notes', value: { body: 'Customer called' } },
    { actorId: 'account-manager', kind: 'assign', path: '/invoices/2', value: { status: 'paid' } }
  ],
  diffOptions: { arrayKey: 'id' }
});

console.log(run.patches);
console.log(verifyFixtureScenarioRun(run).ok);
```

## Surface

- `createFixtureRng` creates deterministic seedable RNGs with forked streams for stable fixture subgraphs.
- `generateFixtureValue` emits JSON values from a small JSON Schema-compatible subset.
- `generateFixtureState` builds root state plus related entity collections and records collection summaries.
- `compileFixtureScenario` runs route/action/event/state steps and emits replay-verified Frontier patches.
- `createFixturePatchStream`, `verifyFixturePatchStream`, and `verifyFixtureScenarioRun` make patch correctness machine-checkable.
- `encodeFixtureJsonl`, `decodeFixtureJsonl`, `hashFixtureValue`, and `stableFixtureStringify` support evidence bundles and reproducible assertions.

## Boundary

The root package depends only on `@shapeshift-labs/frontier`. It emits structural route records, event records, actors, and evidence summaries without importing `frontier-route`, `frontier-event-log`, `frontier-test`, `frontier-playwright`, `frontier-schema`, or app frameworks.

Schema, route, event-log, test, browser, and app-framework integrations should be adapters around the generated records, not dependencies of this root package.

## Source Repository

Package source is published at [siliconjungle/-shapeshift-labs-frontier-fixtures](https://github.com/siliconjungle/-shapeshift-labs-frontier-fixtures).

## Determinism And Privacy

Fixture output is seeded and reproducible. Generated strings use synthetic values such as `Fixture 123` and `example.invalid` email addresses; the package does not generate real-looking personal data by default.

Every scenario compile verifies each step patch by applying it back to the previous state. `verifyFixtureScenarioRun` replays the full patch stream from `initialState` to `finalState`.

## Benchmarks

Run the package-local benchmark:

```sh
npm run bench
```

The package benchmark writes `benchmarks/results/frontier-fixtures-package-bench-latest.json` when run from the package directory. Frontier-only package measurements cover schema value generation, related collection generation, scenario compilation, patch replay verification, patch stream generation, hashing, and JSONL encoding/decoding.

These are Frontier-only package measurements, not competitor comparisons.
