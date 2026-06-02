import {
  applyPatchImmutable,
  cloneJson,
  diff,
  equalsJson,
  parsePointer,
  stringifyPointer,
  type DiffOptions,
  type JsonObject,
  type JsonPath,
  type JsonValue,
  type Patch,
  type PathSegment
} from '@shapeshift-labs/frontier';

export type FixtureSeed = string | number;
export type FixturePath = string | JsonPath;
export type FixtureSchemaType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';

export interface FixtureRng {
  readonly seed: string;
  nextFloat(): number;
  int(min: number, max: number): number;
  bool(probability?: number): boolean;
  pick<T>(values: readonly T[]): T;
  id(prefix?: string): string;
  fork(label: string | number): FixtureRng;
}

export interface FixtureJsonSchema {
  type?: FixtureSchemaType | readonly FixtureSchemaType[];
  properties?: Record<string, FixtureJsonSchema>;
  required?: readonly string[];
  items?: FixtureJsonSchema | readonly FixtureJsonSchema[];
  enum?: readonly JsonValue[];
  const?: JsonValue;
  default?: JsonValue;
  examples?: readonly JsonValue[];
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  format?: string;
  title?: string;
  description?: string;
}

export interface GenerateFixtureValueOptions {
  seed?: FixtureSeed;
  rng?: FixtureRng;
  path?: FixturePath;
  depth?: number;
  includeOptional?: boolean;
  maxDepth?: number;
}

export interface FixtureRelationSpec {
  collection: string;
  field?: FixturePath;
  mode?: 'one' | 'many';
  count?: number;
}

export interface FixtureCollectionSpec {
  count: number;
  schema?: FixtureJsonSchema;
  path?: FixturePath;
  idField?: FixturePath;
  idPrefix?: string;
  typename?: string;
  typenameField?: string;
  startIndex?: number;
  relations?: Record<string, FixtureRelationSpec>;
}

export interface GenerateFixtureStateInput {
  seed?: FixtureSeed;
  schema?: FixtureJsonSchema;
  root?: JsonValue;
  collections?: Record<string, FixtureCollectionSpec>;
}

export interface FixtureCollectionSummary {
  id: string;
  path: JsonPath;
  count: number;
  idField: JsonPath;
}

export interface FixtureStateRecord {
  kind: 'frontier.fixture.state';
  version: 1;
  seed: string;
  generator: string;
  state: JsonValue;
  entities: Record<string, JsonObject[]>;
  summary: {
    collections: FixtureCollectionSummary[];
    hash: string;
  };
}

export interface FixtureActorSpec {
  id: string;
  role?: string;
  capabilities?: readonly string[];
  metadata?: JsonObject;
}

export type FixtureScenarioStep =
  | {
      id?: string;
      actorId?: string;
      kind: 'set';
      path: FixturePath;
      value: JsonValue;
      eventType?: string;
    }
  | {
      id?: string;
      actorId?: string;
      kind: 'remove';
      path: FixturePath;
      eventType?: string;
    }
  | {
      id?: string;
      actorId?: string;
      kind: 'assign';
      path: FixturePath;
      value: JsonObject;
      eventType?: string;
    }
  | {
      id?: string;
      actorId?: string;
      kind: 'append';
      path: FixturePath;
      value: JsonValue;
      eventType?: string;
    }
  | {
      id?: string;
      actorId?: string;
      kind: 'route';
      route: string;
      state?: JsonValue;
      eventType?: string;
    }
  | {
      id?: string;
      actorId?: string;
      kind: 'action';
      action: string;
      input?: JsonValue;
      eventType?: string;
    }
  | {
      id?: string;
      actorId?: string;
      kind: 'event';
      eventType: string;
      payload?: JsonValue;
    };

export interface CompileFixtureScenarioInput {
  id: string;
  seed?: FixtureSeed;
  initialState?: JsonValue;
  state?: GenerateFixtureStateInput;
  actors?: readonly FixtureActorSpec[];
  steps: readonly FixtureScenarioStep[];
  diffOptions?: DiffOptions;
  now?: number;
}

export interface FixtureRouteStateRecord {
  stepId: string;
  stepIndex: number;
  actorId?: string;
  route: string;
  state?: JsonValue;
}

export interface FixtureEventRecord {
  kind: 'frontier.fixture.event';
  version: 1;
  id: string;
  scenarioId: string;
  stepId: string;
  stepIndex: number;
  actorId?: string;
  type: string;
  route?: string;
  action?: string;
  payload?: JsonValue;
  patch: Patch;
  beforeHash: string;
  afterHash: string;
  at: number;
}

