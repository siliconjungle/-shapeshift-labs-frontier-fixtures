import {
  compileFixtureScenario,
  createFixturePatchStream,
  createFixtureRng,
  generateFixtureState,
  generateFixtureValue,
  verifyFixtureScenarioRun,
  type FixtureJsonSchema,
  type FixtureScenarioRun,
  type FixtureScenarioStep,
  type FixtureStateRecord
} from '../src/index.ts';

const schema: FixtureJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    count: { type: 'integer' }
  }
};

const rng = createFixtureRng('types');
const value = generateFixtureValue(schema, { rng });
const fixture: FixtureStateRecord = generateFixtureState({
  seed: 'types',
  collections: {
    records: { count: 2, schema }
  }
});

const steps: FixtureScenarioStep[] = [
  { kind: 'set', path: '/records/0/count', value: 2 },
  { kind: 'route', route: '/records/0' }
];

const run: FixtureScenarioRun = compileFixtureScenario({
  id: 'types',
  initialState: fixture.state,
  steps
});

const stream = createFixturePatchStream({
  before: fixture.state,
  after: run.finalState
});
const verification = verifyFixtureScenarioRun(run);

value satisfies unknown;
stream.patch satisfies unknown[];
verification.ok satisfies boolean;
