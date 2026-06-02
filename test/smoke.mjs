import assert from 'node:assert';
import {
  compileFixtureScenario,
  createFixturePatchStream,
  createFixtureRng,
  decodeFixtureJsonl,
  encodeFixtureJsonl,
  generateFixtureState,
  generateFixtureValue,
  hashFixtureValue,
  verifyFixturePatchStream,
  verifyFixtureScenarioRun
} from '../dist/index.js';

const rngA = createFixtureRng('same-seed');
const rngB = createFixtureRng('same-seed');
assert.strictEqual(rngA.int(1, 1000), rngB.int(1, 1000));
assert.strictEqual(rngA.id('user'), rngB.id('user'));

const value = generateFixtureValue({
  type: 'object',
  required: ['id', 'title', 'done'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    done: { type: 'boolean' },
    tags: { type: 'array', minItems: 2, maxItems: 2, items: { enum: ['frontier', 'fixture'] } }
  }
}, { seed: 'value' });
assert.strictEqual(typeof value.id, 'string');
assert.strictEqual(value.tags.length, 2);

const fixture = generateFixtureState({
  seed: 'billing',
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
      count: 5,
      typename: 'Invoice',
      schema: {
        type: 'object',
        required: ['id', 'title', 'status', 'amount'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { enum: ['draft', 'open', 'paid'] },
          amount: { type: 'integer', minimum: 100, maximum: 1000 },
          notes: { type: 'array', minItems: 0, maxItems: 0, items: { type: 'object' } }
        }
      },
      relations: {
        userId: { collection: 'users', field: 'id' }
      }
    }
  }
});

assert.strictEqual(fixture.kind, 'frontier.fixture.state');
assert.strictEqual(fixture.entities.users.length, 3);
assert.strictEqual(fixture.entities.invoices.length, 5);
assert.strictEqual(fixture.state.invoices[3].userId, fixture.state.users[0].id);

const run = compileFixtureScenario({
  id: 'billing.overdue-resolution',
  seed: 'billing',
  initialState: fixture.state,
  actors: [{ id: 'account-manager', role: 'finance' }],
  steps: [
    { id: 'mark-overdue', actorId: 'account-manager', kind: 'set', path: '/invoices/1/status', value: 'overdue' },
    { id: 'open-route', actorId: 'account-manager', kind: 'route', route: '/billing/invoices/1', state: { tab: 'activity' } },
    { id: 'add-note', actorId: 'account-manager', kind: 'append', path: '/invoices/1/notes', value: { body: 'Called customer' } },
    { id: 'settle', actorId: 'account-manager', kind: 'assign', path: '/invoices/1', value: { status: 'paid', paidAt: '2026-01-02' } },
    { id: 'audit', actorId: 'account-manager', kind: 'event', eventType: 'billing.invoice.audit', payload: { invoiceId: fixture.state.invoices[1].id } }
  ],
  now: 100
});

assert.strictEqual(run.evidence.replayVerified, true);
assert.strictEqual(run.routes.length, 1);
assert.strictEqual(run.events.length, 5);
assert.strictEqual(run.finalState.invoices[1].status, 'paid');
assert.deepStrictEqual(verifyFixtureScenarioRun(run).issues, []);
assert.ok(run.patches.some((patch) => patch.length > 0));

const patchStream = createFixturePatchStream({
  id: 'manual',
  before: { todos: [{ id: 't1', done: false }] },
  after: { todos: [{ id: 't1', done: true }] },
  diffOptions: { arrayKey: 'id' }
});
assert.strictEqual(patchStream.verified, true);
assert.strictEqual(verifyFixturePatchStream({ todos: [{ id: 't1', done: false }] }, patchStream.patch, { todos: [{ id: 't1', done: true }] }).ok, true);

const jsonl = encodeFixtureJsonl([run.evidence, patchStream]);
assert.strictEqual(decodeFixtureJsonl(jsonl).length, 2);
assert.strictEqual(hashFixtureValue({ b: 2, a: 1 }), hashFixtureValue({ a: 1, b: 2 }));

console.log('frontier fixtures smoke passed');