export interface FixtureScenarioStepRecord {
  id: string;
  index: number;
  kind: FixtureScenarioStep['kind'];
  actorId?: string;
  route?: string;
  action?: string;
  path?: JsonPath;
  patch: Patch;
  beforeHash: string;
  afterHash: string;
  eventId: string;
}

export interface FixtureScenarioRun {
  kind: 'frontier.fixture.scenario.run';
  version: 1;
  id: string;
  seed: string;
  generator: string;
  actors: FixtureActorSpec[];
  initialState: JsonValue;
  finalState: JsonValue;
  patches: Patch[];
  steps: FixtureScenarioStepRecord[];
  events: FixtureEventRecord[];
  routes: FixtureRouteStateRecord[];
  evidence: FixtureEvidenceSummary;
}

export interface FixtureEvidenceSummary {
  scenarioId: string;
  seed: string;
  stepCount: number;
  patchCount: number;
  eventCount: number;
  routeCount: number;
  initialHash: string;
  finalHash: string;
  replayVerified: boolean;
  generator: string;
}

export interface FixturePatchStreamInput {
  id?: string;
  before: JsonValue;
  after: JsonValue;
  diffOptions?: DiffOptions;
}

export interface FixturePatchStream {
  kind: 'frontier.fixture.patch-stream';
  version: 1;
  id: string;
  beforeHash: string;
  afterHash: string;
  patch: Patch;
  verified: boolean;
}

export interface FixtureReplayVerification {
  ok: boolean;
  finalHash: string;
  expectedHash?: string;
  steps: number;
  issues: string[];
}

export interface FixtureJsonlRecord {
  kind: string;
  [key: string]: unknown;
}

export const FRONTIER_FIXTURES_GENERATOR = '@shapeshift-labs/frontier-fixtures@0.1.0';

export function createFixtureRng(seed: FixtureSeed = 'frontier-fixtures'): FixtureRng {
  const seedText = String(seed);
  let state = hashSeed(seedText) || 0x9e3779b9;
  const rng: FixtureRng = {
    seed: seedText,
    nextFloat() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(min: number, max: number) {
      const low = Math.ceil(min);
      const high = Math.floor(max);
      if (high < low) return low;
      return low + Math.floor(rng.nextFloat() * (high - low + 1));
    },
    bool(probability = 0.5) {
      return rng.nextFloat() < probability;
    },
    pick(values) {
      if (!values.length) throw new RangeError('cannot pick from an empty fixture list');
      return values[rng.int(0, values.length - 1)];
    },
    id(prefix = 'fx') {
      return prefix + '_' + rng.int(100000, 999999).toString(36);
    },
    fork(label) {
      return createFixtureRng(seedText + ':' + String(label));
    }
  };
  return rng;
}

export function generateFixtureValue(schema: FixtureJsonSchema = {}, options: GenerateFixtureValueOptions = {}): JsonValue {
  const rng = options.rng || createFixtureRng(options.seed || 'frontier-fixture-value');
  const path = normalizeFixturePath(options.path || []);
  const depth = options.depth || 0;
  const maxDepth = options.maxDepth || 6;
  if (schema.default !== undefined) return cloneJson(schema.default);
  if (schema.const !== undefined) return cloneJson(schema.const);
  if (schema.enum && schema.enum.length) return cloneJson(rng.pick(schema.enum));
  if (schema.examples && schema.examples.length) return cloneJson(rng.pick(schema.examples));

  const type = chooseSchemaType(schema, rng, depth, maxDepth);
  if (type === 'null') return null;
  if (type === 'boolean') return rng.bool();
  if (type === 'integer') return generateInteger(schema, rng);
  if (type === 'number') return generateNumber(schema, rng);
  if (type === 'string') return generateString(schema, path, rng);
  if (type === 'array') return generateArray(schema, { ...options, rng, path, depth, maxDepth });
  return generateObject(schema, { ...options, rng, path, depth, maxDepth });
}

