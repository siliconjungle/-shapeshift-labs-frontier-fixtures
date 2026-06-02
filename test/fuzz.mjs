import assert from 'node:assert';
import {
  compileFixtureScenario,
  generateFixtureState,
  verifyFixtureScenarioRun
} from '../dist/index.js';

const args = parseArgs(process.argv.slice(2));
const cases = readPositiveInt(args.cases, 500);
let seed = readUint(args.seed, 0x6a1f2d3c);
const initialSeed = seed;

for (let i = 0; i < cases; i++) {
  const fixtureSeed = 'fuzz-' + nextUint();
  const collectionCount = 1 + randomInt(4);
  const fixture = generateFixtureState({
    seed: fixtureSeed,
    collections: {
      users: {
        count: collectionCount,
        typename: 'User',
        schema: {
          type: 'object',
          required: ['id', 'name', 'score'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            score: { type: 'integer', minimum: 0, maximum: 10 }
          }
        }
      },
      todos: {
        count: collectionCount + 2,
        typename: 'Todo',
        schema: {
          type: 'object',
          required: ['id', 'title', 'done'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            done: { type: 'boolean' },
            notes: { type: 'array', minItems: 0, maxItems: 0, items: { type: 'object' } }
          }
        },
        relations: {
          ownerId: { collection: 'users', field: 'id' }
        }
      }
    }
  });
  const todoIndex = randomInt(fixture.state.todos.length);
  const userIndex = randomInt(fixture.state.users.length);
  const run = compileFixtureScenario({
    id: 'fuzz.' + i,
    initialState: fixture.state,
    steps: [
      { kind: 'set', path: '/todos/' + todoIndex + '/done', value: randomBool() },
      { kind: 'append', path: '/todos/' + todoIndex + '/notes', value: { body: 'note-' + i, userId: fixture.state.users[userIndex].id } },
      { kind: 'assign', path: '/users/' + userIndex, value: { score: randomInt(99) } },
      { kind: 'route', route: '/todos/' + fixture.state.todos[todoIndex].id },
      { kind: 'event', eventType: 'fuzz.case', payload: { i } }
    ],
    diffOptions: { arrayKey: 'id' }
  });
  const verification = verifyFixtureScenarioRun(run);
  assert.strictEqual(verification.ok, true, verification.issues.join(', '));
  assert.strictEqual(run.finalState.todos[todoIndex].notes.length, 1);
}

console.log(`frontier fixtures fuzz passed cases=${cases} seed=${initialSeed}`);

function randomBool() {
  return (nextUint() & 1) === 0;
}

function randomInt(max) {
  return nextUint() % Math.max(1, max);
}

function nextUint() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let value = seed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return (value ^ (value >>> 14)) >>> 0;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cases') out.cases = argv[++i];
    else if (arg === '--seed') out.seed = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node test/fuzz.mjs [--cases 500] [--seed 123]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return out;
}

function readPositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error('expected positive integer, got ' + value);
  return number;
}

function readUint(value, fallback) {
  if (value === undefined) return fallback >>> 0;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('expected numeric seed, got ' + value);
  return number >>> 0;
}
