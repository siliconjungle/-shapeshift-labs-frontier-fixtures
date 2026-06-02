import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  compileFixtureScenario,
  createFixturePatchStream,
  decodeFixtureJsonl,
  encodeFixtureJsonl,
  generateFixtureState,
  generateFixtureValue,
  hashFixtureValue,
  verifyFixtureScenarioRun
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const args = parseArgs(process.argv.slice(2));
const rounds = readPositiveInt(args.rounds, 20);
const outPath = args.out ? path.resolve(packageDir, args.out) : null;
let sink = 0;

const schema = {
  type: 'object',
  required: ['id', 'title', 'done', 'priority'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    done: { type: 'boolean' },
    priority: { type: 'integer', minimum: 1, maximum: 5 },
    tags: { type: 'array', minItems: 2, maxItems: 4, items: { enum: ['frontier', 'fixture', 'test', 'demo'] } }
  }
};
const fixtureInput = {
  seed: 'bench',
  collections: {
    users: {
      count: 32,
      typename: 'User',
      schema: {
        type: 'object',
        required: ['id', 'name'],
        properties: { id: { type: 'string' }, name: { type: 'string' } }
      }
    },
    todos: {
      count: 256,
      typename: 'Todo',
      schema: {
        type: 'object',
        required: ['id', 'title', 'done', 'notes'],
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
};
const fixture = generateFixtureState(fixtureInput);
const scenarioInput = {
  id: 'bench.todo-flow',
  initialState: fixture.state,
  steps: [
    { kind: 'set', path: '/todos/10/done', value: true },
    { kind: 'append', path: '/todos/10/notes', value: { body: 'bench note' } },
    { kind: 'assign', path: '/todos/10', value: { status: 'reviewed' } },
    { kind: 'route', route: '/todos/' + fixture.state.todos[10].id },
    { kind: 'event', eventType: 'bench.todo' }
  ],
  diffOptions: { arrayKey: 'id' }
};
const run = compileFixtureScenario(scenarioInput);
const jsonl = encodeFixtureJsonl([run.evidence, ...run.events]);

const rows = [
  runRow('Generate schema value', 4000, () => {
    sink += Object.keys(generateFixtureValue(schema, { seed: 'value-' + sink })).length;
  }),
  runRow('Generate related fixture state', 120, () => {
    sink += generateFixtureState(fixtureInput).summary.collections.length;
  }),
  runRow('Compile scenario to patches', 500, () => {
    sink += compileFixtureScenario(scenarioInput).patches.length;
  }),
  runRow('Verify scenario replay', 1000, () => {
    if (verifyFixtureScenarioRun(run).ok) sink++;
  }),
  runRow('Create patch stream', 1000, () => {
    sink += createFixturePatchStream({
      before: fixture.state,
      after: run.finalState,
      diffOptions: { arrayKey: 'id' }
    }).patch.length;
  }),
  runRow('Stable fixture hash', 3000, () => {
    sink += hashFixtureValue(fixture.state).length;
  }),
  runRow('Encode JSONL evidence', 3000, () => {
    sink += encodeFixtureJsonl([run.evidence, ...run.events]).length;
  }),
  runRow('Decode JSONL evidence', 3000, () => {
    sink += decodeFixtureJsonl(jsonl).length;
  })
];

const report = {
  package: '@shapeshift-labs/frontier-fixtures',
  version: readPackageVersion(),
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform + ' ' + process.arch,
  rounds,
  rows
};

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
}

console.log(report.package + ' package benchmark');
console.log('Node ' + report.node + ' on ' + report.platform + ', rounds=' + rounds);
console.log('These are Frontier-only package measurements, not competitor comparisons.');
console.log('');
console.log(padRight('Fixture', 34) + padLeft('Median', 12) + padLeft('p95', 12));
for (const row of rows) {
  console.log(padRight(row.fixture, 34) + padLeft(formatUs(row.medianUs), 12) + padLeft(formatUs(row.p95Us), 12));
}
if (outPath) console.log('\nwrote ' + path.relative(packageDir, outPath));
if (sink === -1) console.log('sink=' + sink);

function runRow(fixture, batchSize, fn) {
  const samples = [];
  for (let round = 0; round < rounds; round++) {
    const started = performance.now();
    for (let i = 0; i < batchSize; i++) fn();
    samples[samples.length] = ((performance.now() - started) * 1000) / batchSize;
  }
  samples.sort((left, right) => left - right);
  return {
    fixture,
    medianUs: round(percentile(samples, 0.5)),
    p95Us: round(percentile(samples, 0.95))
  };
}

function percentile(values, p) {
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))] || 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function formatUs(value) {
  return value >= 1000 ? (value / 1000).toFixed(2) + ' ms' : value.toFixed(2) + ' us';
}

function padRight(value, width) {
  return String(value).padEnd(width, ' ');
}

function padLeft(value, width) {
  return String(value).padStart(width, ' ');
}

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')).version;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--rounds') out.rounds = argv[++i];
    else if (arg === '--out') out.out = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run bench -- [--rounds 20] [--out benchmarks/results/frontier-fixtures-package-bench-latest.json]');
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