export function generateFixtureState(input: GenerateFixtureStateInput = {}): FixtureStateRecord {
  const seed = String(input.seed || 'frontier-fixture-state');
  const rng = createFixtureRng(seed);
  let state = input.root !== undefined
    ? cloneJson(input.root)
    : input.schema
      ? generateFixtureValue(input.schema, { rng: rng.fork('root') })
      : {};
  const entities: Record<string, JsonObject[]> = {};
  const summaries: FixtureCollectionSummary[] = [];
  const collections = input.collections || {};

  for (const [collectionId, spec] of Object.entries(collections)) {
    const rows: JsonObject[] = [];
    const count = Math.max(0, Math.floor(spec.count || 0));
    const idField = normalizeFixturePath(spec.idField || 'id');
    const path = normalizeFixturePath(spec.path || [collectionId]);
    const idPrefix = spec.idPrefix || slugify(collectionId);
    for (let index = 0; index < count; index++) {
      const itemRng = rng.fork(collectionId + ':' + index);
      const generated = generateFixtureValue(spec.schema || defaultEntitySchema(collectionId), {
        rng: itemRng,
        path: [collectionId, index],
        includeOptional: true
      });
      const row = isJsonObject(generated) ? generated : { value: generated };
      writeAtPath(row, idField, idPrefix + '_' + String((spec.startIndex || 1) + index));
      if (spec.typename) {
        writeAtPath(row, normalizeFixturePath(spec.typenameField || '__typename'), spec.typename);
      }
      applyRelations(row, spec.relations || {}, entities, index, itemRng);
      rows[rows.length] = row;
    }
    entities[collectionId] = rows;
    state = writeAtPath(state, path, rows);
    summaries[summaries.length] = { id: collectionId, path, count, idField };
  }

  return {
    kind: 'frontier.fixture.state',
    version: 1,
    seed,
    generator: FRONTIER_FIXTURES_GENERATOR,
    state,
    entities,
    summary: {
      collections: summaries,
      hash: hashFixtureValue(state)
    }
  };
}

export function createFixturePatchStream(input: FixturePatchStreamInput): FixturePatchStream {
  const patch = diff(input.before, input.after, input.diffOptions);
  const replayed = applyPatchImmutable(input.before, patch);
  return {
    kind: 'frontier.fixture.patch-stream',
    version: 1,
    id: input.id || 'patch-stream:' + hashFixtureValue({ before: input.before, after: input.after }),
    beforeHash: hashFixtureValue(input.before),
    afterHash: hashFixtureValue(input.after),
    patch,
    verified: equalsJson(replayed, input.after)
  };
}

export function compileFixtureScenario(input: CompileFixtureScenarioInput): FixtureScenarioRun {
  const seed = String(input.seed || input.id);
  const initialState = input.initialState !== undefined
    ? cloneJson(input.initialState)
    : generateFixtureState({ ...(input.state || {}), seed: input.state?.seed || seed }).state;
  let state = cloneJson(initialState);
  const patches: Patch[] = [];
  const steps: FixtureScenarioStepRecord[] = [];
  const events: FixtureEventRecord[] = [];
  const routes: FixtureRouteStateRecord[] = [];
  let currentRoute: string | undefined;
  const baseTime = input.now ?? 0;

  for (let index = 0; index < input.steps.length; index++) {
    const step = input.steps[index];
    const stepId = step.id || 'step-' + String(index + 1);
    const before = state;
    const next = applyScenarioStep(state, step);
    const patch = diff(before, next, input.diffOptions);
    const replayed = applyPatchImmutable(before, patch);
    if (!equalsJson(replayed, next)) {
      throw new Error('fixture scenario step did not replay: ' + stepId);
    }
    const beforeHash = hashFixtureValue(before);
    const afterHash = hashFixtureValue(next);
    if (step.kind === 'route') {
      currentRoute = step.route;
      routes[routes.length] = {
        stepId,
        stepIndex: index,
        actorId: step.actorId,
        route: step.route,
        state: step.state === undefined ? undefined : cloneJson(step.state)
      };
    }
    const eventId = input.id + ':' + stepId;
    const event = createStepEvent(input.id, step, {
      eventId,
      stepId,
      index,
      route: step.kind === 'route' ? step.route : currentRoute,
      patch,
      beforeHash,
      afterHash,
      at: baseTime + index
    });
    events[events.length] = event;
    patches[patches.length] = patch;
    steps[steps.length] = {
      id: stepId,
      index,
      kind: step.kind,
      actorId: step.actorId,
      route: step.kind === 'route' ? step.route : currentRoute,
      action: step.kind === 'action' ? step.action : undefined,
      path: 'path' in step ? normalizeFixturePath(step.path) : undefined,
      patch,
      beforeHash,
      afterHash,
      eventId
    };
    state = next;
  }

  const run: FixtureScenarioRun = {
    kind: 'frontier.fixture.scenario.run',
    version: 1,
    id: input.id,
    seed,
    generator: FRONTIER_FIXTURES_GENERATOR,
    actors: (input.actors || []).map((actor) => ({ ...actor })),
    initialState,
    finalState: state,
    patches,
    steps,
    events,
    routes,
    evidence: {
      scenarioId: input.id,
      seed,
      stepCount: steps.length,
      patchCount: patches.reduce((count, patch) => count + patch.length, 0),
      eventCount: events.length,
      routeCount: routes.length,
      initialHash: hashFixtureValue(initialState),
      finalHash: hashFixtureValue(state),
      replayVerified: false,
      generator: FRONTIER_FIXTURES_GENERATOR
    }
  };
  run.evidence.replayVerified = verifyFixtureScenarioRun(run).ok;
  return run;
}

export function verifyFixtureScenarioRun(run: FixtureScenarioRun): FixtureReplayVerification {
  let state = cloneJson(run.initialState);
  const issues: string[] = [];
  for (let index = 0; index < run.patches.length; index++) {
    try {
      state = applyPatchImmutable(state, run.patches[index]);
    } catch (error) {
      issues[issues.length] = 'step ' + index + ' failed to apply: ' + String(error instanceof Error ? error.message : error);
      break;
    }
  }
  const finalHash = hashFixtureValue(state);
  const expectedHash = hashFixtureValue(run.finalState);
  if (!equalsJson(state, run.finalState)) issues[issues.length] = 'final state mismatch';
  return {
    ok: issues.length === 0,
    finalHash,
    expectedHash,
    steps: run.patches.length,
    issues
  };
}

export function verifyFixturePatchStream(before: JsonValue, patch: Patch, expected: JsonValue): FixtureReplayVerification {
  let state = before;
  const issues: string[] = [];
  try {
    state = applyPatchImmutable(before, patch);
  } catch (error) {
    issues[issues.length] = 'patch failed to apply: ' + String(error instanceof Error ? error.message : error);
  }
  if (!issues.length && !equalsJson(state, expected)) issues[issues.length] = 'final state mismatch';
  return {
    ok: issues.length === 0,
    finalHash: hashFixtureValue(state),
    expectedHash: hashFixtureValue(expected),
    steps: 1,
    issues
  };
}

export function encodeFixtureJsonl(records: readonly FixtureJsonlRecord[]): string {
  return records.map((record) => JSON.stringify(record)).join('\n') + (records.length ? '\n' : '');
}

export function decodeFixtureJsonl(text: string): FixtureJsonlRecord[] {
  const records: FixtureJsonlRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    records[records.length] = JSON.parse(line);
  }
  return records;
}

export function createFixtureEvidenceSummary(run: FixtureScenarioRun): FixtureEvidenceSummary {
  return {
    scenarioId: run.id,
    seed: run.seed,
    stepCount: run.steps.length,
    patchCount: run.patches.reduce((count, patch) => count + patch.length, 0),
    eventCount: run.events.length,
    routeCount: run.routes.length,
    initialHash: hashFixtureValue(run.initialState),
    finalHash: hashFixtureValue(run.finalState),
    replayVerified: verifyFixtureScenarioRun(run).ok,
    generator: run.generator
  };
}

export function normalizeFixturePath(path: FixturePath): JsonPath {
  if (Array.isArray(path)) return path.slice();
  if (path === '') return [];
  if (path.charCodeAt(0) === 47) return parsePointer(path).map((segment) => typeof segment === 'string' ? canonicalPathSegment(segment) : segment);
  return String(path).split('.').filter(Boolean).map((segment) => canonicalPathSegment(segment));
}

export function hashFixtureValue(value: JsonValue | JsonObject | unknown): string {
  const text = stableFixtureStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function stableFixtureStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((item) => stableFixtureStringify(item)).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).sort().map((key) => JSON.stringify(key) + ':' + stableFixtureStringify(object[key])).join(',') + '}';
}

function chooseSchemaType(schema: FixtureJsonSchema, rng: FixtureRng, depth: number, maxDepth: number): FixtureSchemaType {
  const type = Array.isArray(schema.type) ? rng.pick(schema.type) : schema.type;
  if (type) return type;
  if (schema.properties) return 'object';
  if (schema.items) return 'array';
  if (depth >= maxDepth) return rng.pick(['string', 'integer', 'boolean', 'null']);
  return rng.pick(['object', 'array', 'string', 'integer', 'boolean']);
}

function generateObject(schema: FixtureJsonSchema, options: GenerateFixtureValueOptions): JsonObject {
  const out: JsonObject = {};
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);
  for (const [key, propertySchema] of Object.entries(properties)) {
    if (!required.has(key) && options.includeOptional === false) continue;
    out[key] = generateFixtureValue(propertySchema, {
      ...options,
      path: [...normalizeFixturePath(options.path || []), key],
      depth: (options.depth || 0) + 1
    });
  }
  return out;
}

function generateArray(schema: FixtureJsonSchema, options: GenerateFixtureValueOptions): JsonValue[] {
  const rng = options.rng || createFixtureRng(options.seed || 'array');
  const min = Math.max(0, schema.minItems ?? 1);
  const max = Math.max(min, Math.min(schema.maxItems ?? min + 2, min + 5));
  const count = rng.int(min, max);
  const out: JsonValue[] = [];
  for (let i = 0; i < count; i++) {
    const itemSchema = Array.isArray(schema.items)
      ? schema.items[Math.min(i, schema.items.length - 1)] || {}
      : schema.items || {};
    out[out.length] = generateFixtureValue(itemSchema, {
      ...options,
      path: [...normalizeFixturePath(options.path || []), i],
      depth: (options.depth || 0) + 1
    });
  }
  return out;
}

function generateInteger(schema: FixtureJsonSchema, rng: FixtureRng): number {
  const min = Math.ceil(schema.minimum ?? 0);
  const max = Math.floor(schema.maximum ?? Math.max(min, min + 1000));
  const value = rng.int(min, max);
  return schema.multipleOf ? value - (value % schema.multipleOf) : value;
}

function generateNumber(schema: FixtureJsonSchema, rng: FixtureRng): number {
  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? Math.max(min, min + 1000);
  const raw = min + rng.nextFloat() * (max - min);
  const value = Math.round(raw * 1000) / 1000;
  return schema.multipleOf ? value - (value % schema.multipleOf) : value;
}

function generateString(schema: FixtureJsonSchema, path: JsonPath, rng: FixtureRng): string {
  const key = String(path[path.length - 1] || schema.title || 'value').toLowerCase();
  if (schema.format === 'uuid') return '00000000-0000-4000-8000-' + rng.int(0, 0xffffffffffff).toString(16).padStart(12, '0').slice(-12);
  if (schema.format === 'date-time') return new Date(Date.UTC(2026, 0, 1, 0, 0, rng.int(0, 86400))).toISOString();
  if (schema.format === 'date') return '2026-01-' + String(rng.int(1, 28)).padStart(2, '0');
  if (schema.format === 'email') return 'user-' + rng.int(1000, 9999) + '@example.invalid';
  if (key === 'id' || key.endsWith('id')) return slugify(String(path[path.length - 2] || 'entity')) + '_' + rng.int(1000, 9999);
  if (key.includes('name')) return 'Fixture ' + rng.int(100, 999);
  if (key.includes('title')) return 'Fixture title ' + rng.int(100, 999);
  if (key.includes('status')) return rng.pick(['draft', 'active', 'archived']);
  const min = Math.max(1, schema.minLength ?? 3);
  const max = Math.max(min, Math.min(schema.maxLength ?? min + 16, min + 32));
  const suffix = rng.int(10, 9999).toString(36);
  return ('fixture-' + suffix).slice(0, max).padEnd(min, 'x');
}

function defaultEntitySchema(collectionId: string): FixtureJsonSchema {
  return {
    type: 'object',
    required: ['id', 'title', 'status'],
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      status: { enum: ['draft', 'active', 'archived'] },
      ordinal: { type: 'integer', minimum: 0, maximum: 1000 }
    },
    title: collectionId
  };
}

function applyRelations(row: JsonObject, relations: Record<string, FixtureRelationSpec>, entities: Record<string, JsonObject[]>, index: number, rng: FixtureRng): void {
  for (const [field, relation] of Object.entries(relations)) {
    const targetRows = entities[relation.collection] || [];
    if (!targetRows.length) continue;
    const targetField = relation.field ? normalizeFixturePath(relation.field) : ['id'];
    if (relation.mode === 'many') {
      const count = Math.max(0, relation.count ?? Math.min(2, targetRows.length));
      const values: JsonValue[] = [];
      for (let i = 0; i < count; i++) {
        values[values.length] = cloneJson(readAtPath(targetRows[(index + i) % targetRows.length], targetField) as JsonValue);
      }
      writeAtPath(row, normalizeFixturePath(field), values);
    } else {
      const target = targetRows[index % targetRows.length] || rng.pick(targetRows);
      writeAtPath(row, normalizeFixturePath(field), cloneJson(readAtPath(target, targetField) as JsonValue));
    }
  }
}

function applyScenarioStep(state: JsonValue, step: FixtureScenarioStep): JsonValue {
  if (step.kind === 'route' || step.kind === 'action' || step.kind === 'event') return state;
  let next = cloneJson(state);
  if (step.kind === 'set') return writeAtPath(next, normalizeFixturePath(step.path), cloneJson(step.value));
  if (step.kind === 'remove') return removeAtPath(next, normalizeFixturePath(step.path));
  if (step.kind === 'assign') {
    const path = normalizeFixturePath(step.path);
    const current = readAtPath(next, path);
    if (!isJsonObject(current)) throw new TypeError('fixture assign target must be an object: ' + stringifyPointer(path));
    return writeAtPath(next, path, { ...current, ...cloneJson(step.value) });
  }
  if (step.kind === 'append') {
    const path = normalizeFixturePath(step.path);
    const current = readAtPath(next, path);
    if (!Array.isArray(current)) throw new TypeError('fixture append target must be an array: ' + stringifyPointer(path));
    current[current.length] = cloneJson(step.value);
    return next;
  }
  return next;
}

function createStepEvent(
  scenarioId: string,
  step: FixtureScenarioStep,
  context: {
    eventId: string;
    stepId: string;
    index: number;
    route?: string;
    patch: Patch;
    beforeHash: string;
    afterHash: string;
    at: number;
  }
): FixtureEventRecord {
  return {
    kind: 'frontier.fixture.event',
    version: 1,
    id: context.eventId,
    scenarioId,
    stepId: context.stepId,
    stepIndex: context.index,
    actorId: step.actorId,
    type: step.eventType || defaultEventType(step),
    route: context.route,
    action: step.kind === 'action' ? step.action : undefined,
    payload: eventPayload(step),
    patch: context.patch,
    beforeHash: context.beforeHash,
    afterHash: context.afterHash,
    at: context.at
  };
}

function defaultEventType(step: FixtureScenarioStep): string {
  if (step.kind === 'action') return 'fixture.action.' + step.action;
  return 'fixture.' + step.kind;
}

function eventPayload(step: FixtureScenarioStep): JsonValue | undefined {
  if (step.kind === 'event') return step.payload === undefined ? undefined : cloneJson(step.payload);
  if (step.kind === 'action') return step.input === undefined ? undefined : cloneJson(step.input);
  if (step.kind === 'route') return step.state === undefined ? undefined : cloneJson(step.state);
  if (step.kind === 'set' || step.kind === 'append') return cloneJson(step.value);
  if (step.kind === 'assign') return cloneJson(step.value);
  return undefined;
}

function readAtPath(value: JsonValue, path: JsonPath): JsonValue | undefined {
  let node: any = value;
  for (const segment of path) {
    if (node === null || node === undefined) return undefined;
    node = node[segment as any];
  }
  return node;
}

function writeAtPath(root: JsonValue, path: JsonPath, value: JsonValue): JsonValue {
  if (path.length === 0) return value;
  let nextRoot: any = root;
  if (nextRoot === null || typeof nextRoot !== 'object') {
    nextRoot = typeof path[0] === 'number' ? [] : {};
  }
  let node = nextRoot;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    const nextSegment = path[i + 1];
    let child = node[segment as any];
    if (child === null || typeof child !== 'object') {
      child = typeof nextSegment === 'number' ? [] : {};
      node[segment as any] = child;
    }
    node = child;
  }
  node[path[path.length - 1] as any] = value;
  return nextRoot;
}

function removeAtPath(root: JsonValue, path: JsonPath): JsonValue {
  if (path.length === 0) return null;
  const parent = readAtPath(root, path.slice(0, -1));
  if (parent === null || typeof parent !== 'object') return root;
  const key = path[path.length - 1];
  if (Array.isArray(parent) && typeof key === 'number') parent.splice(key, 1);
  else delete (parent as any)[key as any];
  return root;
}

function canonicalPathSegment(segment: string): PathSegment {
  if (segment === '') return segment;
  if (segment.length > 1 && segment.charCodeAt(0) === 48) return segment;
  const number = Number(segment);
  return Number.isSafeInteger(number) && number >= 0 && String(number) === segment ? number : segment;
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function slugify(value: string): string {
  const text = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return text || 'fixture';
}
